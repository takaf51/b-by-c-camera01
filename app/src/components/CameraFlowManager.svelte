<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import ConfirmationScreen from './ConfirmationScreen.svelte';
  import CaptureGuideScreen from './CaptureGuideScreen.svelte';
  import PureCamera from './PureCamera.svelte';
  import UploadCompleteModal from './UploadCompleteModal.svelte';
  import TutorialModal from './TutorialModal.svelte';
  import { PoseReference, type ReferenceData } from '../lib/PoseReference';
  import { PoseComparator, type PoseComparison } from '../lib/PoseComparator';
  import {
    fetchBeforeInfo,
    fetchBeforePoints,
    saveBeforeInfo,
  } from '../lib/BeforeReferenceAPI';
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
  export let showTutorial: boolean = false;
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
  let pureCamera: any;

  // Before/After pose management
  let poseReference: PoseReference;
  let poseComparator: PoseComparator;
  let beforeData: ReferenceData | null = null;
  let currentComparison: PoseComparison | null = null;

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
    // Initialize pose management classes
    poseReference = new PoseReference();
    poseComparator = new PoseComparator();

    initializeFlow();

    // Load Before data if this is After mode
    if (currentMode === 'after') {
      loadBeforeReference();
    }
  });

  // Flow navigation
  function handleConfirmationConfirm() {
    // チュートリアルが有効で、表示条件を満たす場合はチュートリアルを表示
    if (enableTutorial && shouldShowTutorial()) {
      showTutorialModal = true;
      tutorialMode = currentMode;
    } else {
      currentStep = 'guide';
    }
  }

  // チュートリアル表示判定ロジック（外部から上書き可能）
  function shouldShowTutorial(): boolean {
    // デフォルトロジック - 一時的にtrueにして動作確認
    // 実際の条件は外部から制御される予定
    return true; // 一時的に常に表示
  }

  // チュートリアル完了時の処理
  function handleTutorialComplete() {
    showTutorialModal = false;
    currentStep = 'guide';
    dispatch('tutorial:complete', { mode: tutorialMode });
  }

  // チュートリアルスキップ時の処理
  function handleTutorialSkip() {
    showTutorialModal = false;
    currentStep = 'guide';
    dispatch('tutorial:skip', { mode: tutorialMode });
  }

  // チュートリアル閉じる時の処理
  function handleTutorialClose() {
    showTutorialModal = false;
    dispatch('tutorial:close', { mode: tutorialMode });
  }

  function handleGuideStartCapture() {
    currentStep = 'camera';

    // Start camera after a brief delay to ensure component is mounted
    setTimeout(() => {
      if (pureCamera && typeof pureCamera.startCamera === 'function') {
        pureCamera.startCamera();
      } else {
        // Retry after another delay
        setTimeout(() => {
          if (pureCamera && typeof pureCamera.startCamera === 'function') {
            pureCamera.startCamera();
          } else {
          }
        }, 500);
      }
    }, 200);
  }

  function handleCameraCapture(result: CameraCaptureResult) {
    if (result.mode === 'before') {
      // Save Before reference data
      saveBefore(result);

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
    showUploadModal = false;

    // Clean up camera
    if (pureCamera) {
      pureCamera.stopCamera();
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

  // Before/After pose management functions
  function saveBefore(result: CameraCaptureResult) {
    if (!poseReference || !result.pose) return;

    // Save Before reference data locally
    poseReference.setReference(result.pose, result.imageData, result.landmarks);
    beforeData = poseReference.getReference();

    console.log('💾 Before撮影データをローカルに保存:', {
      pose: result.pose,
      timestamp: beforeData?.timestamp,
    });

    // Save to API if planReportId is available
    if (planReportId) {
      saveBeforeToAPI(result);
    }
  }

  async function saveBeforeToAPI(result: CameraCaptureResult) {
    try {
      // 送信データの詳細をログ出力
      console.log('📤 Before撮影データ送信内容:', {
        pose: result.pose,
        poseType: typeof result.pose,
        poseKeys: result.pose ? Object.keys(result.pose) : null,
        landmarks: result.landmarks
          ? `${result.landmarks.length} landmarks`
          : 'no landmarks',
        landmarksType: typeof result.landmarks,
        imageDataLength: result.imageData?.length || 0,
        imageDataPreview: result.imageData?.substring(0, 50) + '...',
        timestamp: result.timestamp,
        mode: result.mode,
      });

      const success = await saveBeforeInfo(planReportId!, {
        pose: result.pose!,
        image: result.imageData,
        landmarks: result.landmarks,
        // TODO: Add correction result if available
        // correctionResult: result.correctionResult
      });

      if (success) {
        console.log('✅ Before情報のAPI保存完了');
      } else {
        console.warn('⚠️ Before情報のAPI保存に失敗');
      }
    } catch (error) {
      console.error('❌ Before情報API保存エラー:', error);
    }
  }

  async function loadBeforeReference(): Promise<void> {
    // planCodeを取得（優先順位: window設定 > planReportId）
    const planCode =
      (window as any).CameraSettings?.PLAN_CODE ||
      `plan-${planReportId}` ||
      '2025-07-29-trial'; // デフォルト

    try {
      console.log('📥 Before Points情報の取得を開始:', {
        planCode,
        planReportId,
      });

      // 新しいAPI仕様でBefore情報を取得
      let beforeInfo = await fetchBeforePoints(planCode);

      // 新しいAPIで取得できない場合は旧APIを試行
      if (!beforeInfo && planReportId) {
        console.log('🔄 新しいAPIで取得できないため、旧APIを試行');
        beforeInfo = await fetchBeforeInfo(planReportId);
      }

      if (beforeInfo) {
        // Before情報が取得できた場合、PoseReferenceに設定
        poseReference.setReference(
          beforeInfo.pose,
          beforeInfo.image,
          beforeInfo.landmarks
        );

        // 補正結果がある場合は追加で設定
        if (beforeInfo.correctionResult) {
          poseReference.setCorrectionResult(beforeInfo.correctionResult);
        }

        beforeData = poseReference.getReference();

        console.log('✅ Before情報の取得・設定完了:', {
          timestamp: beforeInfo.timestamp,
          pose: beforeInfo.pose,
          hasCorrection: !!beforeInfo.correctionResult,
          apiUsed: beforeInfo ? 'fetchBeforePoints' : 'fetchBeforeInfo',
        });
      } else {
        console.log(
          '📭 Before情報が見つかりません（Before撮影未完了の可能性）'
        );
      }
    } catch (error) {
      console.error('❌ Before情報の取得に失敗:', error);
      // エラーが発生してもAfter撮影は続行可能（参照なしモード）
    }
  }

  function comparePose(currentPose: {
    roll: number;
    pitch: number;
    yaw: number;
  }) {
    if (!poseReference.hasReference()) return null;

    const referencePose = poseReference.getDisplayPose();
    if (!referencePose) return null;

    currentComparison = poseComparator.comparePoses(referencePose, currentPose);
    return currentComparison;
  }

  // Cleanup on component destroy
  function cleanup() {
    if (pureCamera) {
      pureCamera.stopCamera();
    }
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
        beforeReference: beforeData,
        onPoseCompare: currentMode === 'after' ? comparePose : undefined,
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
