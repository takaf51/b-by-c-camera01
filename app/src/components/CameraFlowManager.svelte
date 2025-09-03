<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import ConfirmationScreen from './ui/screens/ConfirmationScreen.svelte';
  import BeforeCamera from './camera/modes/BeforeCamera.svelte';
  import AfterCamera from './camera/modes/AfterCamera.svelte';
  import UploadCompleteModal from './ui/modals/UploadCompleteModal.svelte';
  import TutorialModal from './ui/modals/TutorialModal.svelte';

  import type {
    CameraCaptureResult,
    CameraFlowType,
    FlowStep,
  } from '../types/camera';

  const dispatch = createEventDispatcher();

  // Props
  export let programId: string = '';
  export let flow: CameraFlowType = 'tutorial';
  export let planReportId: string | null = null;
  export let kind: 'before' | 'after' | null = null;

  // Tutorial control props (外部から制御)
  export const showTutorial: boolean = false;
  export let tutorialMode: 'before' | 'after' = 'before';
  export let enableTutorial: boolean = true; // チュートリアル機能の有効/無効

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

    if (planReportId) {
      // チュートリアル受講済み
      flow = 'skipTutorial';
    }
    if (kind === 'after') {
      // アフター撮影のみ
      flow = 'afterOnly';
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
      tutorialMode = currentMode;
    } else {
      // チュートリアルがない場合は確認画面から直接カメラ起動
      startCameraDirectly();
    }
  }

  // チュートリアル表示判定ロジック（外部から上書き可能）
  function shouldShowTutorial(): boolean {
    // デフォルトロジック - 一時的にtrueにして動作確認
    // 実際の条件は外部から制御される予定
    return true; // 一時的に常に表示
  }

  // チュートリアル完了時の処理（撮影するボタンクリック時）
  function handleTutorialComplete() {
    showTutorialModal = false;
    // チュートリアル完了後はguideステップをスキップして直接カメラ起動
    startCameraDirectly();
    dispatch('tutorial:complete', { mode: tutorialMode });
  }

  // チュートリアルスキップ時の処理
  function handleTutorialSkip() {
    showTutorialModal = false;
    // チュートリアルスキップ時も直接カメラ起動
    startCameraDirectly();
    dispatch('tutorial:skip', { mode: tutorialMode });
  }

  // チュートリアル閉じる時の処理
  function handleTutorialClose() {
    showTutorialModal = false;
    dispatch('tutorial:close', { mode: tutorialMode });
  }

  function startCameraDirectly() {
    currentStep = 'camera';

    // Start camera after a brief delay to ensure component is mounted
    setTimeout(() => {
      if (currentCamera && typeof currentCamera.startCamera === 'function') {
        currentCamera.startCamera();
      } else {
        // Retry after another delay
        setTimeout(() => {
          if (
            currentCamera &&
            typeof currentCamera.startCamera === 'function'
          ) {
            currentCamera.startCamera();
          }
        }, 500);
      }
    }, 200);
  }

  function handleCameraCapture(result: CameraCaptureResult) {
    if (result.mode === 'before') {
      // After before capture, determine next step
      if (flow === 'tutorial') {
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
    // Clean up camera if active
    if (currentCamera && currentStep === 'camera') {
      currentCamera.stopCamera();
    }

    // Navigate back
    if (programId) {
      push(`/plan/detail/${programId}`);
    } else {
      push('/plan/list');
    }

    dispatch('cancel');
  }

  function handleDirectComplete() {
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
    if (currentCamera) {
      currentCamera.stopCamera();
    }
  }
</script>

<div class="camera-flow-container">
  {#if currentStep === 'confirmation'}
    <ConfirmationScreen
      on:confirm={handleConfirmationConfirm}
      on:cancel={handleCancel}
    />
  {:else if currentStep === 'camera'}
    {#if currentMode === 'before'}
      <BeforeCamera
        bind:this={currentCamera}
        {programId}
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
    mode={tutorialMode}
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
    overflow: hidden;
    background: #222;
  }
</style>
