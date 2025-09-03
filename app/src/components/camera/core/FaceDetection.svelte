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
  import {
    PoseGuidanceDirection,
    PoseGuidanceType,
    POSE_GUIDANCE_MAP,
    type PoseGuidanceData,
  } from '../../../types/camera';

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
    try {
      await initializeMediaPipe();
    } catch (error) {
      dispatch('error', {
        message:
          'Face detection initialization failed: ' +
          (error instanceof Error ? error.message : String(error)),
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
  }

  onDestroy(() => {
    completeCleanup();
  });

  // Remove automatic camera starting - now controlled externally

  // Watch for mode changes (debug disabled)
  // $: if (currentMode) { console.log('📱 Mode changed:', currentMode); }

  async function initializeMediaPipe() {
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
  }

  // キャンバス同期機能は削除

  async function startCamera() {
    if (!videoElement || !faceMesh) {
      return;
    }

    if (isStartingCamera) {
      return;
    }

    isStartingCamera = true;
    try {
      camera = new MediaPipeCamera(videoElement, {
        onFrame: async () => {
          if (faceMesh && videoElement) {
            try {
              await faceMesh.send({ image: videoElement });
            } catch (error) {}
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();

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

      dispatch('cameraStarted');
    } catch (error) {
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
      if (stablePosition) {
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

    const { message, type, direction } = guidanceData;

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

    // 姿勢が安定してから3秒経過で撮影
    if (elapsed >= FACE_DETECTION_DELAY && stablePosition && progress >= 100) {
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
</script>

<!-- This component doesn't render anything directly -->
<!-- It only handles face detection logic and dispatches events -->
