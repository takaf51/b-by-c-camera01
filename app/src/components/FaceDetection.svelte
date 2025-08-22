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

  // Constants
  export const CAPTURE_COUNT: number = 1;
  export let CaptureMode: any;

  // MediaPipe instances
  let faceMesh: any;
  let camera: any;
  let canvasCtx: CanvasRenderingContext2D | null = null;

  // Face detection state
  let faceDetectionCount = 0;
  let faceDetected = false;
  let faceDetectionStartTime: number | null = null;
  let faceLandmarks: any = null;

  // Constants
  const FACE_DETECTION_THRESHOLD = 3;
  const FACE_DETECTION_DELAY = 2.0;
  const STABILITY_TIME = 0.15;
  const THRESHOLDS = {
    roll: 1.0,
    pitch: 0.8,
    yaw: 0.8,
  };

  // Pose and stability tracking
  let stablePosition = false;
  let stableStartTime: number | null = null;
  let progress = 0;

  // Guidance
  let poseGuidanceMessage = '';
  let poseGuidanceType = '';
  let showPoseGuidance = false;
  let lastGuidanceUpdate = 0;
  let lastGuidanceMessage = '';
  const GUIDANCE_UPDATE_INTERVAL = 500;
  const GUIDANCE_DISPLAY_DURATION = 3000;

  onMount(async () => {
    console.log('FaceDetection: onMount started');
    try {
      await initializeMediaPipe();
      if (videoElement) {
        await startCamera();
      }
    } catch (error) {
      console.error('FaceDetection: Error in onMount:', error);
      dispatch('error', {
        message:
          'Face detection initialization failed: ' +
          (error instanceof Error ? error.message : String(error)),
      });
    }
  });

  onDestroy(() => {
    cleanup();
  });

  $: if (videoElement && canvasElement && faceMesh && !camera) {
    startCamera().catch(console.error);
  }

  async function initializeMediaPipe() {
    console.log('FaceDetection: Creating FaceMesh...');

    faceMesh = new FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
  }

  async function startCamera() {
    if (!videoElement || !faceMesh) {
      console.warn('FaceDetection: Required elements not ready');
      return;
    }

    try {
      camera = new MediaPipeCamera(videoElement, {
        onFrame: async () => {
          if (faceMesh) {
            try {
              await faceMesh.send({ image: videoElement });
            } catch (error) {
              console.error('FaceDetection: Error in faceMesh.send:', error);
            }
          }
        },
        width: 1280,
        height: 720,
      });

      await camera.start();
      console.log('FaceDetection: Camera started successfully');

      dispatch('cameraStarted');
    } catch (error) {
      console.error('FaceDetection: Camera startup failed:', error);
      dispatch('error', {
        message:
          'Camera startup failed: ' +
          (error instanceof Error ? error.message : String(error)),
      });
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

    // Draw video
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement!.width,
      canvasElement!.height
    );

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      faceLandmarks = landmarks;

      // Calculate pose
      const pose = calculatePose(landmarks);
      updateStability(pose);

      if (showMesh) {
        drawFaceMesh(landmarks);
      }

      // Face detection stability
      faceDetectionCount++;

      if (!faceDetected && faceDetectionCount >= FACE_DETECTION_THRESHOLD) {
        faceDetected = true;
        console.log('✅ Face detected! Mode:', currentMode);

        if (currentMode !== CaptureMode?.IDLE) {
          faceDetectionStartTime = performance.now();
          console.log('⏰ Auto capture timer started');
          dispatch('statusChange', {
            message: '顔を検出しました。撮影準備中...',
          });
        }
      }

      // Check auto capture
      if (currentMode !== CaptureMode?.IDLE) {
        checkAutoCapture();
      }

      const guidanceInfo = {
        show: showPoseGuidance,
        message: poseGuidanceMessage,
        type: poseGuidanceType,
      };

      console.log('Face detected event:', {
        stable: stablePosition,
        progress,
        guidance: guidanceInfo,
        currentMode,
      });

      dispatch('faceDetected', {
        landmarks,
        pose,
        stable: stablePosition,
        progress,
        guidance: guidanceInfo,
      });
    } else {
      // No face detected
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

    const message =
      currentMode === CaptureMode?.IDLE
        ? 'カメラに正面を向けてください'
        : 'カメラに顔を向けてください';

    dispatch('statusChange', { message });
    dispatch('faceDetected', {
      landmarks: null,
      pose: null,
      stable: false,
      progress: 0,
    });

    showPoseGuidance = false;
    lastGuidanceMessage = '';
  }

  function calculatePose(landmarks: any) {
    // 実際の姿勢計算ロジック
    try {
      // 顔の主要ポイントを取得
      const nose = landmarks[1]; // 鼻先
      const leftEye = landmarks[33]; // 左目
      const rightEye = landmarks[263]; // 右目
      const chin = landmarks[175]; // 顎
      const forehead = landmarks[10]; // 額

      // Roll（左右の傾き）を計算
      const eyeVector = {
        x: rightEye.x - leftEye.x,
        y: rightEye.y - leftEye.y,
      };
      const roll = Math.atan2(eyeVector.y, eyeVector.x) * (180 / Math.PI);

      // Pitch（上下の向き）を計算
      const faceVector = {
        x: chin.x - forehead.x,
        y: chin.y - forehead.y,
      };
      const pitch =
        Math.atan2(faceVector.y, Math.sqrt(faceVector.x * faceVector.x + 1)) *
        (180 / Math.PI);

      // Yaw（左右の向き）を概算
      const noseCenterX = (leftEye.x + rightEye.x) / 2;
      const yaw = (nose.x - noseCenterX) * 180; // 簡易計算

      // 距離と品質の概算
      const eyeDistance = Math.sqrt(
        eyeVector.x * eyeVector.x + eyeVector.y * eyeVector.y
      );
      const distance = Math.max(0.5, Math.min(2.0, 1.0 / eyeDistance));
      const quality = Math.max(0.0, Math.min(1.0, eyeDistance * 10));

      return {
        roll: roll,
        pitch: pitch,
        yaw: yaw,
        distance: distance,
        quality: quality,
      };
    } catch (error) {
      console.error('Pose calculation error:', error);
      return {
        roll: 0,
        pitch: 0,
        yaw: 0,
        distance: 1.0,
        quality: 0.0,
      };
    }
  }

  function updateStability(pose: any) {
    const now = performance.now();
    const isGoodPose =
      Math.abs(pose.roll) < THRESHOLDS.roll &&
      Math.abs(pose.pitch) < THRESHOLDS.pitch &&
      Math.abs(pose.yaw) < THRESHOLDS.yaw;

    console.log('Pose check:', {
      roll: pose.roll.toFixed(1),
      pitch: pose.pitch.toFixed(1),
      yaw: pose.yaw.toFixed(1),
      isGood: isGoodPose,
      thresholds: THRESHOLDS,
    });

    if (isGoodPose) {
      if (!stablePosition) {
        stablePosition = true;
        stableStartTime = now;
        showPoseGuidance = true;
        poseGuidanceMessage = '良い姿勢です！保持してください';
        poseGuidanceType = 'success';
        console.log('✅ Stable position started');
      }

      if (stableStartTime) {
        const elapsed = (now - stableStartTime) / 1000;
        progress = Math.min((elapsed / STABILITY_TIME) * 100, 100);
        console.log('Progress:', progress.toFixed(1) + '%');
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

  function updatePoseGuidance(pose: any) {
    let message = '';
    let type = 'warning';

    if (Math.abs(pose.roll) >= THRESHOLDS.roll) {
      message =
        pose.roll > 0 ? '頭を右に傾けすぎています' : '頭を左に傾けすぎています';
    } else if (Math.abs(pose.pitch) >= THRESHOLDS.pitch) {
      message =
        pose.pitch > 0
          ? '顔を上に向けすぎています'
          : '顔を下に向けすぎています';
    } else if (Math.abs(pose.yaw) >= THRESHOLDS.yaw) {
      message =
        pose.yaw > 0 ? '顔を左に向けすぎています' : '顔を右に向けすぎています';
    }

    if (message && message !== lastGuidanceMessage) {
      poseGuidanceMessage = message;
      poseGuidanceType = type;
      showPoseGuidance = true;
      lastGuidanceMessage = message;

      setTimeout(() => {
        showPoseGuidance = false;
      }, GUIDANCE_DISPLAY_DURATION);
    }
  }

  function checkAutoCapture() {
    if (!faceDetected || !faceDetectionStartTime) return;

    const elapsed = (performance.now() - faceDetectionStartTime) / 1000;

    console.log('Auto capture check:', {
      elapsed,
      required: FACE_DETECTION_DELAY,
      stablePosition,
      progress,
      currentMode,
    });

    if (elapsed >= FACE_DETECTION_DELAY && stablePosition && progress >= 100) {
      console.log('🚀 Triggering auto capture!');
      dispatch('autoCapture', { landmarks: faceLandmarks });

      // Reset detection to prevent multiple captures
      faceDetectionStartTime = null;
      faceDetected = false;
    }
  }

  function drawUIOverlays() {
    if (!canvasCtx || !canvasElement) return;

    // 撮影中の場合、中央に円を描画
    if (currentMode !== CaptureMode?.IDLE && faceDetected) {
      const centerX = canvasElement.width / 2;
      const centerY = canvasElement.height / 2;
      const radius = 150;

      // 外側の円（白）
      canvasCtx.beginPath();
      canvasCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      canvasCtx.lineWidth = 4;
      canvasCtx.stroke();

      // プログレスバーとしての内側の円
      if (stablePosition && progress > 0) {
        const progressRadius = radius - 10;
        const progressAngle = (progress / 100) * 2 * Math.PI - Math.PI / 2;

        canvasCtx.beginPath();
        canvasCtx.arc(
          centerX,
          centerY,
          progressRadius,
          -Math.PI / 2,
          progressAngle
        );
        canvasCtx.strokeStyle = progress >= 100 ? '#4CAF50' : '#FFA500';
        canvasCtx.lineWidth = 8;
        canvasCtx.stroke();
      }

      // 中央のガイド点
      canvasCtx.beginPath();
      canvasCtx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
      canvasCtx.fillStyle = stablePosition ? '#4CAF50' : '#FFA500';
      canvasCtx.fill();

      // カウントダウン表示
      if (faceDetectionStartTime && currentMode !== CaptureMode?.IDLE) {
        const elapsed = (performance.now() - faceDetectionStartTime) / 1000;
        const countdown = Math.max(0, FACE_DETECTION_DELAY - elapsed);

        if (countdown > 0) {
          canvasCtx.font = 'bold 48px Arial';
          canvasCtx.fillStyle = '#FFFFFF';
          canvasCtx.textAlign = 'center';
          canvasCtx.textBaseline = 'middle';
          canvasCtx.fillText(
            Math.ceil(countdown).toString(),
            centerX,
            centerY - 60
          );
        }
      }
    }

    // 顔が検出されていない場合の指示
    if (!faceDetected && currentMode !== CaptureMode?.IDLE) {
      const centerX = canvasElement.width / 2;
      const centerY = canvasElement.height / 2;

      canvasCtx.font = 'bold 24px Arial';
      canvasCtx.fillStyle = '#FF4444';
      canvasCtx.textAlign = 'center';
      canvasCtx.textBaseline = 'middle';
      canvasCtx.fillText('顔を画面内に入れてください', centerX, centerY);
    }
  }

  function cleanup() {
    if (camera) {
      camera.stop();
      camera = null;
    }
    if (faceMesh) {
      faceMesh.close();
      faceMesh = null;
    }
  }

  // Export function to get current face landmarks
  export function getCurrentFaceLandmarks() {
    return faceLandmarks;
  }

  // Export guidance state
  export { showPoseGuidance, poseGuidanceMessage, poseGuidanceType };
</script>

<!-- This component doesn't render anything directly -->
<!-- It only handles face detection logic and dispatches events -->
