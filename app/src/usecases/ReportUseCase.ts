/**
 * Report UseCase
 * レポート関連のビジネスロジック
 */

import type {
  ReportCreateRequest,
  ReportCreateResponse,
  ReportImage,
  FacePoints,
  BeforeCaptureData,
  ReportError,
} from '../domain/report';
import { validateReportImage, validateFacePoints, validateBeforeCaptureData } from '../domain/report';
import type { ReportRepository } from '../repositories/ReportRepository';
import { get } from 'svelte/store';
import { externalConfig } from '../stores/externalConfig';

// =============================================================================
// UseCase Interface
// =============================================================================

export interface ReportUseCase {
  /**
   * レポート画像を送信（バリデーション付き）
   */
  submitReport(
    programId: string,
    image: ReportImage,
    existingReportId?: number
  ): Promise<ReportCreateResponse>;
}

// =============================================================================
// Implementation
// =============================================================================

export class ReportUseCaseImpl implements ReportUseCase {
  constructor(private reportRepository: ReportRepository) {}

  async submitReport(
    programId: string,
    image: ReportImage,
    existingReportId?: number
  ): Promise<ReportCreateResponse> {
    // 入力バリデーション
    const imageValidation = validateReportImage(image);
    if (!imageValidation.isValid) {
      const error: ReportError = new Error(
        imageValidation.errors[0]
      ) as ReportError;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // 顔座標のバリデーション（存在する場合）
    if (image.points) {
      // BeforeCaptureDataかFacePointsかを判定してバリデーション
      if ('pose' in image.points && 'landmarks' in image.points) {
        // BeforeCaptureDataの場合
        const pointsValidation = validateBeforeCaptureData(image.points as BeforeCaptureData);
        if (!pointsValidation.isValid) {
          const error: ReportError = new Error(
            pointsValidation.errors[0]
          ) as ReportError;
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
      } else if ('leftEye' in image.points && 'rightEye' in image.points) {
        // FacePointsの場合
        const pointsValidation = validateFacePoints(image.points as FacePoints);
        if (!pointsValidation.isValid) {
          const error: ReportError = new Error(
            pointsValidation.errors[0]
          ) as ReportError;
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
      }
    }

    // プログラムIDのバリデーション
    if (!programId || programId.trim() === '') {
      const error: ReportError = new Error(
        'プログラムIDが必要です'
      ) as ReportError;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    try {
      // 外部設定からplanReportIdを取得し、existingReportIdより優先
      const config = get(externalConfig);
      const reportId = config.planReportId || existingReportId;
      
      const request: ReportCreateRequest = {
        programId: programId.trim(),
        image,
        reportId,
      };

      const result = await this.reportRepository.createReport(request);

      return result;
    } catch (error) {
      // ビジネスロジックレベルでのエラーハンドリング
      if (error instanceof Error && 'code' in error) {
        throw error; // 既知のエラーはそのまま
      }

      const reportError: ReportError = new Error(
        'レポートの送信に失敗しました'
      ) as ReportError;
      reportError.code = 'SUBMIT_FAILED';
      throw reportError;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createReportUseCase(
  reportRepository: ReportRepository
): ReportUseCase {
  return new ReportUseCaseImpl(reportRepository);
}
