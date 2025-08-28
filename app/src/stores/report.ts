/**
 * Report Store
 * レポート関連の状態管理
 */

import { writable } from 'svelte/store';
import { createReportUseCase } from '../usecases/ReportUseCase';
import { createReportRepository } from '../repositories/ReportRepository';
import { createHttpClientWithExternalConfig } from '../lib/http';
import type { ReportImage, FacePoints, ReportError } from '../domain/report';

// =============================================================================
// Store Types (コンポーネント層用)
// =============================================================================

export interface CameraReportImage {
  kind: 'before' | 'after';
  imageData: string;
  points?: CameraFacePoints;
}

export interface CameraFacePoints {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseTip: { x: number; y: number };
}

interface ReportStoreState {
  isUploading: boolean;
  reportId: number | null;
  error: string | null;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: ReportStoreState = {
  isUploading: false,
  reportId: null,
  error: null,
};

// =============================================================================
// Store Creation
// =============================================================================

function createReportStore() {
  const { subscribe, set, update } = writable<ReportStoreState>(initialState);

  // UseCase インスタンス（外部設定対応）
  const httpClient = createHttpClientWithExternalConfig(
    () => window.CameraSettings?.API_TOKEN || null,
    () => import.meta.env.VITE_PROGRAM_CODE,
    () => window.CameraSettings?.PLAN_CODE || 'MOCK_PLAN_CODE',
    window.CameraSettings?.API_ENDPOINT
  );
  const reportRepository = createReportRepository(httpClient);
  const reportUseCase = createReportUseCase(reportRepository);

  return {
    subscribe,

    /**
     * レポート画像を送信
     */
    async submitReport(
      programId: string,
      image: CameraReportImage
    ): Promise<void> {
      update(state => ({ ...state, isUploading: true, error: null }));

      try {
        // Store型からDomain型に変換
        const domainImage: ReportImage = {
          kind: image.kind,
          imageData: image.imageData,
          points: image.points
            ? {
                leftEye: image.points.leftEye,
                rightEye: image.points.rightEye,
                noseTip: image.points.noseTip,
              }
            : undefined,
        };

        const result = await reportUseCase.submitReport(
          programId,
          domainImage,
          initialState.reportId || undefined
        );

        update(state => ({
          ...state,
          reportId: result.report_id,
          isUploading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'レポート送信に失敗しました';
        update(state => ({
          ...state,
          isUploading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },

    /**
     * エラーをクリア
     */
    clearError() {
      update(state => ({ ...state, error: null }));
    },

    /**
     * ストアをリセット
     */
    reset() {
      set(initialState);
    },
  };
}

// =============================================================================
// Store Exports
// =============================================================================

export const reportStore = createReportStore();

// Derived stores
export const isReportUploading = writable(false);
export const reportError = writable<string | null>(null);
export const currentReportId = writable<number | null>(null);

// Store subscriptions for reactive updates
reportStore.subscribe(state => {
  isReportUploading.set(state.isUploading);
  reportError.set(state.error);
  currentReportId.set(state.reportId);
});
