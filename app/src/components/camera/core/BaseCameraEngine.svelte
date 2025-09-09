<!--
  BaseCameraEngine - 純粋なカメラ機能のみを提供
  Before/Afterの固有処理は含まず、slot経由でカスタマイズ可能
-->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import FaceDetection from './FaceDetection.svelte';
  import ImageCapture from './ImageCapture.svelte';
  import { AffineCorrection } from '../../../lib/AffineCorrection';
  import type { CameraCaptureResult } from '../../../types/camera';

  const dispatch = createEventDispatcher();

  // Props
  export let mode: 'before' | 'after' = 'before';
  export let programId: string = '';
  export let mirrorMode: boolean = true;
  export let showMesh: boolean = true;
  export let autoCapture: boolean = true;
  export let enableAutoCorrection: boolean | undefined = undefined;

  // Event handlers
  export let onCapture: (result: CameraCaptureResult) => void = () => {};
  export let onCancel: () => void = () => {};
  export let onError: (error: Error) => void = () => {};

  // Internal state
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let faceDetection: any;
  let imageCapture: any;
  let affineCorrection: AffineCorrection;

  // Camera state
  let isReady = false;
  let currentFaceLandmarks: any = null;
  let currentPose: any = null;
  let previewImage: string | null = null;

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

    // 自動補正設定を確認（未設定の場合は有効）
    const shouldCorrect = enableAutoCorrection !== false;

    try {
      let result: CameraCaptureResult;

      if (shouldCorrect) {
        // 自動補正を適用
        const correctionResult = await affineCorrection.correctImage(
          imageData,
          currentPose,
          currentFaceLandmarks
        );

        // 補正済み画像をメインのimageDataとして使用
        result = {
          imageData: correctionResult.correctedImageUrl, // 補正済み画像を使用
          landmarks: currentFaceLandmarks,
          pose: currentPose,
          timestamp: Date.now(),
          mode,
          correctionResult,
        };

        previewImage = correctionResult.correctedImageUrl; // プレビューも補正済み画像
      } else {
        // 自動補正なし - 元の画像をそのまま使用
        result = {
          imageData: imageData, // 元の画像を使用
          landmarks: currentFaceLandmarks,
          pose: currentPose,
          timestamp: Date.now(),
          mode,
          correctionResult: null, // 補正なし
        };

        previewImage = imageData; // プレビューも元の画像
      }

      return result;
    } catch (error) {
      onError(
        new Error(
          `Manual capture ${shouldCorrect ? 'auto correction' : 'processing'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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

  function handleCameraStarted() {
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

  async function handleAutoCapture(event: CustomEvent) {
    if (!autoCapture) return;

    const { landmarks } = event.detail;

    if (!imageCapture) return;

    const imageData = imageCapture.captureImageFromCanvas();
    if (!imageData) {
      onError(new Error('Failed to capture image'));
      return;
    }

    // 自動補正設定を確認（未設定の場合は有効）
    const shouldCorrect = enableAutoCorrection !== false;

    try {
      let result: CameraCaptureResult;

      if (shouldCorrect) {
        // 自動補正を適用
        const correctionResult = await affineCorrection.correctImage(
          imageData,
          currentPose,
          landmarks
        );

        // 補正済み画像をメインのimageDataとして使用
        result = {
          imageData: correctionResult.correctedImageUrl, // 補正済み画像を使用
          landmarks,
          pose: currentPose,
          timestamp: Date.now(),
          mode,
          correctionResult,
        };

        previewImage = correctionResult.correctedImageUrl; // プレビューも補正済み画像
      } else {
        // 自動補正なし - 元の画像をそのまま使用
        result = {
          imageData: imageData, // 元の画像を使用
          landmarks,
          pose: currentPose,
          timestamp: Date.now(),
          mode,
          correctionResult: null, // 補正なし
        };

        previewImage = imageData; // プレビューも元の画像
      }

      onCapture(result);
      dispatch('capture:success', { result });
    } catch (error) {
      onError(
        new Error(
          `Auto capture ${shouldCorrect ? 'correction' : 'processing'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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

<div class="base-camera-container">
  <!-- Face Detection Component (invisible, logic only) -->
  <FaceDetection
    bind:this={faceDetection}
    bind:videoElement
    bind:canvasElement
    {showMesh}
    currentMode={mode}
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
  <ImageCapture bind:this={imageCapture} bind:canvasElement {programId} />

  <!-- Base Camera Display -->
  <div class="camera-display">
    {#if previewImage}
      <!-- プレビュー画像表示 -->
      <img
        src={previewImage}
        alt="撮影プレビュー"
        class="preview-image {mirrorMode ? 'mirror' : ''}"
      />
    {:else}
      <!-- ライブカメラビュー - Always render video/canvas for DOM binding -->
      <video
        bind:this={videoElement}
        class="input-video {mirrorMode ? 'mirror' : ''}"
        class:hidden={!isReady}
        autoplay
        playsinline
        muted
      ></video>
      <canvas
        bind:this={canvasElement}
        class="output-canvas {mirrorMode ? 'mirror' : ''}"
        class:hidden={!isReady}
      ></canvas>

      {#if isReady}
        <!-- 顔位置ガイド -->
        <div class="face-guide-overlay">
          <!-- グリッドライン -->
          <div class="grid-lines">
            <div class="grid-line horizontal" style="top: 33.33%"></div>
            <div class="grid-line horizontal" style="top: 66.66%"></div>
            <div class="grid-line vertical" style="left: 33.33%"></div>
            <div class="grid-line vertical" style="left: 66.66%"></div>
          </div>

          <!-- 円形マスク（中央を丸くくり抜く） -->
          <div class="face-circle-mask"></div>

          <!-- モード固有のUI要素をslotで提供 -->
          <slot {currentPose} {currentFaceLandmarks} {isReady} {mode} />
        </div>
      {:else}
        <!-- カメラ準備中 -->
        <div class="camera-loading">
          <div class="loading-spinner"></div>
          <p>カメラを準備中...</p>
        </div>
      {/if}
    {/if}
  </div>

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
  .base-camera-container {
    width: 100dvw;
    height: 100dvh;
    position: relative;
    background: #222;
  }

  .camera-display {
    position: relative;
    width: 100%;
    height: 100%;
    background: #222;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input-video {
    display: none;
  }

  .input-video.mirror {
    transform: scaleX(-1);
  }

  .preview-image {
    width: 100dvw;
    height: 100dvh;
    object-fit: contain;
    display: block;
  }

  .preview-image.mirror {
    transform: scaleX(-1);
  }

  .output-canvas {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    /* カメラの縦横比を保持し、画面に収まる最大サイズで表示 */
    max-width: 100vw;
    max-height: 100vh;
    width: auto;
    height: auto;
    object-fit: contain; /* 縦横比を保持して画面に収める */
  }

  .output-canvas.mirror {
    transform: translate(-50%, -50%) scaleX(-1);
  }

  /* スマホ縦向け: カメラの縦横比を保持して最適表示 */
  @media (max-width: 768px) and (orientation: portrait) {
    .output-canvas {
      /* 縦横比保持で画面に最適化 */
      max-width: 100vw !important;
      max-height: 100vh !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important; /* 縦横比保持を強制 */
    }
  }

  /* 顔位置ガイド */
  .face-guide-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100dvw;
    height: 100dvh;
    pointer-events: none;
    z-index: 10;
  }

  /* グリッドライン */
  .grid-lines {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .grid-line {
    position: absolute;
    background: rgba(255, 255, 255, 0.3);
  }

  .grid-line.horizontal {
    width: 100dvw;
    height: 1px;
  }

  .grid-line.vertical {
    width: 1px;
    height: 100dvh;
  }

  /* 円形マスク（中央を丸くくり抜く） */
  .face-circle-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100dvw;
    height: 100dvh;
    background: rgba(0, 0, 0, 0.6);
    z-index: 5;
    pointer-events: none;
    mask: radial-gradient(circle at center 50%, transparent 30%, black 31%);
    -webkit-mask: radial-gradient(
      circle at center 40%,
      transparent 30%,
      black 31%
    );
  }

  .camera-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100dvw;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    gap: 20px;
    background: #222;
    z-index: 10;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .camera-loading p {
    margin: 0;
    font-size: 16px;
  }

  .hidden {
    visibility: hidden;
    opacity: 0;
  }

  .camera-controls {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 100;
  }

  .cancel-button {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.5);
  }
</style>
