<!--
  BeforeCamera - Before撮影専用コンポーネント
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BaseCameraEngine from '../core/BaseCameraEngine.svelte';
  import BeforePoseGuidance from '../guidance/BeforePoseGuidance.svelte';
  import { BeforeCameraController } from '../../../controllers/BeforeCameraController';
  import { createReportUseCase } from '../../../usecases/ReportUseCase';
  import { createReportRepository } from '../../../repositories/ReportRepository';
  import { createHttpClientWithExternalConfig } from '../../../lib/http';
  import type { CameraCaptureResult } from '../../../types/camera';

  const dispatch = createEventDispatcher();

  // Props
  export let programId: string = '';
  export let mirrorMode: boolean = true;
  export let showMesh: boolean = true;
  export let autoCapture: boolean = true;

  // Event handlers

  export let onCancel: () => void = () => {};
  export let onError: (error: Error) => void = () => {};

  // Controller setup
  const httpClient = createHttpClientWithExternalConfig(
    () => (window as any).CameraSettings?.API_TOKEN || null,
    () => import.meta.env.VITE_PROGRAM_CODE,
    () => (window as any).CameraSettings?.PLAN_CODE || 'MOCK_PLAN_CODE',
    (window as any).CameraSettings?.API_ENDPOINT
  );
  const reportRepository = createReportRepository(httpClient);
  const reportUseCase = createReportUseCase(reportRepository);
  const controller = new BeforeCameraController(reportUseCase);

  // Camera engine reference
  let baseCameraEngine: any;

  // Face detection data
  let currentGuidance: any = null;

  // Public methods
  export async function startCamera(): Promise<void> {
    if (baseCameraEngine) {
      await baseCameraEngine.startCamera();
    }
  }

  export function stopCamera(): void {
    if (baseCameraEngine) {
      baseCameraEngine.stopCamera();
    }
  }

  export async function captureManually(): Promise<CameraCaptureResult | null> {
    if (baseCameraEngine) {
      return await baseCameraEngine.captureManually();
    }
    return null;
  }

  export function reset(): void {
    if (baseCameraEngine) {
      baseCameraEngine.reset();
    }
  }

  async function handleCapture(result: CameraCaptureResult) {
    try {
      // Controller経由で処理し、レスポンスを取得
      const response = await controller.handleCapture(result, programId);

      // Before撮影後は return_base_url にリダイレクト
      window.location.href = response.return_base_url;
    } catch (error) {
      // エラー時の処理
      const err = error instanceof Error ? error : new Error(String(error));
      onError(err);
      dispatch('error', { error: err });
    }
  }

  function handleFaceDetected(event: CustomEvent) {
    const { guidance } = event.detail;
    currentGuidance = guidance;

    // イベントを上位に転送
    dispatch('face:detected', event.detail);
  }

  function handleCancel() {
    onCancel();
    dispatch('cancel');
  }

  function handleError(error: Error) {
    onError(error);
    dispatch('error', { error });
  }
</script>

<BaseCameraEngine
  bind:this={baseCameraEngine}
  mode="before"
  {programId}
  {mirrorMode}
  {showMesh}
  {autoCapture}
  onCapture={handleCapture}
  onCancel={handleCancel}
  onError={handleError}
  on:camera:ready
  on:camera:stopped
  on:face:detected={handleFaceDetected}
  on:capture:success
  on:capture:cancel
  let:currentPose
  let:currentFaceLandmarks
  let:isReady
>
  <!-- Before専用のガイダンスUI -->
  <BeforePoseGuidance
    pose={currentPose}
    landmarks={currentFaceLandmarks}
    guidance={currentGuidance}
  />
</BaseCameraEngine>
