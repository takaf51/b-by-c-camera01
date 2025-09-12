<!--
  AfterCamera - After撮影専用コンポーネント
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import BaseCameraEngine from '../core/BaseCameraEngine.svelte';
  import AfterPoseGuidance from '../guidance/AfterPoseGuidance.svelte';
  import { AfterCameraController } from '../../../controllers/AfterCameraController';
  import { createReportUseCase } from '../../../usecases/ReportUseCase';
  import { createReportRepository } from '../../../repositories/ReportRepository';
  import { createHttpClientWithExternalConfig } from '../../../lib/http';
  import {
    fetchBeforePointsWithHttpClient,
    fetchBeforePoints,
    fetchBeforeInfo,
  } from '../../../lib/BeforeReferenceAPI';
  import { PoseReference } from '../../../lib/PoseReference';
  import { PoseComparator } from '../../../lib/PoseComparator';
  import type { CameraCaptureResult } from '../../../types/camera';
  import type { ReferenceData } from '../../../lib/PoseReference';
  import type { PoseComparison } from '../../../lib/PoseComparator';
  import type { ReportCreateResponse } from '../../../domain/report';

  const dispatch = createEventDispatcher();

  // Props
  export let programId: string = '';
  export let planReportId: string | null = null;
  export let mirrorMode: boolean = true;
  export let showMesh: boolean = true;
  export let autoCapture: boolean = true;
  export let enableExpressionDetection: boolean | undefined = undefined;

  // Event handlers

  export let onCancel: () => void = () => {};
  export let onError: (error: Error) => void = () => {};

  // Controller setup - 環境変数を優先してエンドポイントを決定
  const httpClient = createHttpClientWithExternalConfig(
    () => (window as any).CameraSettings?.API_TOKEN || null,
    () => import.meta.env.VITE_PROGRAM_CODE,
    () => (window as any).CameraSettings?.PLAN_CODE || 'MOCK_PLAN_CODE',
    (window as any).CameraSettings?.API_ENDPOINT ||
      import.meta.env.VITE_API_BASE_URL ||
      ''
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

  // Face detection data
  let currentGuidance: any = null;

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

    const reference = poseReference.getReference();
    const referencePose = reference?.pose;
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
      let beforeInfo = null;

      // MSW環境では新しいAPI仕様を使用、本番環境では設定に応じて分岐
      if (import.meta.env.VITE_API_PROFILE === 'mock') {
        // MSW環境: HttpClientを使って新しいAPI仕様でBefore情報を取得
        beforeInfo = await fetchBeforePointsWithHttpClient(
          planCode,
          httpClient
        );
      } else {
        // 本番環境: 新しいAPIを試してから旧APIにフォールバック
        beforeInfo = await fetchBeforePointsWithHttpClient(
          planCode,
          httpClient
        );
        if (!beforeInfo && planReportId) {
          beforeInfo = await fetchBeforeInfo(planReportId);
        }
      }

      if (beforeInfo) {
        // Before情報が取得できた場合、PoseReferenceに設定
        poseReference.setReference(
          beforeInfo.pose,
          beforeInfo.image,
          beforeInfo.landmarks
        );

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

      // After撮影後はパラメータ付きで詳細ページURLにリダイレクト
      if (response.return_base_url) {
        const redirectUrl = buildRedirectUrl(response);
        window.location.href = redirectUrl;
      }
    } catch (error) {
      // エラー時の処理
      const err = error instanceof Error ? error : new Error(String(error));
      onError(err);
      dispatch('error', { error: err });
    }
  }

  /**
   * リダイレクトURLを組み立て
   */
  function buildRedirectUrl(response: ReportCreateResponse): string {
    let url = response.return_base_url;

    // 共通パラメータ追加
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}day=${response.day}`;

    // 条件に応じてパラメータ追加
    if (response.last_image_uploaded === true) {
      url += '&last_image_uploaded=1';
    }

    if (response.score_fix_immediately === true) {
      url += '&score_fix_immediately=1';
    }

    return url;
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
  mode="after"
  {programId}
  {mirrorMode}
  {showMesh}
  {autoCapture}
  {enableExpressionDetection}
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
    guidance={currentGuidance}
    onPoseCompare={comparePose}
  />
</BaseCameraEngine>
