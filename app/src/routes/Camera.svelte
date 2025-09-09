<script lang="ts">
  import CameraFlowManager from '../components/CameraFlowManager.svelte';
  import { externalConfig } from '../stores/externalConfig';

  // ルートパラメータ
  export let params: { programId: string } = { programId: '' };

  // プログラムIDを取得（外部設定からも取得可能）
  $: programId = params.programId || $externalConfig.planCode || '';

  // 外部設定から取得（チュートリアル有無判定）
  $: planReportId = $externalConfig.planReportId
    ? String($externalConfig.planReportId)
    : null;
  $: kind = $externalConfig.kind || null;
  $: enableTutorial = $externalConfig.enableTutorial;
  $: enableAutoCorrection = $externalConfig.enableAutoCorrection;

  // Event handlers
  function handleFlowCapture(event: CustomEvent) {
    console.log('📸 Camera flow capture:', event.detail);
  }

  function handleFlowComplete(event: CustomEvent) {
    console.log('🎉 Camera flow complete:', event.detail);
  }

  function handleFlowCancel() {
    console.log('❌ Camera flow cancelled');
  }

  function handleFlowError(event: CustomEvent) {
    console.error('❌ Camera flow error:', event.detail);
  }
</script>

<!-- Camera Flow Manager - handles all camera flow logic -->
<!-- No header or layout needed - pure camera experience -->
<CameraFlowManager
  {programId}
  {planReportId}
  {kind}
  {enableTutorial}
  {enableAutoCorrection}
  on:capture={handleFlowCapture}
  on:complete={handleFlowComplete}
  on:cancel={handleFlowCancel}
  on:error={handleFlowError}
/>

<style>
  /* All styles are now handled by individual components */
</style>
