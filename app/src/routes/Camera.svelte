<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import Layout from '../components/Layout.svelte';
  import Button from '../components/Button.svelte';
  import CameraPreview from '../components/CameraPreview.svelte';
  import CameraControls from '../components/CameraControls.svelte';
  import FaceDetection from '../components/FaceDetection.svelte';
  import ImageCapture from '../components/ImageCapture.svelte';
  import {
    isReportUploading,
    reportError,
    currentReportId,
  } from '../stores/report';

  // ルートパラメータ
  export let params: { programId: string } = { programId: '' };

  // プログラムIDを取得
  $: programId = params.programId;

  // DOM要素への参照
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;

  // コンポーネントへの参照
  let faceDetection: any;
  let imageCapture: any;

  // 撮影モード定義
  const CaptureMode = {
    IDLE: 'IDLE',
    BEFORE: 'BEFORE',
    CHALLENGE: 'CHALLENGE',
    AFTER: 'AFTER',
  } as const;

  type CaptureModeType = (typeof CaptureMode)[keyof typeof CaptureMode];

  // 状態管理
  let currentMode: CaptureModeType = CaptureMode.IDLE;
  let statusMessage = 'カメラを起動してください';
  let capturedImages: string[] = [];
  let showMesh = true;
  let mirrorMode = true;

  // Store subscriptions
  $: uploading = $isReportUploading;
  $: uploadError = $reportError;
  $: reportId = $currentReportId;

  // Face detection state
  let faceDetected = false;
  let currentFaceLandmarks: any = null;
  let poseGuidanceMessage = '';
  let poseGuidanceType = '';
  let showPoseGuidance = false;
  let progress = 0;

  // Constants
  const CAPTURE_COUNT = 1;

  onMount(() => {
    statusMessage = 'カメラを初期化中...';
  });

  // Navigation
  function goBack() {
    if (programId) {
      push(`/plan/detail/${programId}`);
    } else {
      push('/plan/list');
    }
  }

  // Capture mode management
  function startBeforeCapture() {
    currentMode = CaptureMode.BEFORE;
    capturedImages = [];
    statusMessage = 'ビフォー撮影準備中 - 顔をガイドに合わせてください';
    showPoseGuidance = false;
  }

  function startAfterCapture() {
    currentMode = CaptureMode.AFTER;
    statusMessage = 'アフター撮影準備中 - 顔をガイドに合わせてください';
    showPoseGuidance = false;
  }

  // UI controls
  function toggleMesh() {
    showMesh = !showMesh;
  }

  function toggleMirror() {
    mirrorMode = !mirrorMode;
  }

  // Face detection event handlers
  function handleCameraStarted() {
    statusMessage = 'カメラに正面を向けてください';
  }

  function handleFaceDetected(event: CustomEvent) {
    const {
      landmarks,
      pose,
      stable,
      progress: faceProgress,
      guidance,
    } = event.detail;

    currentFaceLandmarks = landmarks;
    faceDetected = !!landmarks;
    progress = faceProgress;

    // ガイダンス情報を更新
    if (guidance) {
      showPoseGuidance = guidance.show;
      poseGuidanceMessage = guidance.message;
      poseGuidanceType = guidance.type;
    }
  }

  function handleAutoCapture(event: CustomEvent) {
    const { landmarks } = event.detail;

    if (
      currentMode !== CaptureMode.IDLE &&
      capturedImages.length < CAPTURE_COUNT
    ) {
      // 自動撮影の通知
      statusMessage = '撮影中...';
      performCapture(landmarks);
    }
  }

  function handleStatusChange(event: CustomEvent) {
    statusMessage = event.detail.message;
  }

  function handleError(event: CustomEvent) {
    statusMessage = event.detail.message;
  }

  // Image capture logic
  async function performCapture(landmarks: any = null) {
    if (!imageCapture) {
      return;
    }

    try {
      // Capture image from canvas
      const imageDataUrl = imageCapture.captureImageFromCanvas();
      if (!imageDataUrl) {
        statusMessage = '画像キャプチャに失敗しました';
        return;
      }

      // Add to captured images
      capturedImages = imageCapture.addCapturedImage(
        imageDataUrl,
        capturedImages
      );

      // Determine capture kind based on current mode
      const kind = currentMode === CaptureMode.BEFORE ? 'before' : 'after';

      // Send image to API
      await imageCapture.sendImageToAPI(
        imageDataUrl,
        kind,
        landmarks || currentFaceLandmarks
      );

      // 撮影完了の視覚的フィードバック

      // Update status based on capture completion
      if (capturedImages.length >= CAPTURE_COUNT) {
        if (currentMode === CaptureMode.BEFORE) {
          statusMessage = '✅ ビフォー撮影完了！アフター撮影を開始してください';
          currentMode = CaptureMode.CHALLENGE;

          // 成功音やバイブレーションの代わりに視覚的フィードバック
        } else if (currentMode === CaptureMode.AFTER) {
          statusMessage = '🎉 アフター撮影完了！';
          currentMode = CaptureMode.IDLE;
        }
      } else {
        statusMessage = `撮影完了 (${capturedImages.length}/${CAPTURE_COUNT})`;
      }
    } catch (error) {
      statusMessage = `撮影エラー: ${error instanceof Error ? error.message : 'unknown error'}`;
    }
  }

  // Image capture event handlers
  function handleUploadStart(event: CustomEvent) {
    const { kind } = event.detail;
    statusMessage = `${kind === 'before' ? 'ビフォー' : 'アフター'}画像送信中...`;
  }

  function handleUploadSuccess(event: CustomEvent) {
    statusMessage = event.detail.message;
  }

  function handleUploadError(event: CustomEvent) {
    statusMessage = event.detail.message;
  }

  function handleImageAdded(event: CustomEvent) {
    // Image added successfully
  }

  function handleImagesCleared() {
    // Images cleared
  }
</script>

<Layout title="カメラ撮影">
  <div class="camera-container">
    <!-- Header -->
    <div class="camera-header">
      <Button variant="outline" on:click={goBack}>
        ← プログラム詳細に戻る
      </Button>
      <h2>プログラム撮影</h2>
    </div>

    <!-- Face Detection Component (invisible, logic only) -->
    <FaceDetection
      bind:this={faceDetection}
      bind:videoElement
      bind:canvasElement
      {showMesh}
      {currentMode}
      {CAPTURE_COUNT}
      {CaptureMode}
      on:cameraStarted={handleCameraStarted}
      on:faceDetected={handleFaceDetected}
      on:autoCapture={handleAutoCapture}
      on:statusChange={handleStatusChange}
      on:error={handleError}
    />

    <!-- Image Capture Component (invisible, logic only) -->
    <ImageCapture
      bind:this={imageCapture}
      bind:canvasElement
      {programId}
      on:uploadStart={handleUploadStart}
      on:uploadSuccess={handleUploadSuccess}
      on:uploadError={handleUploadError}
      on:imageAdded={handleImageAdded}
      on:imagesCleared={handleImagesCleared}
    />

    <!-- Camera Preview (Full Screen) -->
    <CameraPreview
      bind:videoElement
      bind:canvasElement
      {mirrorMode}
      {showPoseGuidance}
      {poseGuidanceMessage}
      {poseGuidanceType}
      {progress}
      {currentMode}
      {statusMessage}
      {CaptureMode}
    />

    <!-- Camera Controls (Integrated in status panel) -->
    <div class="integrated-controls">
      <div class="control-buttons">
        <Button
          variant="primary"
          disabled={currentMode !== CaptureMode.IDLE}
          on:click={startBeforeCapture}
          class="capture-button before-button"
        >
          1. ビフォー撮影開始
        </Button>

        <Button
          variant="secondary"
          disabled={currentMode === CaptureMode.IDLE ||
            capturedImages.length < CAPTURE_COUNT}
          on:click={startAfterCapture}
          class="capture-button after-button"
        >
          3. アフター撮影開始
        </Button>
      </div>

      <div class="utility-buttons">
        <Button variant="outline" on:click={toggleMesh} class="utility-button">
          {showMesh ? 'メッシュ非表示' : 'メッシュ表示'}
        </Button>

        <Button
          variant="outline"
          on:click={toggleMirror}
          class="utility-button"
        >
          {mirrorMode ? 'ミラー解除' : 'ミラー表示'}
        </Button>
      </div>
    </div>
  </div>
</Layout>

<style>
  .camera-container {
    width: 100%;
    height: 100vh;
    padding: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .camera-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    z-index: 2000;
  }

  .camera-header h2 {
    margin: 0;
    color: #fff;
    font-size: 1.2rem;
  }

  .integrated-controls {
    position: fixed;
    bottom: 140px;
    left: 0;
    right: 0;
    padding: 1rem;
    z-index: 1500;
  }

  .control-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .utility-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  :global(.capture-button) {
    min-width: 160px;
    padding: 12px 20px;
    font-size: 16px;
    font-weight: bold;
    border-radius: 25px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  :global(.before-button) {
    background: linear-gradient(135deg, #4ecdc4, #44a08d) !important;
    border: none !important;
  }

  :global(.after-button) {
    background: linear-gradient(135deg, #667eea, #764ba2) !important;
    border: none !important;
  }

  :global(.utility-button) {
    background: rgba(255, 255, 255, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    color: white !important;
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .camera-header {
      padding: 1rem;
    }

    .camera-header h2 {
      font-size: 1.1rem;
    }

    .integrated-controls {
      bottom: 120px;
      padding: 1rem 1.5rem;
    }

    .control-buttons {
      flex-direction: column;
      gap: 1rem;
    }

    .utility-buttons {
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
    }

    :global(.capture-button) {
      min-width: auto;
      width: 100%;
      padding: 16px 24px;
      font-size: 18px;
    }

    :global(.utility-button) {
      padding: 12px 20px;
      font-size: 16px;
      min-width: 140px;
    }
  }
</style>
