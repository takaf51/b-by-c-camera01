<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import FaceDetection from './camera/core/FaceDetection.svelte';
  import ImageCapture from './camera/core/ImageCapture.svelte';
  import CameraDisplay from './CameraDisplay.svelte';
  import { AffineCorrection } from '../lib/AffineCorrection';
  import type { ReferenceData } from '../lib/PoseReference';
  import type { PoseComparison } from '../lib/PoseComparator';

  const dispatch = createEventDispatcher();

  // Import types to avoid module scope issues
  import type {
    CameraCaptureResult,
    CameraConfig,
    PoseGuidanceDirection,
  } from '../types/camera';

  // Props
  export let config: CameraConfig;

  // Event handlers (required props)
  export let onCapture: (result: CameraCaptureResult) => void = () => {};
  export let onCancel: () => void = () => {};
  export let onError: (error: Error) => void = () => {};

  // Internal state
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let faceDetection: any;
  let imageCapture: any;
  let cameraDisplay: any;
  let affineCorrection: AffineCorrection;

  // Camera state
  let isReady = false;
  let currentFaceLandmarks: any = null;
  let currentPose: any = null;
  let previewImage: string | null = null;

  // Pose guidance state
  let showPoseGuidance = false;
  let poseGuidanceMessage = '';
  let poseGuidanceType = '';
  let guidanceDirection: PoseGuidanceDirection | null = null;
  let nosePosition: { x: number; y: number } | null = null;

  // After mode: Before reference comparison
  let beforeReference: ReferenceData | null = null;
  let currentComparison: PoseComparison | null = null;
  let isAfterMode = false;

  // Apply default config
  $: finalConfig = {
    mirrorMode: true,
    showMesh: true,
    autoCapture: true,
    ...config,
  };

  // Extract Before reference and comparison function from config
  $: {
    beforeReference = config.beforeReference || null;
    isAfterMode = config.mode === 'after' && !!config.onPoseCompare;
  }

  // Wait for DOM elements to be ready
  async function waitForDOMElements(): Promise<boolean> {
    const maxAttempts = 10; // 1 second max (10 * 100ms)
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (videoElement && canvasElement) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    return false;
  }

  // Public methods
  export async function startCamera(): Promise<void> {
    try {
      // First wait for DOM elements to be ready
      const domReady = await waitForDOMElements();

      if (!domReady) {
        const err = new Error('DOM elements (video/canvas) not ready');
        onError(err);
        dispatch('camera:error', { error: err });
        return;
      }

      // Then check FaceDetection component
      if (faceDetection && typeof faceDetection.startCamera === 'function') {
        await faceDetection.startCamera();
        isReady = true;
        dispatch('camera:ready');
      } else {
        // Wait a bit and try again
        setTimeout(async () => {
          if (
            faceDetection &&
            typeof faceDetection.startCamera === 'function'
          ) {
            await faceDetection.startCamera();
            isReady = true;
            dispatch('camera:ready');
          } else {
            const err = new Error('FaceDetection component not available');
            onError(err);
            dispatch('camera:error', { error: err });
          }
        }, 500);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError(err);
      dispatch('camera:error', { error: err });
    }
  }

  export function stopCamera(): void {
    if (faceDetection) {
      faceDetection.cleanup();
    }
    isReady = false;
    previewImage = null;
    dispatch('camera:stopped');
  }

  export async function captureManually(): Promise<CameraCaptureResult | null> {
    if (!isReady || !imageCapture) {
      return null;
    }

    const imageData = imageCapture.captureImageFromCanvas();
    if (!imageData) {
      return null;
    }

    try {
      // 自動補正を適用
      const correctionResult = await affineCorrection.correctImage(
        imageData,
        currentPose,
        currentFaceLandmarks
      );

      // 補正済み画像で結果を作成
      const result: CameraCaptureResult = {
        imageData: correctionResult.correctedImageUrl, // 補正済み画像を使用
        landmarks: currentFaceLandmarks,
        pose: currentPose,
        timestamp: Date.now(),
        mode: finalConfig.mode,
      };

      previewImage = correctionResult.correctedImageUrl; // プレビューも補正済み画像

      return result;
    } catch (error) {
      onError(
        new Error(
          `Manual capture auto correction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      return null;
    }
  }

  export function reset(): void {
    if (faceDetection) {
      faceDetection.resetDetectionState();
    }
    currentFaceLandmarks = null;
    currentPose = null;
    previewImage = null;
  }

  // Generate guidance for After mode based on Before reference comparison
  function generateReferenceGuidance(comparison: PoseComparison) {
    if (!comparison || comparison.adjustments.length === 0) return null;

    // Get primary adjustment (largest deviation)
    const primaryAdjustment = comparison.adjustments.reduce((max, current) =>
      current.amount > max.amount ? current : max
    );

    // Map adjustment to guidance direction
    const directionMapping: Record<string, string> = {
      'roll-left': 'TILT_LEFT',
      'roll-right': 'TILT_RIGHT',
      'pitch-up': 'LOOK_UP',
      'pitch-down': 'LOOK_DOWN',
      'yaw-left': 'TURN_LEFT',
      'yaw-right': 'TURN_RIGHT',
    };

    const adjustmentKey = `${primaryAdjustment.axis}-${primaryAdjustment.direction}`;
    const directionKey = directionMapping[adjustmentKey];

    return {
      message: `Before姿勢に合わせて${primaryAdjustment.direction === 'left' ? '左' : primaryAdjustment.direction === 'right' ? '右' : primaryAdjustment.direction === 'up' ? '上' : '下'}に調整 (差分: ${primaryAdjustment.amount.toFixed(1)}°)`,
      type: comparison.overallMatch ? 'success' : 'reference',
      direction: directionKey as PoseGuidanceDirection | null,
    };
  }

  // Internal event handlers
  function handleCameraStarted() {
    isReady = true;
    dispatch('camera:ready');
  }

  function handleFaceDetected(event: CustomEvent) {
    const { landmarks, pose, stable, progress, guidance } = event.detail;
    currentFaceLandmarks = landmarks;
    currentPose = pose;

    // After mode: compare with Before reference
    if (isAfterMode && pose && config.onPoseCompare) {
      currentComparison = config.onPoseCompare(pose);

      // Override guidance with reference-based guidance if available
      if (currentComparison) {
        const comparatorGuidance = generateReferenceGuidance(currentComparison);
        if (comparatorGuidance) {
          showPoseGuidance = true;
          poseGuidanceMessage = comparatorGuidance.message;
          poseGuidanceType = comparatorGuidance.type;
          guidanceDirection = comparatorGuidance.direction;
          // Keep original nose position
        }
      }
    } else {
      // Before mode: use normal pose guidance
      if (guidance) {
        showPoseGuidance = guidance.show;
        poseGuidanceMessage = guidance.message;
        poseGuidanceType = guidance.type;
        guidanceDirection = guidance.direction;
        nosePosition = guidance.nosePosition;
      }
    }

    dispatch('face:detected', {
      landmarks,
      pose,
      stable,
      progress,
      guidance,
      comparison: currentComparison,
    });
  }

  async function handleAutoCapture(event: CustomEvent) {
    if (!finalConfig.autoCapture) return;

    const { landmarks } = event.detail;

    if (!imageCapture) return;

    const imageData = imageCapture.captureImageFromCanvas();
    if (!imageData) {
      onError(new Error('Failed to capture image'));
      return;
    }

    try {
      // 自動補正を適用
      const correctionResult = await affineCorrection.correctImage(
        imageData,
        currentPose,
        landmarks
      );

      // 補正済み画像で結果を作成
      const result: CameraCaptureResult = {
        imageData: correctionResult.correctedImageUrl, // 補正済み画像を使用
        landmarks,
        pose: currentPose,
        timestamp: Date.now(),
        mode: finalConfig.mode,
      };

      previewImage = correctionResult.correctedImageUrl; // プレビューも補正済み画像
      onCapture(result);
      dispatch('capture:success', { result });
    } catch (error) {
      onError(
        new Error(
          `Auto correction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  function handleFaceDetectionError(event: CustomEvent) {
    const error = new Error(event.detail.message);
    onError(error);
    dispatch('camera:error', { error });
  }

  function handleCancel() {
    onCancel();
    dispatch('capture:cancel');
  }

  onMount(() => {
    // Initialize auto correction
    affineCorrection = new AffineCorrection();

    // Camera will be started externally via startCamera() method
  });

  onDestroy(() => {
    stopCamera();
  });
</script>

<div class="pure-camera-container">
  <!-- Face Detection Component (invisible, logic only) -->
  <FaceDetection
    bind:this={faceDetection}
    bind:videoElement
    bind:canvasElement
    showMesh={finalConfig.showMesh}
    currentMode={finalConfig.mode}
    CAPTURE_COUNT={1}
    CaptureMode={{
      BEFORE: 'before',
      AFTER: 'after',
      CAMERA_STARTUP: 'camera_startup',
    }}
    on:cameraStarted={handleCameraStarted}
    on:faceDetected={handleFaceDetected}
    on:autoCapture={handleAutoCapture}
    on:error={handleFaceDetectionError}
  />

  <!-- Image Capture Component (invisible, logic only) -->
  <ImageCapture
    bind:this={imageCapture}
    bind:canvasElement
    programId={finalConfig.programId || ''}
  />

  <!-- Camera Display Component -->
  <CameraDisplay
    bind:this={cameraDisplay}
    bind:videoElement
    bind:canvasElement
    {previewImage}
    mirrorMode={finalConfig.mirrorMode}
    mode={finalConfig.mode}
    {isReady}
    {showPoseGuidance}
    {poseGuidanceMessage}
    {poseGuidanceType}
    {guidanceDirection}
    {nosePosition}
    {beforeReference}
    {currentComparison}
    {isAfterMode}
    on:cancel={handleCancel}
  />

  <!-- Cancel button overlay -->
  {#if isReady}
    <div class="camera-controls">
      <button class="cancel-button" on:click={handleCancel}>
        撮影をキャンセル
      </button>
    </div>
  {/if}
</div>

<style>
  .pure-camera-container {
    width: 100%;
    height: 100vh;
    position: relative;
    background: #000;
    overflow: hidden;
  }

  .camera-controls {
    position: fixed;
    bottom: 20px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 1500;
    padding: 1rem;
  }

  .cancel-button {
    background: transparent;
    border: 1px solid white;
    color: white;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
