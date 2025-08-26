<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { push } from 'svelte-spa-router';
  import Layout from '../components/Layout.svelte';
  import Button from '../components/Button.svelte';
  import CameraPreview from '../components/CameraPreview.svelte';
  import FaceDetection from '../components/FaceDetection.svelte';
  import ImageCapture from '../components/ImageCapture.svelte';
  import {
    AffineCorrection,
    type CorrectionResult,
  } from '../lib/AffineCorrection';
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
    CAMERA_STARTUP: 'CAMERA_STARTUP', // カメラ起動画面（最初の状態）
    CONFIRMATION: 'CONFIRMATION', // 確認事項画面
    PRE_CAPTURE_GUIDE: 'PRE_CAPTURE_GUIDE', // 撮影例画面
    BEFORE: 'BEFORE',
    PREVIEW_BEFORE: 'PREVIEW_BEFORE',
    CORRECTION: 'CORRECTION', // 2D補正画面
    CHALLENGE: 'CHALLENGE',
    AFTER: 'AFTER',
    PREVIEW_AFTER: 'PREVIEW_AFTER',
  } as const;

  type CaptureModeType = (typeof CaptureMode)[keyof typeof CaptureMode];

  // 状態管理
  let currentMode: CaptureModeType = CaptureMode.CAMERA_STARTUP;
  let statusMessage = ''; // デザインにないため空文字
  let capturedImages: string[] = [];
  let showMesh = true;
  let mirrorMode = true;
  let currentPreviewImage: string | null = null;

  let showCompletionModal = false;
  let isSending = false;
  let pendingCaptureMode: 'before' | 'after' | null = null;

  // 2D補正機能の状態
  let affineCorrection: AffineCorrection;
  let beforeImageData: string | null = null;
  let beforePoseData: any = null;
  let beforeLandmarks: any = null;
  let correctionResult: CorrectionResult | null = null;
  let isProcessingCorrection = false;

  // Store subscriptions
  $: uploading = $isReportUploading;
  $: uploadError = $reportError;
  $: reportId = $currentReportId;

  // Debug modal state (disabled)
  // $: { console.log('🔍 Modal state debug:', { showCompletionModal, currentMode }); }

  // Face detection state
  let faceDetected = false;
  let currentFaceLandmarks: any = null;
  let currentPose: any = null;
  let poseGuidanceMessage = '';
  let poseGuidanceType = '';
  let showPoseGuidance = false;
  let guidanceDirection: string | null = null;
  let nosePosition: { x: number; y: number } | null = null;

  let progress = 0;

  // Constants
  const CAPTURE_COUNT = 1;

  onMount(() => {
    // Initial status will be set by camera startup
    console.log('📱 Camera component mounted');

    // Initialize AffineCorrection
    affineCorrection = new AffineCorrection();

    // ページ離脱時にカメラを停止
    const handleBeforeUnload = () => {
      console.log('🚪 Page unloading, stopping camera');
      if (faceDetection && faceDetection.completeCleanup) {
        faceDetection.completeCleanup();
      } else if (faceDetection && faceDetection.cleanup) {
        faceDetection.cleanup();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // カメラ起動イベントリスナー（確認事項画面に遷移）
    window.addEventListener('cameraStartRequested', () => {
      console.log(
        '📷 Handling camera start request - going to confirmation screen'
      );
      // まず確認事項画面に遷移
      currentMode = CaptureMode.CONFIRMATION;
      pendingCaptureMode = 'before'; // デフォルトでBEFORE撮影を設定
    });

    // ファイル選択イベントリスナー
    window.addEventListener('fileSelected', (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('📁 Handling file selection:', customEvent.detail);
      // ファイル処理ロジックをここに追加
    });

    // キャンセルイベントリスナー
    window.addEventListener('cancelRequested', () => {
      console.log('❌ Handling cancel request');
      goBack();
    });

    // 実際の撮影開始イベントリスナー
    window.addEventListener('startActualCapture', () => {
      console.log('📷 Starting actual capture');
      startActualCapture();
    });

    // 確認事項完了イベントリスナー（撮影例画面に遷移）
    window.addEventListener('confirmationCompleted', () => {
      console.log('✅ Confirmation completed - going to guide screen');
      currentMode = CaptureMode.PRE_CAPTURE_GUIDE;
    });

    // 撮影開始イベントリスナー（撮影例画面から）
    window.addEventListener('startCaptureRequested', () => {
      console.log('📷 Handling start capture request');
      startActualCapture();
    });

    // クリーンアップ関数を返す
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
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
    pendingCaptureMode = 'before';
    currentMode = CaptureMode.CAMERA_STARTUP;
  }

  function startAfterCapture() {
    pendingCaptureMode = 'after';
    currentMode = CaptureMode.CAMERA_STARTUP;
  }

  function startActualCapture() {
    // 3. 撮影例画面から実際の撮影開始
    if (pendingCaptureMode === 'before') {
      currentMode = CaptureMode.BEFORE;
      capturedImages = [];
    } else if (pendingCaptureMode === 'after') {
      currentMode = CaptureMode.AFTER;
    }
    pendingCaptureMode = null;
    showPoseGuidance = false;
  }

  function goBackToStartup() {
    // 撮影例画面からカメラ起動画面に戻る
    currentMode = CaptureMode.CAMERA_STARTUP;
    pendingCaptureMode = null;
  }

  // 撮影完了モーダルのハンドラー
  function handleWatchLater() {
    console.log('📺 Watch later selected - closing modal');

    // カメラを停止
    if (faceDetection && faceDetection.cleanup) {
      faceDetection.cleanup();
    }

    showCompletionModal = false;
    currentPreviewImage = null; // Clear the background image

    // カメラを完全にリセット
    resetCameraToInitialState();
    // モーダルを閉じるだけで、画面遷移はしない
  }

  function handleWatchNow() {
    console.log('📺 Watch now selected - closing modal');

    // カメラを停止
    if (faceDetection && faceDetection.cleanup) {
      faceDetection.cleanup();
    }

    showCompletionModal = false;
    currentPreviewImage = null; // Clear the background image

    // カメラを完全にリセット
    resetCameraToInitialState();
    // モーダルを閉じるだけで、画面遷移はしない（動画視聴機能は将来実装予定）
  }

  // UI controls (kept for future use but not exposed in UI)
  function toggleMesh() {
    showMesh = !showMesh;
  }

  function toggleMirror() {
    mirrorMode = !mirrorMode;
  }

  // Face detection event handlers
  function handleCameraStarted() {
    // デザインにないためメッセージ表示しない
    statusMessage = '';
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
    currentPose = pose;
    faceDetected = !!landmarks;
    progress = faceProgress;

    // ガイダンス情報を更新
    if (guidance) {
      showPoseGuidance = guidance.show;
      poseGuidanceMessage = guidance.message;
      poseGuidanceType = guidance.type;
      guidanceDirection = guidance.direction;
      nosePosition = guidance.nosePosition;
    }
  }

  function handleAutoCapture(event: CustomEvent) {
    const { landmarks } = event.detail;

    if (
      currentMode !== CaptureMode.CAMERA_STARTUP &&
      capturedImages.length < CAPTURE_COUNT
    ) {
      // 自動撮影実行（メッセージ表示なし）
      performCapture(landmarks);
    }
  }

  function handleStatusChange(event: CustomEvent) {
    // デザインにないためステータスメッセージは表示しない
    // statusMessage = event.detail.message;
  }

  function handleError(event: CustomEvent) {
    console.warn('⚠️ Face detection error:', event.detail.message);
    // Don't show error messages to user unless critical
    if (event.detail.message.includes('Camera startup failed')) {
      statusMessage =
        'カメラの起動に失敗しました。ページを再読み込みしてください。';
    }
    // Other errors are handled silently
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

      // Debug: Log canvas and video dimensions
      if (faceDetection) {
        const videoElement = document.querySelector(
          '.input-video'
        ) as HTMLVideoElement;
        const canvasElement = document.querySelector(
          '.output-canvas'
        ) as HTMLCanvasElement;

        console.log('📊 Capture dimensions debug:', {
          videoElement: {
            videoWidth: videoElement?.videoWidth,
            videoHeight: videoElement?.videoHeight,
            clientWidth: videoElement?.clientWidth,
            clientHeight: videoElement?.clientHeight,
            offsetWidth: videoElement?.offsetWidth,
            offsetHeight: videoElement?.offsetHeight,
          },
          canvasElement: {
            width: canvasElement?.width,
            height: canvasElement?.height,
            clientWidth: canvasElement?.clientWidth,
            clientHeight: canvasElement?.clientHeight,
            offsetWidth: canvasElement?.offsetWidth,
            offsetHeight: canvasElement?.offsetHeight,
          },
        });
      }

      // Store the captured image for preview
      currentPreviewImage = imageDataUrl;
      console.log('📸 Image captured, transitioning to preview mode:', {
        currentMode,
        hasPreviewImage: !!currentPreviewImage,
      });

      // Transition to preview mode instead of sending to API immediately
      if (currentMode === CaptureMode.BEFORE) {
        // Store before image data and pose for correction
        beforeImageData = imageDataUrl;
        beforePoseData = currentPose;
        beforeLandmarks = currentFaceLandmarks;

        currentMode = CaptureMode.PREVIEW_BEFORE;
        console.log('📸 Switched to PREVIEW_BEFORE mode, stored before data');
      } else if (currentMode === CaptureMode.AFTER) {
        currentMode = CaptureMode.PREVIEW_AFTER;
        console.log('📸 Switched to PREVIEW_AFTER mode');
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

    // カメラを停止
    if (faceDetection && faceDetection.cleanup) {
      faceDetection.cleanup();
    }

    // 撮影成功後にカメラをリセット
    resetCameraAfterCapture();
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

  // 2D補正処理
  async function performAffineCorrection() {
    if (!beforeImageData || !beforePoseData || !affineCorrection) {
      console.error('❌ Missing data for correction:', {
        hasBeforeImage: !!beforeImageData,
        hasBeforePose: !!beforePoseData,
        hasAffineCorrection: !!affineCorrection,
      });
      return;
    }

    isProcessingCorrection = true;
    console.log('🔧 Starting 2D affine correction...');

    try {
      correctionResult = await affineCorrection.correctImage(
        beforeImageData,
        beforePoseData,
        beforeLandmarks
      );

      console.log('✅ 2D correction completed:', {
        originalPose: correctionResult.originalPose,
        correctedPose: correctionResult.estimatedCorrectedPose,
      });

      // Switch to correction results view
      currentMode = CaptureMode.CORRECTION;
    } catch (error) {
      console.error('❌ 2D correction failed:', error);
      statusMessage = `補正処理エラー: ${error instanceof Error ? error.message : 'unknown error'}`;
    } finally {
      isProcessingCorrection = false;
    }
  }

  // Preview mode functions
  async function confirmSendImage() {
    console.log('📤 confirmSendImage called:', {
      hasPreviewImage: !!currentPreviewImage,
      currentMode,
      hasImageCapture: !!imageCapture,
      isSending,
    });

    if (!currentPreviewImage || !imageCapture || isSending) {
      console.log(
        '❌ Missing preview image, imageCapture component, or already sending'
      );
      return;
    }

    isSending = true;

    try {
      // Determine capture kind based on current mode
      const kind =
        currentMode === CaptureMode.PREVIEW_BEFORE ||
        currentMode === CaptureMode.CORRECTION
          ? 'before'
          : 'after';

      // Use corrected image if available and in correction mode
      const imageToSend =
        currentMode === CaptureMode.CORRECTION && correctionResult
          ? correctionResult.correctedImageUrl
          : currentPreviewImage;

      // Add to captured images
      capturedImages = imageCapture.addCapturedImage(
        imageToSend,
        capturedImages
      );

      // Send image to API
      await imageCapture.sendImageToAPI(
        imageToSend,
        kind,
        currentFaceLandmarks
      );

      // Show completion modal based on current mode before changing it
      const captureType =
        currentMode === CaptureMode.PREVIEW_BEFORE ? 'BEFORE' : 'AFTER';
      console.log(`🎉 Showing completion modal for ${captureType} capture`);

      // Update mode after capture completion - return to camera startup with photo
      currentMode = CaptureMode.CAMERA_STARTUP;
      showCompletionModal = true;

      // Keep preview image for background display
      // currentPreviewImage will be cleared when modal is closed
    } catch (error) {
      console.error('❌ Error in confirmSendImage:', error);
      statusMessage = `送信エラー: ${error instanceof Error ? error.message : 'unknown error'}`;
      // エラーが発生してもモーダルを表示
      console.log('🎉 Showing completion modal despite error');
      currentMode = CaptureMode.CAMERA_STARTUP;
      showCompletionModal = true;
    } finally {
      isSending = false;
    }
  }

  function cancelCapture() {
    console.log('🔄 Cancelling capture and resetting camera');

    // カメラを停止
    if (faceDetection && faceDetection.cleanup) {
      faceDetection.cleanup();
    }

    // Clear any preview image
    currentPreviewImage = null;

    // Reset all capture-related state
    faceDetected = false;
    currentFaceLandmarks = null;
    showPoseGuidance = false;
    poseGuidanceMessage = '';
    poseGuidanceType = '';
    guidanceDirection = null;
    nosePosition = null;

    progress = 0;

    // Reset face detection state
    if (faceDetection) {
      faceDetection.resetDetectionState();
    }

    // Return to appropriate state
    if (currentMode === CaptureMode.BEFORE) {
      currentMode = CaptureMode.CAMERA_STARTUP;
    } else if (currentMode === CaptureMode.AFTER) {
      currentMode = CaptureMode.CHALLENGE;
    } else {
      // For any other mode, go to camera startup
      currentMode = CaptureMode.CAMERA_STARTUP;
    }

    console.log('✅ Camera reset completed, new mode:', currentMode);
  }

  function resetCameraAfterCapture() {
    console.log('🔄 Resetting camera after successful capture');

    // Clear all capture-related state
    faceDetected = false;
    currentFaceLandmarks = null;
    showPoseGuidance = false;
    poseGuidanceMessage = '';
    poseGuidanceType = '';
    guidanceDirection = null;
    nosePosition = null;

    progress = 0;
    currentPreviewImage = null;

    // Reset face detection state
    if (faceDetection) {
      faceDetection.resetDetectionState();
    }

    // Determine next mode based on current mode
    if (currentMode === CaptureMode.BEFORE) {
      // After BEFORE capture, go to CHALLENGE mode
      currentMode = CaptureMode.CHALLENGE;
    } else if (currentMode === CaptureMode.AFTER) {
      // After AFTER capture, show completion modal
      showCompletionModal = true;
      currentMode = CaptureMode.CAMERA_STARTUP;
    } else {
      // Default to CAMERA_STARTUP
      currentMode = CaptureMode.CAMERA_STARTUP;
    }

    console.log(
      '✅ Camera reset after capture completed, new mode:',
      currentMode
    );
  }

  function resetCameraToInitialState() {
    console.log('🔄 Resetting camera to initial state');

    // Clear all state variables
    faceDetected = false;
    currentFaceLandmarks = null;
    showPoseGuidance = false;
    poseGuidanceMessage = '';
    poseGuidanceType = '';
    guidanceDirection = null;
    nosePosition = null;

    progress = 0;
    currentPreviewImage = null;
    statusMessage = '';

    // Reset modals
    showCompletionModal = false;
    pendingCaptureMode = null;

    // Reset to camera startup mode
    currentMode = CaptureMode.CAMERA_STARTUP;

    // Reset face detection state
    if (faceDetection) {
      faceDetection.resetDetectionState();
    }

    console.log('✅ Camera reset to initial state completed');
  }

  onDestroy(() => {
    console.log('🗑️ Camera component destroying, stopping camera');
    if (faceDetection && faceDetection.completeCleanup) {
      faceDetection.completeCleanup();
    } else if (faceDetection && faceDetection.cleanup) {
      faceDetection.cleanup();
    }
  });
</script>

<Layout title="カメラ撮影">
  <div class="camera-container">
    <!-- Header - デザイン通り -->
    <div class="camera-header">
      <button class="back-button" on:click={goBack}> ← </button>
      <div class="header-logo">EQUAL=i</div>
      <div class="header-user-icon">👤</div>
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
      {guidanceDirection}
      {nosePosition}
      {currentMode}
      {CaptureMode}
      previewImage={currentPreviewImage}
      {beforeImageData}
      {correctionResult}
    />

    <!-- Camera Controls (Integrated in status panel) -->
    <div class="integrated-controls">
      {#if currentMode === CaptureMode.PREVIEW_BEFORE || currentMode === CaptureMode.PREVIEW_AFTER}
        <!-- Preview mode controls -->
        <div class="preview-controls">
          {#if currentMode === CaptureMode.PREVIEW_BEFORE}
            <Button
              variant="secondary"
              on:click={performAffineCorrection}
              class="capture-button correction-button"
              disabled={isProcessingCorrection}
            >
              {isProcessingCorrection ? '🔧 補正処理中...' : '🔧 2D補正実行'}
            </Button>
            <Button
              variant="primary"
              on:click={confirmSendImage}
              class="capture-button send-button"
              disabled={isSending}
            >
              {isSending ? '📤 送信中...' : '📤 送信する（補正なし）'}
            </Button>
          {:else}
            <Button
              variant="primary"
              on:click={confirmSendImage}
              class="capture-button send-button"
              disabled={isSending}
            >
              {isSending ? '📤 送信中...' : '📤 送信する'}
            </Button>
          {/if}
        </div>
      {:else if currentMode === CaptureMode.CORRECTION}
        <!-- Correction results mode controls -->
        <div class="correction-controls">
          <Button
            variant="secondary"
            on:click={() => (currentMode = CaptureMode.PREVIEW_BEFORE)}
            class="back-button"
          >
            ← Before画像に戻る
          </Button>
          <Button
            variant="primary"
            on:click={confirmSendImage}
            disabled={isSending}
            class="send-button"
          >
            {isSending ? '📤 送信中...' : '📤 補正後画像を送信'}
          </Button>
          <Button
            variant="primary"
            on:click={() => (currentMode = CaptureMode.AFTER)}
            class="next-button"
          >
            After撮影へ →
          </Button>
        </div>
      {:else if currentMode === CaptureMode.BEFORE || currentMode === CaptureMode.AFTER}
        <!-- Capture mode - only cancel button -->
        <div class="capture-mode-controls">
          <Button
            variant="outline"
            on:click={cancelCapture}
            class="capture-button cancel-button"
          >
            撮影をキャンセル
          </Button>
        </div>
      {/if}
    </div>

    <!-- 撮影完了モーダル -->
    {#if showCompletionModal}
      <!-- Debug: Modal is being rendered -->
      <div class="modal-overlay" role="dialog" tabindex="-1">
        <div
          class="completion-modal"
          role="dialog"
          tabindex="0"
          on:click|stopPropagation
          on:keydown|stopPropagation
        >
          <div class="completion-content">
            <h2 class="completion-title">送信が完了しました</h2>
            <p class="completion-subtitle">
              続けて施術動画を見て施術してみましょう？
            </p>

            <div class="completion-buttons">
              <button class="later-button" on:click={handleWatchLater}>
                後で見る
              </button>
              <button class="watch-button" on:click={handleWatchNow}>
                視聴する
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
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
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    z-index: 2000;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .back-button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .header-logo {
    font-size: 1.5rem;
    font-weight: bold;
    letter-spacing: 1px;
    color: white;
  }

  .header-user-icon {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .integrated-controls {
    position: fixed;
    bottom: 20px;
    left: 0;
    right: 0;
    padding: 1rem;
    z-index: 1500;
    /* 黒枠を削除 */
    background: transparent;
    backdrop-filter: none;
    border-radius: 0;
  }

  .preview-controls,
  .capture-mode-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    align-items: center;
    margin-bottom: 1rem;
    background: transparent;
    border: none;
    padding: 16px;
    position: relative;
    z-index: 1000;
    width: 100%;
    box-sizing: border-box;
  }

  :global(.capture-button) {
    min-width: 160px;
    padding: 12px 20px;
    font-size: 16px;
    font-weight: bold;
    border-radius: 25px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  :global(.start-capture-button) {
    background: linear-gradient(135deg, #a8e6cf, #7fcdcd) !important;
    border: none !important;
    color: #333 !important;
    font-weight: bold !important;
    font-size: 1.1rem !important;
  }

  :global(.before-button) {
    background: linear-gradient(135deg, #4ecdc4, #44a08d) !important;
    border: none !important;
  }

  :global(.after-button) {
    background: linear-gradient(135deg, #667eea, #764ba2) !important;
    border: none !important;
  }

  :global(.send-button) {
    background: linear-gradient(135deg, #56ab2f, #a8e6cf) !important;
    border: none !important;
  }

  :global(.capture-button.cancel-button),
  :global(button.cancel-button) {
    width: auto !important;
    height: 46px !important;
    min-width: 84px !important;
    max-width: 480px !important;
    border-radius: 50px !important;
    border: 1px solid white !important;
    background: transparent !important;
    color: white !important;
    padding: 0 24px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    white-space: nowrap !important;
    text-overflow: ellipsis !important;
    overflow: hidden !important;
    line-height: 1 !important;
    opacity: 1 !important;
    box-sizing: border-box !important;
    text-align: center !important;
  }

  :global(.capture-button.cancel-button:hover),
  :global(button.cancel-button:hover) {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: white !important;
  }

  /* Pre-capture modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  /* 撮影完了モーダル */
  .completion-modal {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .completion-content {
    padding: 30px 25px;
    text-align: center;
  }

  .completion-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 15px 0;
    color: #333;
  }

  .completion-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0 0 30px 0;
    line-height: 1.5;
  }

  .completion-buttons {
    display: flex;
    gap: 15px;
  }

  .later-button {
    flex: 1;
    background: #c4d736;
    border: none;
    color: #333;
    padding: 15px 20px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .later-button:hover {
    background: #b8c62f;
    transform: translateY(-1px);
  }

  .watch-button {
    flex: 1;
    background: #c4d736;
    border: none;
    color: #333;
    padding: 15px 20px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .watch-button:hover {
    background: #b8c62f;
    transform: translateY(-1px);
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 15px;
    }

    .completion-content {
      padding: 25px 20px;
    }

    .completion-title {
      font-size: 16px;
    }

    .completion-subtitle {
      font-size: 13px;
    }

    .completion-buttons {
      gap: 12px;
    }

    .later-button,
    .watch-button {
      padding: 12px 16px;
      font-size: 15px;
    }

    .camera-header {
      padding: 1rem;
    }

    .integrated-controls {
      bottom: 10px;
      padding: 0.8rem 1rem;
      margin: 0;
      background: transparent;
    }

    .preview-controls,
    .capture-mode-controls {
      flex-direction: column;
      gap: 1rem;
      background: transparent;
      border: none;
      padding: 0;
    }

    :global(.capture-button) {
      min-width: auto;
      width: 100%;
      padding: 16px 24px;
      font-size: 18px;
    }
  }
</style>
