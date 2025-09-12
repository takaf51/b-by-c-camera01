<!--
  BeforeCamera - Before撮影専用コンポーネント
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import BaseCameraEngine from '../core/BaseCameraEngine.svelte';
  import BeforePoseGuidance from '../guidance/BeforePoseGuidance.svelte';
  import VideoRecommendationModal from '../../ui/modals/VideoRecommendationModal.svelte';
  import { BeforeCameraController } from '../../../controllers/BeforeCameraController';
  import { createReportUseCase } from '../../../usecases/ReportUseCase';
  import { createReportRepository } from '../../../repositories/ReportRepository';
  import { createHttpClientWithExternalConfig } from '../../../lib/http';
  import type { CameraCaptureResult } from '../../../types/camera';
  import type { ReportCreateResponse } from '../../../domain/report';

  const dispatch = createEventDispatcher();

  // Props
  export let programId: string = '';
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
  const controller = new BeforeCameraController(reportUseCase);

  // Camera engine reference
  let baseCameraEngine: any;

  // Face detection data
  let currentGuidance: any = null;

  // Modal state
  let showVideoRecommendationModal = false;
  let pendingResponse: ReportCreateResponse | null = null;

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

      // 仕様に基づく条件分岐
      if (response.kind === 'before' && response.new_subscription === true) {
        // 初回のBefore送信後なので「続けて動画を見て施術してみましょう」メッセージダイアログを表示
        pendingResponse = response;
        showVideoRecommendationModal = true;
      } else {
        // その他の場合はパラメータ付きで詳細ページURLにリダイレクト
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

  /**
   * 動画推奨モーダルでの「後で見る」選択
   */
  function handleWatchLater() {
    showVideoRecommendationModal = false;
    if (pendingResponse) {
      window.location.href = pendingResponse.return_base_url;
      pendingResponse = null;
    }
  }

  /**
   * 動画推奨モーダルでの「視聴する」選択
   */
  function handleWatchNow(event: CustomEvent) {
    showVideoRecommendationModal = false;
    if (pendingResponse) {
      const { day } = event.detail;
      const separator = pendingResponse.return_base_url.includes('?')
        ? '&'
        : '?';
      const url = `${pendingResponse.return_base_url}${separator}show_dialog=1&day=${day}`;
      window.location.href = url;
      pendingResponse = null;
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
  <!-- Before専用のガイダンスUI -->
  <BeforePoseGuidance
    pose={currentPose}
    landmarks={currentFaceLandmarks}
    guidance={currentGuidance}
  />
</BaseCameraEngine>

<!-- 動画推奨モーダル -->
<VideoRecommendationModal
  isOpen={showVideoRecommendationModal}
  day={pendingResponse?.day || 1}
  on:watchLater={handleWatchLater}
  on:watchNow={handleWatchNow}
/>
