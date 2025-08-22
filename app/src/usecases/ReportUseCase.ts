/**
 * Report UseCase
 * レポート関連のビジネスロジック
 */

import type { 
  ReportCreateRequest, 
  ReportCreateResponse, 
  ReportImage,
  FacePoints,
  ReportError 
} from '../domain/report';
import { validateReportImage, validateFacePoints } from '../domain/report';
import type { ReportRepository } from '../repositories/ReportRepository';

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
      const error: ReportError = new Error(imageValidation.errors[0]) as ReportError;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // 顔座標のバリデーション（存在する場合）
    if (image.points) {
      const pointsValidation = validateFacePoints(image.points);
      if (!pointsValidation.isValid) {
        const error: ReportError = new Error(pointsValidation.errors[0]) as ReportError;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
    }

    // プログラムIDのバリデーション
    if (!programId || programId.trim() === '') {
      const error: ReportError = new Error('プログラムIDが必要です') as ReportError;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    try {
      const request: ReportCreateRequest = {
        programId: programId.trim(),
        image,
        reportId: existingReportId,
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

export function createReportUseCase(reportRepository: ReportRepository): ReportUseCase {
  return new ReportUseCaseImpl(reportRepository);
}
