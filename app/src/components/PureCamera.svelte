<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import FaceDetection from './FaceDetection.svelte';
  import ImageCapture from './ImageCapture.svelte';
  import CameraDisplay from './CameraDisplay.svelte';

  const dispatch = createEventDispatcher();

  // Import types to avoid module scope issues
  import type { CameraCaptureResult, CameraConfig } from '../types/camera';

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

  // Camera state
  let isReady = false;
  let currentFaceLandmarks: any = null;
  let currentPose: any = null;
  let previewImage: string | null = null;

  // Apply default config
  $: finalConfig = {
    mirrorMode: true,
    showMesh: true,
    autoCapture: true,
    ...config,
  };

  // Wait for DOM elements to be ready
  async function waitForDOMElements(): Promise<boolean> {
    const maxAttempts = 10; // 1 second max (10 * 100ms)
    let attempts = 0;

    while (attempts < maxAttempts) {
      console.log(`🔍 DOM check (${attempts + 1}/${maxAttempts}):`, {
        hasVideoElement: !!videoElement,
        hasCanvasElement: !!canvasElement,
        videoElement: videoElement,
        canvasElement: canvasElement,
      });

      if (videoElement && canvasElement) {
        console.log('✅ DOM elements ready:', { videoElement, canvasElement });
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    console.error('❌ DOM elements not ready after timeout');
    return false;
  }

  // Public methods
  export async function startCamera(): Promise<void> {
    console.log('🚀 PureCamera: Starting camera with config:', finalConfig);
    try {
      // First wait for DOM elements to be ready
      console.log('🔍 Checking DOM elements:', { videoElement, canvasElement });
      const domReady = await waitForDOMElements();

      if (!domReady) {
        const err = new Error('DOM elements (video/canvas) not ready');
        onError(err);
        dispatch('camera:error', { error: err });
        return;
      }

      // Then check FaceDetection component
      if (faceDetection && typeof faceDetection.startCamera === 'function') {
        console.log('🎬 Starting FaceDetection camera...');
        await faceDetection.startCamera();
        isReady = true;
        dispatch('camera:ready');
      } else {
        console.warn('⚠️ FaceDetection component not ready, retrying...');
        // Wait a bit and try again
        setTimeout(async () => {
          if (
            faceDetection &&
            typeof faceDetection.startCamera === 'function'
          ) {
            console.log('🎬 Starting FaceDetection camera (retry)...');
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
      console.error('❌ PureCamera: Failed to start camera:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      onError(err);
      dispatch('camera:error', { error: err });
    }
  }

  export function stopCamera(): void {
    console.log('🛑 PureCamera: Stopping camera');
    if (faceDetection) {
      faceDetection.cleanup();
    }
    isReady = false;
    previewImage = null;
    dispatch('camera:stopped');
  }

  export function captureManually(): CameraCaptureResult | null {
    console.log('📸 PureCamera: Manual capture requested');
    if (!isReady || !imageCapture) {
      return null;
    }

    const imageData = imageCapture.captureImageFromCanvas();
    if (!imageData) {
      return null;
    }

    const result: CameraCaptureResult = {
      imageData,
      landmarks: currentFaceLandmarks,
      pose: currentPose,
      timestamp: Date.now(),
      mode: finalConfig.mode,
    };

    return result;
  }

  export function reset(): void {
    console.log('🔄 PureCamera: Resetting camera state');
    if (faceDetection) {
      faceDetection.resetDetectionState();
    }
    currentFaceLandmarks = null;
    currentPose = null;
    previewImage = null;
  }

  // Internal event handlers
  function handleCameraStarted() {
    console.log('✅ PureCamera: Camera started successfully');
    isReady = true;
    dispatch('camera:ready');
  }

  function handleFaceDetected(event: CustomEvent) {
    const { landmarks, pose, stable, progress, guidance } = event.detail;
    currentFaceLandmarks = landmarks;
    currentPose = pose;

    dispatch('face:detected', {
      landmarks,
      pose,
      stable,
      progress,
      guidance,
    });
  }

  function handleAutoCapture(event: CustomEvent) {
    if (!finalConfig.autoCapture) return;

    console.log('🎯 PureCamera: Auto capture triggered');
    const { landmarks } = event.detail;

    if (!imageCapture) return;

    const imageData = imageCapture.captureImageFromCanvas();
    if (!imageData) {
      onError(new Error('Failed to capture image'));
      return;
    }

    const result: CameraCaptureResult = {
      imageData,
      landmarks,
      pose: currentPose,
      timestamp: Date.now(),
      mode: finalConfig.mode,
    };

    previewImage = imageData;
    onCapture(result);
    dispatch('capture:success', { result });
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
    console.log('🏗️ PureCamera: Component mounted');
    // Camera will be started externally via startCamera() method
  });

  onDestroy(() => {
    console.log('🗑️ PureCamera: Component destroying');
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
