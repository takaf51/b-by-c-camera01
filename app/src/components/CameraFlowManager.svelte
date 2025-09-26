<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import FivePageConfirmationScreen from './ui/screens/FivePageConfirmationScreen.svelte';
  import BeforeCamera from './camera/modes/BeforeCamera.svelte';
  import AfterCamera from './camera/modes/AfterCamera.svelte';
  import UploadCompleteModal from './ui/modals/UploadCompleteModal.svelte';
  import TutorialModal from './ui/modals/TutorialModal.svelte';

  import type { CameraCaptureResult, FlowStep } from '../types/camera';

  const dispatch = createEventDispatcher();

  // Props
  export let programId: string = '';
  export let planReportId: string | null = null;
  export let kind: 'before' | 'after' | null = null;

  // Tutorial control props (外部から制御)
  export const showTutorial: boolean = false;
  export let enableTutorial: boolean | undefined = undefined; // チュートリアル機能の有効/無効（未設定時はundefined）
  export let enableExpressionDetection: boolean | undefined = undefined; // 表情検知機能の有効/無効（未設定時はundefined）

  // Tutorial state
  let showTutorialModal = false;

  // Flow state
  let currentStep: FlowStep = 'confirmation';
  let currentMode: 'before' | 'after' = 'before';
  let showUploadModal = false;
  let isInitialized = false;

  // Camera references
  let currentCamera: any;

  // Initialize flow once based on props
  function initializeFlow() {
    if (isInitialized) return;

    // After撮影の場合は現在のモードを設定
    if (kind === 'after') {
      currentMode = 'after';
    }

    // Always start from confirmation screen when embedded in PHP
    // User will manually proceed through the flow
    currentStep = 'confirmation';

    isInitialized = true;
  }

  // Initialize on mount to avoid reactive loops
  onMount(() => {
    initializeFlow();
  });

  // Flow navigation
  function handleConfirmationConfirm() {
    // チュートリアルが有効で、表示条件を満たす場合はチュートリアルを表示
    if (enableTutorial && shouldShowTutorial()) {
      showTutorialModal = true;
    } else {
      // チュートリアルがない場合は確認画面から直接カメラ起動
      startCameraDirectly();
    }
  }

  // チュートリアル表示判定ロジック（シンプルで明確）
  function shouldShowTutorial(): boolean {
    // enableTutorialが明示的に設定されている場合は、その値に従う
    if (enableTutorial !== undefined) {
      return enableTutorial;
    }

    // enableTutorialが未設定の場合は、既存のロジックを維持
    // After撮影時はチュートリアルをスキップ
    if (kind === 'after') {
      return false;
    }

    // Before撮影でも、チュートリアル受講済み（planReportIdあり）の場合はスキップ
    if (planReportId) {
      return false;
    }

    // その他の場合（初回Before撮影等）はチュートリアルを表示
    return true;
  }

  // チュートリアル完了時の処理（撮影するボタンクリック時）
  function handleTutorialComplete() {
    showTutorialModal = false;
    // チュートリアル完了後はguideステップをスキップして直接カメラ起動
    startCameraDirectly();
    dispatch('tutorial:complete');
  }

  // チュートリアルスキップ時の処理
  function handleTutorialSkip() {
    showTutorialModal = false;
    // チュートリアルスキップ時も直接カメラ起動
    startCameraDirectly();
    dispatch('tutorial:skip');
  }

  // チュートリアル閉じる時の処理
  function handleTutorialClose() {
    showTutorialModal = false;
    dispatch('tutorial:close');
  }

  function handleStartPreinitialization() {
    // Page 1 displayed - start pre-initializing camera components immediately
    console.log(
      '📋 確認画面1ページ目表示、カメラコンポーネントの事前準備を開始'
    );

    // Pre-mount camera component in background to start MediaPipe initialization
    // This will be invisible until the user actually starts the camera
    if (!currentCamera) {
      setTimeout(() => {
        // This allows MediaPipe to start loading while user is still on confirmation
        console.log(
          '🔧 カメラコンポーネントの事前マウント（バックグラウンド初期化）'
        );
      }, 100);
    }
  }

  function handlePage2Reached() {
    // Page 2 of confirmation reached - MediaPipe pre-initialization already started
    console.log('📋 確認画面2ページ目到達（MediaPipe事前初期化は継続中）');
  }

  let cameraStarting = false;

  function startCameraDirectly() {
    if (cameraStarting) {
      console.log('⏳ カメラ起動処理が既に実行中です');
      return;
    }

    cameraStarting = true;
    currentStep = 'camera';
    console.log('🎬 カメラモードに移行します');

    // Start camera after ensuring component is mounted
    setTimeout(() => {
      if (currentCamera && typeof currentCamera.startCamera === 'function') {
        console.log('📱 カメラコンポーネントが準備完了、起動を開始します');
        currentCamera
          .startCamera()
          .then(() => {
            cameraStarting = false;
            console.log('✅ カメラ起動処理が完了しました');
          })
          .catch((error: any) => {
            cameraStarting = false;
            console.error('❌ カメラ起動でエラーが発生しました:', error);
          });
      } else {
        console.log(
          '⏳ カメラコンポーネントがまだ準備中です。リトライします...'
        );
        // Retry with longer delay
        setTimeout(() => {
          if (
            currentCamera &&
            typeof currentCamera.startCamera === 'function'
          ) {
            console.log('📱 リトライでカメラ起動を開始します');
            currentCamera
              .startCamera()
              .then(() => {
                cameraStarting = false;
                console.log('✅ リトライでカメラ起動が完了しました');
              })
              .catch((error: any) => {
                cameraStarting = false;
                console.error(
                  '❌ リトライでもカメラ起動に失敗しました:',
                  error
                );
              });
          } else {
            cameraStarting = false;
            console.error('❌ カメラコンポーネントが利用できません');
          }
        }, 1000);
      }
    }, 300);
  }

  function handleCameraCapture(result: CameraCaptureResult) {
    if (result.mode === 'before') {
      // After before capture, determine next step
      if (kind === 'before') {
        // Switch to after mode and start camera directly
        currentMode = 'after';
        startCameraDirectly();
      } else {
        // Before capture only - go back directly
        handleDirectComplete();
      }
    } else {
      // After capture - go back directly without modal
      handleDirectComplete();
    }

    dispatch('capture', { result });
  }

  function handleCancel() {
    // Reset camera starting state
    cameraStarting = false;

    // Clean up camera if active
    if (currentCamera && currentStep === 'camera') {
      currentCamera.stopCamera();
    }

    window.location.href = '/';

    dispatch('cancel');
  }

  function handleDirectComplete() {
    // Reset camera starting state
    cameraStarting = false;

    // Clean up camera
    if (currentCamera) {
      currentCamera.stopCamera();
    }

    // Navigate back to program detail
    if (programId) {
      push(`/plan/detail/${programId}`);
    } else {
      push('/plan/list');
    }

    dispatch('complete');
  }

  function handleUploadComplete(action: 'watch-later' | 'watch-now') {
    showUploadModal = false;

    // Clean up camera
    if (currentCamera) {
      currentCamera.stopCamera();
    }

    // Navigate or complete flow
    if (action === 'watch-now') {
      // TODO: Navigate to video viewing
    }

    // Always go back to program detail for now
    if (programId) {
      push(`/plan/detail/${programId}`);
    } else {
      push('/plan/list');
    }

    dispatch('complete', { action });
  }

  function handleCameraError(error: Error) {
    dispatch('error', { error });
  }

  // Cleanup on component destroy
  function cleanup() {
    // Reset all state
    cameraStarting = false;

    if (currentCamera) {
      currentCamera.stopCamera();
    }
  }
</script>

<div class="camera-flow-container">
  {#if currentStep === 'confirmation'}
    <FivePageConfirmationScreen
      on:confirm={handleConfirmationConfirm}
      on:cancel={handleCancel}
      on:page2-reached={handlePage2Reached}
      on:start-preinitialization={handleStartPreinitialization}
    />
  {:else if currentStep === 'camera'}
    {#if currentMode === 'before'}
      <BeforeCamera
        bind:this={currentCamera}
        {programId}
        {enableExpressionDetection}
        mirrorMode={true}
        showMesh={true}
        autoCapture={true}
        onCancel={handleCancel}
        onError={handleCameraError}
      />
    {:else}
      <AfterCamera
        bind:this={currentCamera}
        {programId}
        {planReportId}
        {enableExpressionDetection}
        mirrorMode={true}
        showMesh={true}
        autoCapture={true}
        onCancel={handleCancel}
        onError={handleCameraError}
      />
    {/if}
  {/if}

  <!-- Upload complete modal -->
  <UploadCompleteModal
    show={showUploadModal}
    mode={currentMode}
    on:watch-later={() => handleUploadComplete('watch-later')}
    on:watch-now={() => handleUploadComplete('watch-now')}
    on:close={() => handleUploadComplete('watch-later')}
  />

  <!-- Tutorial Modal -->
  <TutorialModal
    bind:show={showTutorialModal}
    autoStart={false}
    on:complete={handleTutorialComplete}
    on:skip={handleTutorialSkip}
    on:close={handleTutorialClose}
  />
</div>

<!-- Cleanup on unmount -->
<svelte:window on:beforeunload={cleanup} />

<style>
  .camera-flow-container {
    width: 100%;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    background: #222;
  }
</style>
