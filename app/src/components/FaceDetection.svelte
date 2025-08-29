<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { FaceMesh } from '@mediapipe/face_mesh/face_mesh';
  import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils/camera_utils';
  import {
    drawConnectors,
    FACEMESH_TESSELATION,
    FACEMESH_RIGHT_EYE,
    FACEMESH_LEFT_EYE,
    FACEMESH_FACE_OVAL,
    FACEMESH_LIPS,
  } from '@mediapipe/drawing_utils/drawing_utils';

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

  // MediaPipe instances
  let faceMesh: any;
  let camera: any;
  let canvasCtx: CanvasRenderingContext2D | null = null;
  let isStartingCamera = false;

  // Face detection state
  let faceDetectionCount = 0;
  let faceDetected = false;
  let faceDetectionStartTime: number | null = null;
  let faceLandmarks: any = null;

  // Video dimensions for accurate coordinate transformation
  let currentVideoWidth = 0;
  let currentVideoHeight = 0;

  // Constants - PHP版と同じ厳しい設定
  const FACE_DETECTION_THRESHOLD = 5; // Increased from 3 to 5
  const FACE_DETECTION_DELAY = 3.0; // 姿勢安定後の自動撮影までの待機時間を3秒に設定
  // const STABILITY_TIME = 1.5; // 不要になったため削除（FACE_DETECTION_DELAYを使用）
  const THRESHOLDS = {
    roll: 10.0, // Reduced from 15.0 to 10.0 degrees
    pitch: 10.0, // Reduced from 15.0 to 10.0 degrees
    yaw: 10.0, // Reduced from 15.0 to 10.0 degrees
  };

  // Face size and quality thresholds like PHP version
  const MIN_FACE_SIZE = 0.15; // Minimum face size relative to image
  const MIN_FACE_QUALITY = 0.6; // Minimum face quality score

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
  const GUIDANCE_UPDATE_INTERVAL = 100; // より頻繁にガイダンスを更新
  // GUIDANCE_DISPLAY_DURATION は使用しない（継続表示のため）

  // syncInterval変数は削除

  onMount(async () => {
    console.log('🚀 FaceDetection component mounted');

    try {
      await initializeMediaPipe();
      console.log('✅ MediaPipe initialized, ready for camera start');
    } catch (error) {
      console.error('❌ Face detection initialization failed:', error);
      dispatch('error', {
        message:
          'Face detection initialization failed: ' +
          (error instanceof Error ? error.message : String(error)),
      });
    }
  });

  // Public method to reset detection state
  export function resetDetectionState() {
    console.log('🔄 Resetting face detection state');

    // Reset all detection-related variables
    stablePosition = false;
    stableFrameCount = 0;
    lastGuidanceUpdate = 0;
    showPoseGuidance = false;
    poseGuidanceMessage = '';
    poseGuidanceType = '';

    console.log('✅ Face detection state reset completed');
  }

  onDestroy(() => {
    completeCleanup();
  });

  // Remove automatic camera starting - now controlled externally

  // Watch for mode changes (debug disabled)
  // $: if (currentMode) { console.log('📱 Mode changed:', currentMode); }

  async function initializeMediaPipe() {
    console.log('🔧 Initializing MediaPipe FaceMesh...');

    faceMesh = new FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    // Use same settings as PHP version
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7, // Increased from 0.5
      minTrackingConfidence: 0.7, // Increased from 0.5
      selfieMode: false,
      staticImageMode: false,
    });

    faceMesh.onResults(onResults);
    console.log('✅ MediaPipe FaceMesh initialized');
  }

  // キャンバス同期機能は削除

  async function startCamera() {
    console.log('🔍 FaceDetection: Starting camera check:', {
      hasVideoElement: !!videoElement,
      hasFaceMesh: !!faceMesh,
      videoElement: videoElement,
      faceMesh: faceMesh,
    });

    if (!videoElement || !faceMesh) {
      console.warn('⚠️ Cannot start camera: missing videoElement or faceMesh', {
        videoElement: !!videoElement,
        faceMesh: !!faceMesh,
      });
      return;
    }

    if (isStartingCamera) {
      console.log('⏳ Camera is already starting, skipping...');
      return;
    }

    isStartingCamera = true;
    try {
      console.log('📹 Starting camera...');
      console.log('📊 Video element state:', {
        readyState: videoElement.readyState,
        hasStream: !!videoElement.srcObject,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
      });

      camera = new MediaPipeCamera(videoElement, {
        onFrame: async () => {
          if (faceMesh && videoElement) {
            try {
              await faceMesh.send({ image: videoElement });
            } catch (error) {
              console.warn('MediaPipe processing error:', error);
            }
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      console.log('✅ Camera started successfully');
      console.log('📊 Video element after start:', {
        readyState: videoElement.readyState,
        hasStream: !!videoElement.srcObject,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        currentSrc: videoElement.currentSrc,
        srcObject: videoElement.srcObject ? 'MediaStream' : 'null',
      });

      // Wait for video to be ready
      if (videoElement.readyState < 2) {
        console.log('⏳ Waiting for video to be ready...');
        await new Promise(resolve => {
          const checkReady = () => {
            if (videoElement.readyState >= 2) {
              console.log('✅ Video is now ready:', {
                readyState: videoElement.readyState,
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
              });

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

      dispatch('cameraStarted');
    } catch (error) {
      console.error('❌ Camera startup failed:', error);
      dispatch('error', {
        message:
          'Camera startup failed: ' +
          (error instanceof Error ? error.message : String(error)),
      });
    } finally {
      isStartingCamera = false;
    }
  }

  function onResults(results: any) {
    if (!canvasCtx && canvasElement) {
      canvasCtx = canvasElement.getContext('2d')!;
    }

    if (!canvasCtx) return;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement!.width, canvasElement!.height);

    // Draw video with proper aspect ratio handling
    const videoWidth = results.image.width || results.image.videoWidth;
    const videoHeight = results.image.height || results.image.videoHeight;
    const canvasWidth = canvasElement!.width;
    const canvasHeight = canvasElement!.height;

    // Save current video dimensions for coordinate transformation
    currentVideoWidth = videoWidth;
    currentVideoHeight = videoHeight;

    // Debug: Log video dimensions when they change
    if (Math.random() < 0.01) {
      // 1% chance to avoid spam
      console.log('📊 Video dimensions saved:', {
        videoWidth: currentVideoWidth,
        videoHeight: currentVideoHeight,
        canvasWidth,
        canvasHeight,
      });
    }

    // Calculate scaling to fit video into canvas while maintaining aspect ratio
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

    canvasCtx.drawImage(results.image, drawX, drawY, drawWidth, drawHeight);

    // Debug: Log drawing dimensions (only occasionally to avoid spam)
    if (Math.random() < 0.01) {
      // 1% chance to log
      console.log('🎨 Canvas drawing debug:', {
        video: { width: videoWidth, height: videoHeight, aspect: videoAspect },
        canvas: {
          width: canvasWidth,
          height: canvasHeight,
          aspect: canvasAspect,
        },
        draw: { x: drawX, y: drawY, width: drawWidth, height: drawHeight },
      });
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
          console.log(
            '👤 Face detection started at:',
            new Date().toLocaleTimeString()
          );
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

      const guidanceInfo = {
        show: showPoseGuidance,
        message: poseGuidanceMessage,
        type: poseGuidanceType,
        direction: getGuidanceDirection(pose),
        nosePosition: getNosePosition(landmarks),
      };

      dispatch('faceDetected', {
        landmarks,
        pose,
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
      console.warn('Face size calculation error:', error);
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

      // 最終的なピッチ値（デバイス別オフセット）
      const screenWidth = window.innerWidth;
      let pitch;
      if (screenWidth <= 480) {
        // iPhone: +30度
        pitch = rawPitch - 65 + 30;
      } else if (screenWidth <= 1024) {
        // iPad: +10度（元の重要な調整）
        pitch = rawPitch - 65 + 10;
      } else {
        // PC: オフセットなし
        pitch = rawPitch - 35;
      }

      // ヨー（Y軸回転）- 横方向の向き
      const eyeMidPoint = {
        x: (leftEye.x + rightEye.x) / 2,
      };
      const noseMidOffset = eyeMidPoint.x - nose.x;
      const yaw = noseMidOffset * 500;

      // 顔のサイズを計算
      const faceSize = calculateFaceSize(landmarks);

      // 距離と品質の計算
      const eyeDistance = Math.sqrt(eyeDiffX * eyeDiffX + eyeDiffY * eyeDiffY);
      const distance = Math.max(0.5, Math.min(2.0, 1.0 / eyeDistance));
      const quality = Math.max(0.0, Math.min(1.0, faceSize * 2));

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
      console.warn('Pose calculation error:', error);
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

    // 姿勢安定性チェックのログは削除（必要時のみ有効化）
    // console.log('🎯 Pose stability check:', { roll: pose.roll.toFixed(1), pitch: pose.pitch.toFixed(1), yaw: pose.yaw.toFixed(1), isGoodPose, progress: progress.toFixed(1) });

    if (isGoodPose) {
      if (!stablePosition) {
        stablePosition = true;
        stableStartTime = now;
        showPoseGuidance = true;
        poseGuidanceMessage = '良い姿勢です！保持してください';
        poseGuidanceType = 'success';
        console.log('✅ Stable position achieved!');

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
          console.log('🎉 Auto capture countdown completed!');
        }
      }
    } else {
      if (stablePosition) {
        console.log('❌ Lost stable position');
      }
      stablePosition = false;
      stableStartTime = null;
      progress = 0;

      // Guidance messages
      if (now - lastGuidanceUpdate > GUIDANCE_UPDATE_INTERVAL) {
        updatePoseGuidance(pose);
        lastGuidanceUpdate = now;
      }
    }
  }

  function getGuidanceDirection(pose: any) {
    if (!pose) return null;

    // 顔の品質が低い場合は矢印を表示しない
    if (pose.quality < MIN_FACE_QUALITY) {
      return null;
    }

    // 姿勢に基づいて矢印の方向を決定
    if (Math.abs(pose.roll) >= THRESHOLDS.roll) {
      return pose.roll > 0 ? 'tilt-right' : 'tilt-left';
    } else if (Math.abs(pose.pitch) >= THRESHOLDS.pitch) {
      return pose.pitch > 0 ? 'look-down' : 'look-up';
    } else if (Math.abs(pose.yaw) >= THRESHOLDS.yaw) {
      return pose.yaw > 0 ? 'turn-right' : 'turn-left';
    }
    return null;
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
        console.log('🔍 getNosePosition returning null:', {
          hasLandmarks: !!landmarks,
          hasCanvasElement: !!canvasElement,
          currentVideoWidth,
          currentVideoHeight,
        });
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
      console.log('🎯 Nose position calculated:', {
        nose: { x: nose.x, y: nose.y },
        videoAspect: videoAspect.toFixed(2),
        canvasAspect: canvasAspect.toFixed(2),
        drawRegion: { drawX, drawY, drawWidth, drawHeight },
        canvasCoords: { noseX, noseY },
        displayCoords: { displayX, displayY },
      });
    }

    return { x: displayX, y: displayY };
  }

  function updatePoseGuidance(pose: any) {
    // Don't show pose guidance in CAMERA_STARTUP mode
    if (currentMode === CaptureMode?.CAMERA_STARTUP) {
      return;
    }

    let message = '';
    let type = 'warning';

    // より詳細で親切なガイダンスメッセージ（PHP版と同じ優先順位）
    if (pose.faceSize < MIN_FACE_SIZE) {
      message = 'カメラに近づいてください（顔が小さすぎます）';
      type = 'error';
    } else if (pose.quality < MIN_FACE_QUALITY) {
      message = '顔全体をカメラに向けてください';
      type = 'error';
    } else if (Math.abs(pose.roll) >= THRESHOLDS.roll) {
      message =
        pose.roll > 0
          ? '頭を左に少し傾けてください'
          : '頭を右に少し傾けてください';
    } else if (Math.abs(pose.pitch) >= THRESHOLDS.pitch) {
      message =
        pose.pitch > 0
          ? '顔を少し上に向けてください'
          : '顔を少し下に向けてください';
    } else if (Math.abs(pose.yaw) >= THRESHOLDS.yaw) {
      message =
        pose.yaw > 0 ? '顔を右に向けてください' : '顔を左に向けてください';
    } else {
      message = '完璧な姿勢です！この状態を保持してください';
      type = 'success';
    }

    if (message) {
      poseGuidanceMessage = message;
      poseGuidanceType = type;
      showPoseGuidance = true;
      lastGuidanceMessage = message;

      // 姿勢が悪い間は継続的に表示（同じメッセージでも継続表示）
    }
  }

  // PHPと同じピノキオ棒（青い軸）描画機能
  function drawPoseAxes(landmarks: any) {
    if (!canvasCtx || !canvasElement) return;

    // 現在の姿勢を計算
    const pose = calculatePose(landmarks);

    // 鏡像表示に対応するための変換
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);

    const nose = landmarks[1];
    const scale = 0.2; // 軸の長さ

    // 座標軸の描画（鼻から伸びる青い軸）
    // ミラーリング時の座標に変換
    const noseX = (1 - nose.x) * canvasElement.width;
    const noseY = nose.y * canvasElement.height;

    // Z軸（青）- ヨー（顔の向き）に応じて方向が変わる
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
    gradient.addColorStop(0, 'rgba(0, 0, 255, 1)'); // 濃い青（始点）
    gradient.addColorStop(1, 'rgba(100, 100, 255, 1)'); // 明るい青（終点）

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
    canvasCtx.fillStyle = 'rgba(100, 100, 255, 1)';
    canvasCtx.fill();

    // 始点の円を描画
    canvasCtx.beginPath();
    canvasCtx.arc(noseX, noseY, cylinderWidth / 2, 0, Math.PI * 2);
    canvasCtx.fillStyle = 'rgba(0, 0, 255, 1)';
    canvasCtx.fill();
  }

  function checkAutoCapture() {
    if (!faceDetected || !stableStartTime) return;

    // 姿勢が安定してからの経過時間を計算
    const elapsed = (performance.now() - stableStartTime) / 1000;

    console.log('Auto capture check:', {
      elapsed: elapsed.toFixed(2),
      required: FACE_DETECTION_DELAY,
      stablePosition,
      progress: progress.toFixed(1),
      currentMode,
    });

    // 姿勢が安定してから3秒経過で撮影
    if (elapsed >= FACE_DETECTION_DELAY && stablePosition && progress >= 100) {
      console.log('🎯 Auto capture triggered!');
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
      canvasCtx.strokeStyle = progress >= 100 ? '#4CAF50' : '#FFA500';
      canvasCtx.lineWidth = 8;
      canvasCtx.stroke();
    }

    // ピノキオ棒（青い軸）の描画 - PHPと同じ実装
    if (faceLandmarks && faceDetected) {
      drawPoseAxes(faceLandmarks);
    }

    // Restore the transformation matrix
    canvasCtx.restore();
  }

  function cleanup() {
    console.log('🔄 Cleaning up camera and face detection resources');

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
        console.log('🛑 Stopped camera track:', track.kind);
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

    console.log('✅ Camera cleanup completed (faceMesh preserved for reuse)');
  }

  // Complete cleanup function for component destruction
  function completeCleanup() {
    console.log('🗑️ Complete cleanup - destroying all resources');
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
</script>

<!-- This component doesn't render anything directly -->
<!-- It only handles face detection logic and dispatches events -->
