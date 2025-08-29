<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import ConfirmationScreen from './ConfirmationScreen.svelte';
  import CaptureGuideScreen from './CaptureGuideScreen.svelte';
  import PureCamera from './PureCamera.svelte';
  import UploadCompleteModal from './UploadCompleteModal.svelte';
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

  // Flow state
  let currentStep: FlowStep = 'confirmation';
  let currentMode: 'before' | 'after' = 'before';
  let showUploadModal = false;
  let isInitialized = false;

  // Camera references
  let pureCamera: any;

  // Initialize flow once based on props
  function initializeFlow() {
    if (isInitialized) return;

    console.log('🏁 Initializing flow with:', { planReportId, kind, flow });

    if (planReportId) {
      // チュートリアル受講済み
      flow = 'skipTutorial';
    }
    if (kind === 'after') {
      // アフター撮影のみ
      flow = 'afterOnly';
      currentMode = 'after';
    }

    // Set initial step based on flow
    if (flow === 'skipTutorial' || flow === 'afterOnly') {
      currentStep = 'camera';
      // Start camera automatically for skip flows after component mount
      setTimeout(() => {
        if (pureCamera && typeof pureCamera.startCamera === 'function') {
          console.log('✅ Auto-starting camera for skip flow');
          pureCamera.startCamera();
        }
      }, 300);
    } else {
      currentStep = 'confirmation';
    }

    isInitialized = true;
  }

  // Initialize on mount to avoid reactive loops
  onMount(() => {
    initializeFlow();
  });

  // Flow navigation
  function handleConfirmationConfirm() {
    console.log('✅ Confirmation completed, moving to guide');
    currentStep = 'guide';
  }

  function handleGuideStartCapture() {
    console.log('🎬 Guide completed, starting camera');
    currentStep = 'camera';

    // Start camera after a brief delay to ensure component is mounted
    setTimeout(() => {
      console.log('🔍 Attempting to start camera, pureCamera:', pureCamera);
      if (pureCamera && typeof pureCamera.startCamera === 'function') {
        console.log('✅ Starting camera');
        pureCamera.startCamera();
      } else {
        console.warn('⚠️ PureCamera component not ready, retrying...');
        // Retry after another delay
        setTimeout(() => {
          if (pureCamera && typeof pureCamera.startCamera === 'function') {
            console.log('✅ Starting camera (retry)');
            pureCamera.startCamera();
          } else {
            console.error('❌ PureCamera component still not ready');
          }
        }, 500);
      }
    }, 200);
  }

  function handleCameraCapture(result: CameraCaptureResult) {
    console.log('📸 Camera capture completed:', result);

    if (result.mode === 'before') {
      // After before capture, determine next step
      if (flow === 'tutorial') {
        // Show guide for after capture
        currentMode = 'after';
        currentStep = 'guide';
      } else {
        // Show upload complete modal
        showUploadModal = true;
      }
    } else {
      // After after capture, show completion
      showUploadModal = true;
    }

    dispatch('capture', { result });
  }

  function handleCancel() {
    console.log('❌ Flow cancelled');

    // Clean up camera if active
    if (pureCamera && currentStep === 'camera') {
      pureCamera.stopCamera();
    }

    // Navigate back
    if (programId) {
      push(`/plan/detail/${programId}`);
    } else {
      push('/plan/list');
    }

    dispatch('cancel');
  }

  function handleUploadComplete(action: 'watch-later' | 'watch-now') {
    console.log('🎉 Upload complete action:', action);

    showUploadModal = false;

    // Clean up camera
    if (pureCamera) {
      pureCamera.stopCamera();
    }

    // Navigate or complete flow
    if (action === 'watch-now') {
      // TODO: Navigate to video viewing
      console.log('📺 Navigate to video viewing (not implemented yet)');
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
    console.error('❌ Camera error:', error);
    dispatch('error', { error });
  }

  // Cleanup on component destroy
  function cleanup() {
    if (pureCamera) {
      pureCamera.stopCamera();
    }
  }

  // Log flow changes for debugging
  $: {
    console.log('🔄 Flow state changed:', {
      currentStep,
      currentMode,
      flow,
      planReportId,
      kind,
      isInitialized,
    });
  }
</script>

<div class="camera-flow-container">
  {#if currentStep === 'confirmation'}
    <ConfirmationScreen
      on:confirm={handleConfirmationConfirm}
      on:cancel={handleCancel}
    />
  {:else if currentStep === 'guide'}
    <CaptureGuideScreen
      mode={currentMode}
      on:start-capture={handleGuideStartCapture}
      on:cancel={handleCancel}
    />
  {:else if currentStep === 'camera'}
    <PureCamera
      bind:this={pureCamera}
      config={{
        mode: currentMode,
        mirrorMode: true,
        showMesh: true,
        autoCapture: true,
        programId,
      }}
      onCapture={handleCameraCapture}
      onCancel={handleCancel}
      onError={handleCameraError}
    />
  {/if}

  <!-- Upload complete modal -->
  <UploadCompleteModal
    show={showUploadModal}
    mode={currentMode}
    on:watch-later={() => handleUploadComplete('watch-later')}
    on:watch-now={() => handleUploadComplete('watch-now')}
    on:close={() => handleUploadComplete('watch-later')}
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
