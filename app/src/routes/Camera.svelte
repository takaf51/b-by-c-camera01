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
    console.log('Camera.svelte: Component mounted');
    statusMessage = 'カメラを初期化中...';
  });

  // Navigation
  function goBack() {
    console.log('goBack: programId', programId);
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
    statusMessage = 'ビフォー撮影開始';
    showPoseGuidance = false;
    console.log('🎬 Before capture started, mode:', currentMode);
  }

  function startAfterCapture() {
    currentMode = CaptureMode.AFTER;
    statusMessage = 'アフター撮影開始';
    showPoseGuidance = false;
    console.log('🎬 After capture started, mode:', currentMode);
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
      console.log('Guidance update:', guidance);
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
    console.error('Camera error:', event.detail);
  }

  // Image capture logic
  async function performCapture(landmarks: any = null) {
    if (!imageCapture) {
      console.error('ImageCapture component not available');
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
      console.log('✅ 撮影完了:', { kind, imageCount: capturedImages.length });

      // Update status based on capture completion
      if (capturedImages.length >= CAPTURE_COUNT) {
        if (currentMode === CaptureMode.BEFORE) {
          statusMessage = '✅ ビフォー撮影完了！アフター撮影を開始してください';
          currentMode = CaptureMode.CHALLENGE;

          // 成功音やバイブレーションの代わりに視覚的フィードバック
          setTimeout(() => {
            console.log('🎉 ビフォー撮影シーケンス完了');
          }, 500);
        } else if (currentMode === CaptureMode.AFTER) {
          statusMessage = '🎉 アフター撮影完了！';
          currentMode = CaptureMode.IDLE;

          setTimeout(() => {
            console.log('🎉 全撮影シーケンス完了');
          }, 500);
        }
      } else {
        statusMessage = `撮影完了 (${capturedImages.length}/${CAPTURE_COUNT})`;
      }
    } catch (error) {
      console.error('Capture failed:', error);
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
    console.error('Upload error:', event.detail.error);
  }

  function handleImageAdded(event: CustomEvent) {
    console.log(`Image added. Total count: ${event.detail.totalCount}`);
  }

  function handleImagesCleared() {
    console.log('Images cleared');
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

    <!-- Camera Preview -->
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

    <!-- Camera Controls -->
    <CameraControls
      {currentMode}
      {capturedImages}
      {showMesh}
      {mirrorMode}
      isUploading={uploading}
      {reportId}
      {CAPTURE_COUNT}
      {CaptureMode}
      onStartBeforeCapture={startBeforeCapture}
      onStartAfterCapture={startAfterCapture}
      onToggleMesh={toggleMesh}
      onToggleMirror={toggleMirror}
    />
  </div>
</Layout>

<style>
  .camera-container {
    max-width: 100%;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    position: relative;
  }

  .camera-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .camera-header h2 {
    margin: 0;
    color: #fff;
  }

  @media (max-width: 768px) {
    .camera-container {
      padding: 0.5rem;
    }

    .camera-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
  }
</style>
