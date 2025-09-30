<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { FaceMesh } from '@mediapipe/face_mesh/face_mesh';
  import {
    drawConnectors,
    FACEMESH_TESSELATION,
    FACEMESH_RIGHT_EYE,
    FACEMESH_LEFT_EYE,
    FACEMESH_FACE_OVAL,
    FACEMESH_LIPS,
  } from '@mediapipe/drawing_utils/drawing_utils';
  import {
    PoseGuidanceDirection,
    PoseGuidanceType,
    POSE_GUIDANCE_MAP,
    type PoseGuidanceData,
  } from '../../../types/camera';
  import {
    ExpressionAnalyzer,
    type ExpressionData,
  } from '../../../lib/ExpressionAnalyzer';
  import {
    cameraConfig,
    poseTolerances,
    faceQualityThresholds,
    detectionTimingSettings,
    poseCalculationConfig,
    mediaPipeConfig,
  } from '../../../stores/cameraConfig';
  import { getDevicePitchAdjustment } from '../../../domain/cameraConfig';
  import type { CameraConfiguration } from '../../../domain/cameraConfig';
  import { MediaPipeAssetManager } from '../../../lib/MediaPipeAssetManager';

  const dispatch = createEventDispatcher();

  // Props
  export let videoElement: HTMLVideoElement | undefined = undefined;
  export let canvasElement: HTMLCanvasElement | undefined = undefined;
  export let showMesh: boolean = true;
  export let currentMode: string = 'idle';
  // mirrorMode は使用しないため削除

  // Constants
  export const CAPTURE_COUNT: number = 1;
  export let CaptureMode: any;
  export let enableExpressionDetection: boolean | undefined = undefined;

  // MediaPipe instances
  let faceMesh: any;
  let camera: any;
  let canvasCtx: CanvasRenderingContext2D | null = null;

  // Initialization state management
  let isStartingCamera = false;
  let isMediaPipeReady = false;
  let isCameraConfigReady = false;
  let isMediaPipeFullyInitialized = false;
  let hasProcessedFirstFrame = false;
  let initializationStep = 'idle'; // 'idle' | 'config' | 'mediapipe' | 'camera' | 'processing' | 'ready' | 'error'

  // Face detection state
  let faceDetectionCount = 0;
  let faceDetected = false;
  let faceDetectionStartTime: number | null = null;
  let faceLandmarks: any = null;

  // Expression analysis
  let expressionAnalyzer = new ExpressionAnalyzer();
  let currentExpression: ExpressionData | null = null;

  // Video dimensions for accurate coordinate transformation
  let currentVideoWidth = 0;
  let currentVideoHeight = 0;

  // Configuration from API (reactive)
  let config: CameraConfiguration;
  let FACE_DETECTION_THRESHOLD: number;
  let FACE_DETECTION_DELAY: number;
  let THRESHOLDS: { roll: number; pitch: number; yaw: number };
  let MIN_FACE_SIZE: number;
  let MIN_FACE_QUALITY: number;
  let GUIDANCE_UPDATE_INTERVAL: number;

  // Subscribe to camera configuration
  $: config = $cameraConfig.config;
  $: FACE_DETECTION_THRESHOLD =
    config.detectionTimingSettings.stabilityFrameCount;
  $: FACE_DETECTION_DELAY =
    config.detectionTimingSettings.autoCaptureDelaySeconds;
  $: THRESHOLDS = {
    roll: config.poseTolerances.rollDegrees,
    pitch: config.poseTolerances.pitchDegrees,
    yaw: config.poseTolerances.yawDegrees,
  };
  $: MIN_FACE_SIZE = config.faceQualityThresholds.minRelativeSize;
  $: MIN_FACE_QUALITY = config.faceQualityThresholds.minQualityScore;
  $: GUIDANCE_UPDATE_INTERVAL =
    config.detectionTimingSettings.guidanceUpdateIntervalMs;

  // Pose and stability tracking
  let stablePosition = false;
  let stableStartTime: number | null = null;
  let stableFrameCount = 0;
  let progress = 0;

  // Guidance
  let poseGuidanceMessage = '';
  let poseGuidanceType = '';
  let showPoseGuidance = false;
  let lastGuidanceUpdate = 0;
  let lastGuidanceMessage = '';

  // MediaPipeアセットマネージャー
  let assetManager: MediaPipeAssetManager;
  let localBlobUrls: string[] = []; // 作成したBlob URLを管理
  let preloadedUrls: Map<string, string> = new Map(); // 事前準備したURL

  onMount(async () => {
    try {
      initializationStep = 'config';

      // アセットマネージャーを初期化
      assetManager = new MediaPipeAssetManager();
      await assetManager.init();

      // MediaPipeアセットのURLを事前準備
      await prepareMediaPipeAssets();

      // Ensure camera configuration is loaded first
      if (!$cameraConfig.isLoaded) {
        console.log('📊 カメラ設定を読み込み中...');
        await cameraConfig.loadConfig();
        console.log('✅ カメラ設定の読み込み完了');
      }
      isCameraConfigReady = true;

      // Pre-initialize MediaPipe in background (don't wait for user action)
      initializationStep = 'mediapipe';
      console.log('🔧 MediaPipeの事前初期化を開始...');
      await initializeMediaPipe();
      isMediaPipeReady = true;
      initializationStep = 'ready';
      console.log('✅ MediaPipeの事前初期化完了（カメラ起動待機中）');
    } catch (error) {
      initializationStep = 'error';
      console.error('❌ MediaPipeの初期化に失敗しました');
      dispatch('error', {
        message:
          'カメラの初期化に失敗しました。ページをリロードしてお試しください。',
      });
    }
  });

  // Public method to reset detection state
  export function resetDetectionState() {
    // Reset all detection-related variables
    stablePosition = false;
    stableFrameCount = 0;
    lastGuidanceUpdate = 0;
    showPoseGuidance = false;
    poseGuidanceMessage = '';
    poseGuidanceType = '';

    // Reset expression analysis (only if enabled)
    if (enableExpressionDetection === true) {
      expressionAnalyzer.resetCalibration();
    }
    currentExpression = null;
  }

  onDestroy(() => {
    // Blob URLをクリーンアップ
    localBlobUrls.forEach(url => URL.revokeObjectURL(url));
    localBlobUrls = [];
    preloadedUrls.clear();

    completeCleanup();
  });

  // Remove automatic camera starting - now controlled externally

  // Watch for mode changes (debug disabled)
  // $: if (currentMode) { console.log('📱 Mode changed:', currentMode); }

  // MediaPipeアセットのURLを事前準備
  async function prepareMediaPipeAssets() {
    // MediaPipeが実際に読み込むファイルをすべて含める
    const requiredFiles = [
      'face_mesh_solution_packed_assets.data',
      'face_mesh_solution_simd_wasm_bin.wasm',
      'face_mesh_solution_packed_assets_loader.js',
      'face_mesh_solution_simd_wasm_bin.js', // loaderスクリプト
      'face_mesh.binarypb', // モデルデータ
    ];

    console.log('🔧 MediaPipeアセットの事前準備を開始...');

    for (const file of requiredFiles) {
      try {
        // まずローカルキャッシュを確認
        let localUrl = await assetManager.createLocalFileUrl(file);

        if (localUrl) {
          console.log(`🎯 ローカルキャッシュから事前準備: ${file}`);
          preloadedUrls.set(file, localUrl);
          localBlobUrls.push(localUrl);
        } else {
          // キャッシュがない場合、CDNから直接ダウンロードしてBlob URLを作成
          console.log(`📥 CDNからダウンロード中: ${file}`);
          const cdnUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;

          try {
            const response = await fetch(cdnUrl);
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }

            const data = await response.arrayBuffer();
            console.log(
              `✅ ダウンロード完了: ${file} (${Math.round(data.byteLength / 1024)}KB)`
            );

            // Blob URLを作成
            const mimeType = file.endsWith('.wasm')
              ? 'application/wasm'
              : file.endsWith('.js')
                ? 'application/javascript'
                : 'application/octet-stream';
            const blob = new Blob([data], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);

            preloadedUrls.set(file, blobUrl);
            localBlobUrls.push(blobUrl);

            // バックグラウンドでIndexedDBにも保存（次回用）
            assetManager.saveAsset(file, data).catch(err => {
              console.warn(
                `IndexedDBへの保存に失敗（次回はCDNから再取得します）: ${file}`,
                err
              );
            });
          } catch (downloadError) {
            console.error(
              `❌ CDNからのダウンロードに失敗: ${file}`,
              downloadError
            );
            // 最後の手段としてCDN URLを直接使用（MediaPipeに任せる）
            console.warn(
              `⚠️ フォールバック: MediaPipeに直接CDNから読み込ませます`
            );
            preloadedUrls.set(file, cdnUrl);
          }
        }
      } catch (error) {
        console.error(`アセット準備エラー: ${file}`, error);
        // エラー時はCDN URLをフォールバック
        preloadedUrls.set(
          file,
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        );
      }
    }

    console.log('✅ MediaPipeアセットの事前準備完了');
  }

  async function initializeMediaPipe() {
    try {
      faceMesh = new FaceMesh({
        locateFile: (file: string) => {
          // 事前準備したURLを同期的に返す
          const url =
            preloadedUrls.get(file) ||
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          console.log(
            `📁 MediaPipeファイル提供: ${file} -> ${url.substring(0, 50)}...`
          );
          return url;
        },
      });

      // Use settings from API configuration
      const mediaPipeSettings = config.mediaPipeConfig;
      faceMesh.setOptions({
        maxNumFaces: mediaPipeSettings.maxDetectedFaces,
        refineLandmarks: mediaPipeSettings.enableRefinedLandmarks,
        minDetectionConfidence: mediaPipeSettings.minDetectionConfidence,
        minTrackingConfidence: mediaPipeSettings.minTrackingConfidence,
        selfieMode: mediaPipeSettings.selfieMode,
        staticImageMode: mediaPipeSettings.staticImageMode,
      });

      faceMesh.onResults(onResults);
      console.log('✅ FaceMesh設定完了、onResultsコールバック登録完了');
    } catch (error) {
      console.error('❌ MediaPipe初期化エラー:', error);
      throw error;
    }
  }

  // キャンバス同期機能は削除

  async function startCamera() {
    // Check initialization readiness
    if (
      !isMediaPipeReady ||
      !isCameraConfigReady ||
      initializationStep !== 'ready'
    ) {
      console.log('⏳ カメラの準備がまだ完了していません');
      return;
    }

    if (!videoElement || !faceMesh) {
      console.log('❌ 必要なコンポーネントが見つかりません');
      return;
    }

    if (isStartingCamera) {
      console.log('⏳ カメラ起動処理が既に実行中です');
      return;
    }

    initializationStep = 'camera';
    isStartingCamera = true;
    console.log('📷 カメラ起動を開始します');
    try {
      // MediaPipe Camera utilsを使わずに独自でカメラを制御
      // スマホ向けに縦向きのカメラストリームを取得
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;

      let constraints: MediaStreamConstraints | undefined;
      let finalStream: MediaStream;

      // スマホ縦向きの場合、複数の解像度を試す
      if (isMobile && isPortrait) {
        // 利用可能な全解像度を取得して縦向きを探す
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(
            device => device.kind === 'videoinput'
          );
          console.log('📱 Available video devices:', videoDevices.length);

          // まずは制約なしでカメラ能力を確認
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
          });
          const testTrack = testStream.getVideoTracks()[0];
          const capabilities = testTrack.getCapabilities();
          testStream.getTracks().forEach(track => track.stop());

          console.log('📷 Camera capabilities:', capabilities);

          // 利用可能な解像度から縦向きを優先的に選択
          const availableResolutions = [];
          if (capabilities.width && capabilities.height) {
            const maxWidth = capabilities.width.max || 1920;
            const maxHeight = capabilities.height.max || 1080;
            console.log(`📏 Max resolution: ${maxWidth}x${maxHeight}`);

            // 縦向き解像度のパターンを生成
            if (maxHeight >= maxWidth) {
              // すでに縦長の場合
              availableResolutions.push({ width: maxWidth, height: maxHeight });
            } else {
              // 横長の場合、縦横を入れ替えて縦向きにする
              availableResolutions.push({ width: maxHeight, height: maxWidth });
              availableResolutions.push({ width: maxWidth, height: maxHeight });
            }
          }
        } catch (e) {
          console.log('❌ Failed to get capabilities:', e);
        }

        // 画面サイズから動的にresolutionPatternsを計算
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const screenAspectRatio = screenWidth / screenHeight;

        console.log('📱 Screen info for resolution calculation:', {
          screenWidth,
          screenHeight,
          screenAspectRatio: screenAspectRatio.toFixed(3),
        });

        // スマホカメラに適した解像度パターンを生成（縦長でも横長解像度を使用）
        const resolutionPatterns = [
          // 高解像度（正方形に近い）
          { width: 1080, height: 1080, aspectRatio: 1.0 },
          { width: 960, height: 1280, aspectRatio: 0.75 }, // 3:4
          { width: 720, height: 960, aspectRatio: 0.75 }, // 3:4
          // 4:3（カメラの標準）
          { width: 960, height: 720, aspectRatio: 4 / 3 },
          { width: 640, height: 480, aspectRatio: 4 / 3 },
          // フォールバック用
          { width: 480, height: 640, aspectRatio: 0.75 },
          { width: 360, height: 480, aspectRatio: 0.75 },
        ];

        console.log('📱 Generated resolution patterns:', resolutionPatterns);

        let stream = null;
        let successfulPattern = null;

        for (const pattern of resolutionPatterns) {
          try {
            constraints = {
              video: {
                facingMode: 'user',
                width: { ideal: pattern.width },
                height: { ideal: pattern.height },
                aspectRatio: { ideal: pattern.aspectRatio },
                // exactやmin/maxを削除して制約を緩和
              },
              audio: false,
            };

            console.log(
              `📱 Trying resolution: ${pattern.width}x${pattern.height}`
            );
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            successfulPattern = pattern;
            console.log(
              `✅ Successfully got stream with: ${pattern.width}x${pattern.height}`
            );
            break;
          } catch (e) {
            console.log(
              `❌ Failed with ${pattern.width}x${pattern.height}:`,
              (e as Error).message
            );
          }
        }

        if (!stream) {
          // 特定のデバイスIDを指定して試す
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(
            device => device.kind === 'videoinput'
          );
          console.log(
            '📱 Trying specific camera devices:',
            videoDevices.length
          );

          for (const device of videoDevices) {
            console.log(`📷 Trying device: ${device.label || device.deviceId}`);
            for (const pattern of resolutionPatterns) {
              try {
                constraints = {
                  video: {
                    deviceId: { exact: device.deviceId },
                    width: { ideal: pattern.width },
                    height: { ideal: pattern.height },
                    aspectRatio: { ideal: pattern.aspectRatio },
                  },
                  audio: false,
                };

                stream = await navigator.mediaDevices.getUserMedia(constraints);
                successfulPattern = pattern;
                console.log(
                  `✅ Success with device ${device.label} at ${pattern.width}x${pattern.height}`
                );
                break;
              } catch (e) {
                // 次のパターンを試す
              }
            }
            if (stream) break;
          }
        }

        if (!stream) {
          // 最後の手段：段階的に制約を緩和
          console.log(
            '📱 すべての解像度で失敗しました。制約を緩和してリトライします'
          );

          const fallbackPatterns = [
            // 段階1: フロントカメラのみ指定
            { video: { facingMode: 'user' }, audio: false },
            // 段階2: 任意のカメラ
            { video: true, audio: false },
            // 段階3: 最小制約
            { video: {}, audio: false },
          ];

          for (const fallback of fallbackPatterns) {
            try {
              console.log('📱 フォールバック制約でリトライ中...');
              stream = await navigator.mediaDevices.getUserMedia(fallback);
              console.log('✅ フォールバック制約で成功');
              break;
            } catch (e) {
              console.log('❌ フォールバック制約も失敗');
              continue;
            }
          }

          if (!stream) {
            throw new Error('すべてのカメラ制約で失敗しました');
          }
        }

        finalStream = stream;
      } else if (isMobile && !isPortrait) {
        // スマホ横向きの場合
        try {
          constraints = {
            video: {
              facingMode: 'user',
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              aspectRatio: { ideal: 1.777 }, // 16:9 = 1.777
            },
            audio: false,
          };
          finalStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          console.log(
            '📱 横向きの制約が失敗しました。フォールバックを実行します'
          );
          // フォールバック: より緩い制約
          finalStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
        }
      } else {
        // PCの場合
        try {
          constraints = {
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: { ideal: 1.777 },
            },
            audio: false,
          };
          finalStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          console.log('💻 PCの制約が失敗しました。フォールバックを実行します');
          // フォールバック: より緩い制約
          finalStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      console.log(
        '📱 Final constraints used:',
        typeof constraints !== 'undefined' ? constraints : 'No constraints set'
      );

      const stream = finalStream;

      // ストリームの実際の設定を確認
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log('📷 Actual camera settings:', {
        width: settings.width,
        height: settings.height,
        aspectRatio: settings.aspectRatio,
        facingMode: settings.facingMode,
      });

      videoElement.srcObject = stream;
      await videoElement.play();

      // ビデオの実際のサイズを確認
      console.log('📺 Video element dimensions:', {
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        clientWidth: videoElement.clientWidth,
        clientHeight: videoElement.clientHeight,
      });

      // MediaPipeにフレームを送る処理を独自に実装
      let animationId: number;
      let frameCount = 0;
      const sendFrame = async () => {
        if (faceMesh && videoElement && videoElement.readyState >= 2) {
          try {
            await faceMesh.send({ image: videoElement });
            frameCount++;
            // 最初のフレーム送信をログ
            if (frameCount === 1) {
              console.log('✅ 最初のフレームをMediaPipeに送信成功');
            }
          } catch (error) {
            console.error('❌ MediaPipeフレーム送信エラー:', error);
            console.error('エラー詳細:', {
              faceMesh: !!faceMesh,
              videoElement: !!videoElement,
              readyState: videoElement?.readyState,
              error: error,
            });
          }
        }
        animationId = requestAnimationFrame(sendFrame);
      };

      // フレーム送信を開始
      console.log('🎬 フレーム送信ループを開始します');
      sendFrame();

      // カメラ停止時にアニメーションをクリーンアップするために保存
      camera = {
        stop: () => {
          if (animationId) {
            cancelAnimationFrame(animationId);
          }
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        },
      };

      // Wait for video to be ready
      if (videoElement.readyState < 2) {
        await new Promise(resolve => {
          const checkReady = () => {
            if (videoElement.readyState >= 2) {
              resolve(true);
            } else {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        });
      }

      // Reset detection state when camera starts
      faceDetected = false;
      faceDetectionCount = 0;
      faceDetectionStartTime = null;
      stablePosition = false;
      stableStartTime = null;
      progress = 0;

      initializationStep = 'processing';
      console.log('📷 カメラストリームの取得が完了しました');
      console.log('🔄 MediaPipeの完全初期化を待機中...');

      // Don't dispatch cameraStarted yet - wait for MediaPipe to be fully ready
      // dispatch('cameraStarted'); // Moved to onResults after first frame processing
    } catch (error) {
      initializationStep = 'error';
      console.error('❌ カメラ起動に失敗しました');
      dispatch('error', {
        message:
          'カメラの起動に失敗しました。しばらく待ってからリトライします。',
      });
    } finally {
      isStartingCamera = false;
    }
  }

  function onResults(results: any) {
    // 最初の呼び出しをログ
    if (!hasProcessedFirstFrame) {
      console.log('🎯 onResults が初めて呼ばれました');
    }

    if (!canvasCtx && canvasElement) {
      canvasCtx = canvasElement.getContext('2d')!;
    }

    if (!canvasCtx || !canvasElement) {
      console.warn('⚠️ canvasCtx または canvasElement が準備できていません');
      return;
    }

    // Check if this is the first successful frame processing
    if (!hasProcessedFirstFrame && !isMediaPipeFullyInitialized) {
      hasProcessedFirstFrame = true;
      isMediaPipeFullyInitialized = true;
      initializationStep = 'ready';
      console.log('✅ MediaPipeの初期化が完全に完了しました');
      console.log('🎉 カメラが使用可能になりました');
      dispatch('cameraStarted');
    }

    // ビデオの実際のサイズを取得
    const videoWidth =
      results.image.width ||
      results.image.videoWidth ||
      videoElement?.videoWidth ||
      720;
    const videoHeight =
      results.image.height ||
      results.image.videoHeight ||
      videoElement?.videoHeight ||
      1280;

    // キャンバスサイズをビデオのサイズに完全に一致させる
    if (
      canvasElement.width !== videoWidth ||
      canvasElement.height !== videoHeight
    ) {
      canvasElement.width = videoWidth;
      canvasElement.height = videoHeight;
      console.log('📐 Canvas resized to match video:', {
        width: videoWidth,
        height: videoHeight,
      });
    }

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Save current video dimensions for coordinate transformation
    currentVideoWidth = videoWidth;
    currentVideoHeight = videoHeight;

    // ビデオをそのままのサイズで描画（スケーリングなし）
    canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

    // Debug: Log drawing dimensions (only occasionally to avoid spam)
    if (Math.random() < 0.01) {
      // 1% chance to log
    }

    const hasFace =
      results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
    // MediaPipe結果のログは削除（必要時のみ有効化）
    // console.log('📸 MediaPipe results:', { hasFace, faceCount: results.multiFaceLandmarks?.length || 0 });

    if (hasFace) {
      const landmarks = results.multiFaceLandmarks[0];
      faceLandmarks = landmarks;

      // Calculate pose
      const pose = calculatePose(landmarks);
      // 姿勢計算のログは削除（必要時のみ有効化）
      // console.log('📐 Calculated pose:', pose);

      // Analyze expression (only if enabled)
      if (enableExpressionDetection === true) {
        currentExpression = expressionAnalyzer.analyzeExpression(landmarks);
      } else {
        currentExpression = null;
      }

      updateStability(pose);

      if (showMesh) {
        drawFaceMesh(landmarks);
      }

      // Face detection stability
      faceDetectionCount++;

      if (!faceDetected && faceDetectionCount >= FACE_DETECTION_THRESHOLD) {
        faceDetected = true;

        if (currentMode !== CaptureMode?.CAMERA_STARTUP) {
          faceDetectionStartTime = performance.now();

          // デザインにないためメッセージ送信しない
        }
      }

      // Check auto capture (exclude preview modes)
      if (
        currentMode !== CaptureMode?.CAMERA_STARTUP &&
        currentMode !== CaptureMode?.PREVIEW_BEFORE &&
        currentMode !== CaptureMode?.PREVIEW_AFTER
      ) {
        checkAutoCapture();
      }

      // 統合ガイダンス判定（姿勢優先、表情は姿勢OKの場合のみ）
      const guidanceInfo = determineGuidance(
        pose,
        currentExpression,
        landmarks
      );

      dispatch('faceDetected', {
        landmarks,
        pose,
        expression: currentExpression, // 表情データを追加
        stable: stablePosition,
        progress,
        guidance: guidanceInfo,
      });
    } else {
      // No face detected
      // console.log('❌ No face detected'); // ログ削除
      handleNoFaceDetected();
    }

    drawUIOverlays();
    canvasCtx.restore();
  }

  function drawFaceMesh(landmarks: any) {
    if (!canvasCtx) return;

    drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
      color: '#C0C0C070',
      lineWidth: 1,
    });
    drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {
      color: '#FF3030',
    });
    drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {
      color: '#30FF30',
    });
    drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {
      color: '#E0E0E0',
    });
    drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {
      color: '#E0E0E0',
    });
  }

  function handleNoFaceDetected() {
    faceDetectionCount = 0;

    if (faceDetected) {
      faceDetected = false;
      faceDetectionStartTime = null;
    }

    stablePosition = false;
    stableStartTime = null;
    progress = 0;

    // Clear pose guidance in CAMERA_STARTUP mode
    if (currentMode === CaptureMode?.CAMERA_STARTUP) {
      showPoseGuidance = false;
      poseGuidanceMessage = '';
    }

    // デザインにないためステータスメッセージは送信しない

    dispatch('faceDetected', {
      landmarks: null,
      pose: null,
      stable: false,
      progress: 0,
    });

    showPoseGuidance = false;
    lastGuidanceMessage = '';
  }

  function calculateFaceSize(landmarks: any): number {
    try {
      // 顔の境界を計算
      let minX = 1,
        maxX = 0,
        minY = 1,
        maxY = 0;

      // 顔の輪郭ポイントを使用して境界を計算
      const faceContourIndices = [
        10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 19, 94, 125, 142, 36, 205,
        206, 207, 213, 192, 147, 187, 207, 206, 205, 36, 142, 125, 94, 19, 1, 4,
        5, 195, 197, 6, 168, 8, 9, 151, 10,
      ];

      for (const index of faceContourIndices) {
        if (landmarks[index]) {
          minX = Math.min(minX, landmarks[index].x);
          maxX = Math.max(maxX, landmarks[index].x);
          minY = Math.min(minY, landmarks[index].y);
          maxY = Math.max(maxY, landmarks[index].y);
        }
      }

      // 顔のサイズを計算（画像に対する相対サイズ）
      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;
      const faceSize = Math.sqrt(
        faceWidth * faceWidth + faceHeight * faceHeight
      );

      return faceSize;
    } catch (error) {
      return 0;
    }
  }

  function calculatePose(landmarks: any) {
    // PHP版と完全に同じ姿勢計算ロジック
    try {
      // 特徴点の取得（PHPと同じインデックス）
      const nose = landmarks[1];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const leftMouth = landmarks[61];
      const rightMouth = landmarks[291];

      if (!nose || !leftEye || !rightEye || !leftMouth || !rightMouth) {
        throw new Error('Required landmarks not found');
      }

      // ロール（Z軸回転）- 目の傾き - ミラーリング対応
      const eyeDiffY = rightEye.y - leftEye.y;
      const eyeDiffX = rightEye.x - leftEye.x;
      const roll = (-Math.atan2(eyeDiffY, eyeDiffX) * 180) / Math.PI;

      // ピッチ（X軸回転）- 縦方向の傾き - 修正版
      const eyeCenter = {
        y: (leftEye.y + rightEye.y) / 2,
        z: (leftEye.z + rightEye.z) / 2,
      };

      // 鼻と目の中心の位置関係
      const eyeNoseY = eyeCenter.y - nose.y;
      const eyeNoseZ = eyeCenter.z - nose.z;

      // 角度計算 - 符号と引数を調整
      let rawPitch = (-Math.atan2(eyeNoseZ, eyeNoseY) * 180) / Math.PI;

      // 180度問題の解決
      if (rawPitch > 90) {
        rawPitch = rawPitch - 180;
      } else if (rawPitch < -90) {
        rawPitch = rawPitch + 180;
      }

      // 最終的なピッチ値（デバイス別オフセット - API設定使用）
      const pitchCalibration = config.poseCalculationConfig.pitchCalibration;
      const deviceAdjustment = getDevicePitchAdjustment(pitchCalibration);
      const pitch =
        rawPitch + pitchCalibration.baseOffsetDegrees + deviceAdjustment;

      // ヨー（Y軸回転）- 横方向の向き（API設定使用）
      const eyeMidPoint = {
        x: (leftEye.x + rightEye.x) / 2,
      };
      const noseMidOffset = eyeMidPoint.x - nose.x;
      const yaw = noseMidOffset * config.poseCalculationConfig.yawSensitivity;

      // 顔のサイズを計算
      const faceSize = calculateFaceSize(landmarks);

      // 距離と品質の計算（API設定使用）
      const qualityConfig = config.poseCalculationConfig.qualityCalculation;
      const eyeDistance = Math.sqrt(eyeDiffX * eyeDiffX + eyeDiffY * eyeDiffY);
      const distance = Math.max(
        qualityConfig.distanceRange.min,
        Math.min(qualityConfig.distanceRange.max, 1.0 / eyeDistance)
      );
      const quality = Math.max(
        0.0,
        Math.min(1.0, faceSize * qualityConfig.faceSizeMultiplier)
      );

      const result = {
        roll: Math.round(roll * 10) / 10,
        pitch: Math.round(pitch * 10) / 10,
        yaw: Math.round(yaw * 10) / 10,
        distance: Math.round(distance * 100) / 100,
        quality: Math.round(quality * 100) / 100,
        faceSize: Math.round(faceSize * 1000) / 1000,
      };

      return result;
    } catch (error) {
      return {
        roll: 0,
        pitch: 0,
        yaw: 0,
        distance: 1.0,
        quality: 0.0,
        faceSize: 0.0,
      };
    }
  }

  function updateStability(pose: any) {
    const now = performance.now();

    // PHP版と同じ厳しい条件
    const isGoodPose =
      Math.abs(pose.roll) < THRESHOLDS.roll &&
      Math.abs(pose.pitch) < THRESHOLDS.pitch &&
      Math.abs(pose.yaw) < THRESHOLDS.yaw &&
      pose.quality >= MIN_FACE_QUALITY &&
      pose.faceSize >= MIN_FACE_SIZE;

    // 表情チェック - 表情に問題がある場合は安定状態にしない
    const isGoodExpression =
      enableExpressionDetection === true
        ? currentExpression
          ? expressionAnalyzer.isExpressionAcceptable(currentExpression)
          : true
        : true; // Expression detection disabled, assume OK

    // 姿勢と表情の両方が良好な場合のみ安定状態とする
    const isStable = isGoodPose && isGoodExpression;

    // 姿勢安定性チェックのログは削除（必要時のみ有効化）
    // console.log('🎯 Pose stability check:', { roll: pose.roll.toFixed(1), pitch: pose.pitch.toFixed(1), yaw: pose.yaw.toFixed(1), isGoodPose, isGoodExpression, isStable, progress: progress.toFixed(1) });

    if (isStable) {
      if (!stablePosition) {
        stablePosition = true;
        stableStartTime = now;
        showPoseGuidance = true;
        poseGuidanceMessage = '良い姿勢です！保持してください';
        poseGuidanceType = 'success';

        // 成功メッセージは2秒後に非表示にする
        setTimeout(() => {
          if (stablePosition) {
            showPoseGuidance = false;
          }
        }, 2000);
      }

      if (stableStartTime) {
        const elapsed = (now - stableStartTime) / 1000;
        // プログレスバーを姿勢安定後の自動撮影待機時間（FACE_DETECTION_DELAY）に合わせる
        progress = Math.min((elapsed / FACE_DETECTION_DELAY) * 100, 100);

        if (progress >= 100) {
        }
      }
    } else {
      // 姿勢または表情に問題がある場合はリセット
      if (stablePosition) {
      }
      stablePosition = false;
      stableStartTime = null;
      progress = 0;

      // Guidance messages - 姿勢のガイダンスのみ更新（表情は統合ガイダンスで処理）
      if (now - lastGuidanceUpdate > GUIDANCE_UPDATE_INTERVAL && !isGoodPose) {
        updatePoseGuidance(pose);
        lastGuidanceUpdate = now;
      }
    }
  }

  // 姿勢に基づいてガイダンスデータを取得（Enumベース）
  function getPoseGuidanceData(pose: any): PoseGuidanceData | null {
    if (!pose) return null;

    // 優先順位に従って判定（PHP版と同じ順番）
    if (pose.faceSize < MIN_FACE_SIZE) {
      return POSE_GUIDANCE_MAP.tooFar;
    } else if (pose.quality < MIN_FACE_QUALITY) {
      return POSE_GUIDANCE_MAP.lowQuality;
    } else if (Math.abs(pose.roll) >= THRESHOLDS.roll) {
      return pose.roll > 0
        ? POSE_GUIDANCE_MAP.rollPositive
        : POSE_GUIDANCE_MAP.rollNegative;
    } else if (Math.abs(pose.pitch) >= THRESHOLDS.pitch) {
      return pose.pitch > 0
        ? POSE_GUIDANCE_MAP.pitchPositive
        : POSE_GUIDANCE_MAP.pitchNegative;
    } else if (Math.abs(pose.yaw) >= THRESHOLDS.yaw) {
      return pose.yaw > 0
        ? POSE_GUIDANCE_MAP.yawPositive
        : POSE_GUIDANCE_MAP.yawNegative;
    } else {
      return POSE_GUIDANCE_MAP.perfect;
    }
  }

  function getGuidanceDirection(pose: any): PoseGuidanceDirection | null {
    const guidanceData = getPoseGuidanceData(pose);
    return guidanceData?.direction || null;
  }

  // PHPと同じ鼻の位置計算（完全移植版）
  function getNosePosition(landmarks: any) {
    if (
      !landmarks ||
      !canvasElement ||
      currentVideoWidth === 0 ||
      currentVideoHeight === 0
    ) {
      // Debug: Log why getNosePosition is returning null
      if (Math.random() < 0.1) {
        // 10% chance to avoid spam
      }
      return null;
    }

    // 鼻の先端のランドマーク（インデックス1）
    const nose = landmarks[1];
    if (!nose) return null;

    // onResults関数と同じアスペクト比計算を使用
    const videoWidth = currentVideoWidth;
    const videoHeight = currentVideoHeight;
    const canvasWidth = canvasElement.width;
    const canvasHeight = canvasElement.height;

    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (videoAspect > canvasAspect) {
      // Video is wider - fit to canvas height
      drawHeight = canvasHeight;
      drawWidth = drawHeight * videoAspect;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      // Video is taller - fit to canvas width
      drawWidth = canvasWidth;
      drawHeight = drawWidth / videoAspect;
      drawX = 0;
      drawY = (canvasHeight - drawHeight) / 2;
    }

    // 実際の描画領域内での座標計算
    const noseX = (1 - nose.x) * drawWidth + drawX;
    const noseY = nose.y * drawHeight + drawY;

    // 表示サイズに合わせてスケーリング
    const canvasRect = canvasElement.getBoundingClientRect();
    const scaleX = canvasRect.width / canvasElement.width;
    const scaleY = canvasRect.height / canvasElement.height;

    const displayX = noseX * scaleX;
    const displayY = noseY * scaleY;

    // Debug: Log successful nose position calculation
    if (Math.random() < 0.05) {
      // 5% chance to avoid spam
    }

    return { x: displayX, y: displayY };
  }

  function updatePoseGuidance(pose: any) {
    // Don't show pose guidance in CAMERA_STARTUP mode
    if (currentMode === CaptureMode?.CAMERA_STARTUP) {
      return;
    }

    // ガイダンスデータを取得（Enumベース）
    const guidanceData = getPoseGuidanceData(pose);

    if (!guidanceData) return;

    const { message, type } = guidanceData;

    if (message) {
      poseGuidanceMessage = message;
      poseGuidanceType = type;
      showPoseGuidance = true;
      lastGuidanceMessage = message;

      // 姿勢が悪い間は継続的に表示（同じメッセージでも継続表示）
    }
  }

  // PHPと同じピノキオ棒（ピンク軸）描画機能
  function drawPoseAxes(landmarks: any) {
    if (!canvasCtx || !canvasElement) return;

    // 現在の姿勢を計算
    const pose = calculatePose(landmarks);

    // 鏡像表示に対応するための変換
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);

    const nose = landmarks[1];
    const scale = 0.2; // 軸の長さ

    // 座標軸の描画（鼻から伸びるピンク軸）
    // ミラーリング時の座標に変換
    const noseX = (1 - nose.x) * canvasElement.width;
    const noseY = nose.y * canvasElement.height;

    // Z軸（ピンク）- ヨー（顔の向き）に応じて方向が変わる
    const zAxisX =
      noseX +
      Math.sin((pose.yaw * Math.PI) / 180) * scale * canvasElement.width;

    // 円柱の描画（Z軸）
    const cylinderWidth = 12; // 円柱の幅

    // グラデーションで円柱効果を作成
    const gradient = canvasCtx.createLinearGradient(
      noseX,
      noseY,
      zAxisX,
      noseY
    );
    gradient.addColorStop(0, '#E05179'); // ピンク色（始点）
    gradient.addColorStop(1, 'rgba(224, 81, 121, 0.8)'); // 明るいピンク色（終点）

    // 円柱の本体を描画
    canvasCtx.beginPath();
    canvasCtx.moveTo(noseX, noseY - cylinderWidth / 2);
    canvasCtx.lineTo(zAxisX, noseY - cylinderWidth / 2);
    canvasCtx.lineTo(zAxisX, noseY + cylinderWidth / 2);
    canvasCtx.lineTo(noseX, noseY + cylinderWidth / 2);
    canvasCtx.closePath();
    canvasCtx.fillStyle = gradient;
    canvasCtx.fill();

    // 終点の円を描画
    canvasCtx.beginPath();
    canvasCtx.arc(zAxisX, noseY, cylinderWidth / 2, 0, Math.PI * 2);
    canvasCtx.fillStyle = 'rgba(224, 81, 121, 0.8)';
    canvasCtx.fill();

    // 始点の円を描画
    canvasCtx.beginPath();
    canvasCtx.arc(noseX, noseY, cylinderWidth / 2, 0, Math.PI * 2);
    canvasCtx.fillStyle = '#E05179';
    canvasCtx.fill();
  }

  function checkAutoCapture() {
    if (!faceDetected || !stableStartTime) return;

    // 姿勢が安定してからの経過時間を計算
    const elapsed = (performance.now() - stableStartTime) / 1000;

    // 表情チェック - 表情に問題がある場合は撮影しない
    const expressionOk =
      enableExpressionDetection === true
        ? currentExpression
          ? expressionAnalyzer.isExpressionAcceptable(currentExpression)
          : true
        : true; // Expression detection disabled, assume OK

    // 姿勢が安定してから3秒経過 + 表情も良好な場合に撮影
    if (
      elapsed >= FACE_DETECTION_DELAY &&
      stablePosition &&
      progress >= 100 &&
      expressionOk
    ) {
      dispatch('autoCapture', { landmarks: faceLandmarks });

      // Reset detection to prevent multiple captures
      faceDetectionStartTime = null;
      faceDetected = false;
      stablePosition = false;
      stableStartTime = null;
      progress = 0;
    }
  }

  function drawUIOverlays() {
    if (!canvasCtx || !canvasElement) return;

    // Save the current transformation matrix
    canvasCtx.save();

    // プログレスバーのみ描画（白い円はCSSで表示）
    if (
      currentMode !== CaptureMode?.CAMERA_STARTUP &&
      faceDetected &&
      stablePosition &&
      progress > 0
    ) {
      const centerX = canvasElement.width / 2;
      const centerY = canvasElement.height / 2;
      // CSS のマスク円と同じサイズに合わせる（レスポンシブ対応）
      const circleSize = Math.min(300, window.innerWidth * 0.5);
      const radius = circleSize / 2 - 10; // マスク円の内側にプログレスバーを描画

      const progressAngle = (progress / 100) * 2 * Math.PI - Math.PI / 2;

      canvasCtx.beginPath();
      canvasCtx.arc(centerX, centerY, radius, -Math.PI / 2, progressAngle);
      canvasCtx.strokeStyle = '#00BEB9';
      canvasCtx.lineWidth = 47;
      canvasCtx.stroke();
    }

    // ピノキオ棒（ピンク軸）の描画 - PHPと同じ実装
    if (faceLandmarks && faceDetected) {
      drawPoseAxes(faceLandmarks);
    }

    // Restore the transformation matrix
    canvasCtx.restore();
  }

  function cleanup() {
    // Stop camera but don't destroy faceMesh (for reuse)
    if (camera) {
      camera.stop();
      camera = null;
    }

    // Stop video stream
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
      });
      videoElement.srcObject = null;
    }

    // Reset detection state
    faceDetected = false;
    faceDetectionCount = 0;
    faceDetectionStartTime = null;
    stablePosition = false;
    stableStartTime = null;
    progress = 0;
    isStartingCamera = false;
  }

  // Complete cleanup function for component destruction
  function completeCleanup() {
    cleanup();

    if (faceMesh) {
      faceMesh.close();
      faceMesh = null;
    }
  }

  // Export cleanup functions for external use
  export { cleanup, completeCleanup };

  // Export function to get current face landmarks
  export function getCurrentFaceLandmarks() {
    return faceLandmarks;
  }

  // Export startCamera function for external use
  export { startCamera };

  // キャンバス同期機能は削除

  // Export guidance state
  export { showPoseGuidance, poseGuidanceMessage, poseGuidanceType };

  // 姿勢と表情を統合したガイダンス判定
  function determineGuidance(
    pose: any,
    expression: ExpressionData | null,
    landmarks: any[]
  ) {
    // 1. まず姿勢をチェック（既存ロジック）
    const poseGuidance = getPoseGuidanceData(pose);

    // 姿勢に問題がある場合は姿勢ガイダンスを優先
    if (poseGuidance?.type !== PoseGuidanceType.SUCCESS) {
      return {
        show: showPoseGuidance,
        message: poseGuidanceMessage,
        type: poseGuidanceType,
        direction: getGuidanceDirection(pose),
        nosePosition: getNosePosition(landmarks),
        source: 'pose',
      };
    }

    // 2. 姿勢OKの場合、表情をチェック（表情検知が有効な場合のみ）
    if (enableExpressionDetection === true && expression) {
      const expressionGuidance = getExpressionGuidanceData(expression);
      if (expressionGuidance) {
        return {
          show: true,
          message: expressionGuidance.message,
          type: expressionGuidance.type,
          direction: expressionGuidance.direction,
          nosePosition: getNosePosition(landmarks),
          source: 'expression',
        };
      }
    }

    // すべてOKの場合
    return {
      show: true,
      message: POSE_GUIDANCE_MAP.perfect.message,
      type: POSE_GUIDANCE_MAP.perfect.type,
      direction: null,
      nosePosition: getNosePosition(landmarks),
      source: 'success',
    };
  }

  // 表情問題の優先順位付きチェック
  function getExpressionGuidanceData(
    expression: ExpressionData
  ): PoseGuidanceData | null {
    if (!expression.isCalibrated) {
      return POSE_GUIDANCE_MAP.expressionCalibrating;
    }

    // ExpressionAnalyzerの設定値を使用して一貫性を保つ
    const settings = expressionAnalyzer.getSettings();

    // 優先順位：笑顔 > 眉 > 目の力み
    // ExpressionAnalyzerと同じ条件を使用（>= から < への否定で一致させる）
    if (expression.mouthSmile >= settings.smileThreshold) {
      return POSE_GUIDANCE_MAP.smileTooMuch;
    }
    if (expression.eyebrowRaise >= settings.eyebrowThreshold) {
      return POSE_GUIDANCE_MAP.eyebrowRaised;
    }
    if (expression.eyeTension >= settings.eyeTensionThreshold) {
      return POSE_GUIDANCE_MAP.eyeTension;
    }

    return null; // 表情に問題なし
  }
</script>

<!-- This component doesn't render anything directly -->
<!-- It only handles face detection logic and dispatches events -->
