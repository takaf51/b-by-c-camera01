<!--
  AfterCamera - After撮影専用コンポーネント
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import BaseCameraEngine from './BaseCameraEngine.svelte';
  import AfterPoseGuidance from './AfterPoseGuidance.svelte';
  import { AfterCameraController } from '../controllers/AfterCameraController';
  import { createReportUseCase } from '../usecases/ReportUseCase';
  import { createReportRepository } from '../repositories/ReportRepository';
  import { createHttpClientWithExternalConfig } from '../lib/http';
  import {
    fetchBeforePointsWithHttpClient,
    fetchBeforePoints,
    fetchBeforeInfo,
  } from '../lib/BeforeReferenceAPI';
  import { PoseReference } from '../lib/PoseReference';
  import { PoseComparator } from '../lib/PoseComparator';
  import type { CameraCaptureResult } from '../types/camera';
  import type { ReferenceData } from '../lib/PoseReference';
  import type { PoseComparison } from '../lib/PoseComparator';

  const dispatch = createEventDispatcher();

  // Props
  export let programId: string = '';
  export let planReportId: string | null = null;
  export let mirrorMode: boolean = true;
  export let showMesh: boolean = true;
  export let autoCapture: boolean = true;

  // Event handlers
  export let onCapture: (result: CameraCaptureResult) => void = () => {};
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
  const controller = new AfterCameraController(reportUseCase);

  // Camera engine reference
  let baseCameraEngine: any;

  // Before reference management (AfterCameraの責任)
  let poseReference: PoseReference;
  let poseComparator: PoseComparator;
  let beforeReference: ReferenceData | null = null;
  let currentComparison: PoseComparison | null = null;

  // AfterCamera初期化時にBefore参照データを取得
  onMount(async () => {
    poseReference = new PoseReference();
    poseComparator = new PoseComparator();
    await loadBeforeReference();
  });

  /**
   * 現在のポーズとBefore参照ポーズを比較（AfterCameraの責任）
   */
  function comparePose(currentPose: {
    roll: number;
    pitch: number;
    yaw: number;
  }): PoseComparison | null {
    if (!poseReference.hasReference()) return null;

    const referencePose = poseReference.getDisplayPose();
    if (!referencePose) return null;

    currentComparison = poseComparator.comparePoses(referencePose, currentPose);
    return currentComparison;
  }

  /**
   * Before参照データの取得（AfterCameraの責任）
   */
  async function loadBeforeReference(): Promise<void> {
    // planCodeを取得（優先順位: window設定 > planReportId）
    const planCode =
      (window as any).CameraSettings?.PLAN_CODE ||
      `plan-${planReportId}` ||
      '2025-07-29-trial'; // デフォルト

    try {
      // 新しいAPI仕様でBefore情報を取得（HttpClient使用）
      let beforeInfo = await fetchBeforePointsWithHttpClient(
        planCode,
        httpClient
      );

      // 新しいAPIで取得できない場合は旧APIを試行
      if (!beforeInfo && planReportId) {
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

        beforeReference = poseReference.getReference();
      }
    } catch (error) {
      // エラーが発生してもAfter撮影は続行可能（参照なしモード）
    }
  }

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

      // After撮影後は return_base_url にリダイレクト
      if (response.return_base_url) {
        window.location.href = response.return_base_url;
        return; // リダイレクト後は処理を終了
      }

      // return_base_url がない場合は従来通りの処理
      onCapture(result);
      dispatch('capture', { result });
    } catch (error) {
      // エラー時の処理
      const err = error instanceof Error ? error : new Error(String(error));
      onError(err);
      dispatch('error', { error: err });
    }
  }

  function handleFaceDetected(event: CustomEvent) {
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
  mode="after"
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
  <!-- After専用のガイダンスUI -->
  <AfterPoseGuidance
    pose={currentPose}
    landmarks={currentFaceLandmarks}
    {beforeReference}
    {currentComparison}
    onPoseCompare={comparePose}
  />
</BaseCameraEngine>
