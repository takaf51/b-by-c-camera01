/**
 * BeforeCameraController
 * Before撮影時の固有処理を管理
 */

import type { CameraCaptureResult } from '../types/camera';
import type { ReportUseCase } from '../usecases/ReportUseCase';
import type { BeforeCaptureData, ReportCreateResponse } from '../domain/report';

export class BeforeCameraController {
  constructor(private reportUseCase: ReportUseCase) {}

  /**
   * Before撮影完了時の処理
   */
  async handleCapture(
    result: CameraCaptureResult,
    programId: string
  ): Promise<ReportCreateResponse> {
    // README.md構造に合わせたデータを作成
    const beforeCaptureData = this.createBeforeCaptureData(result);

    // reportUseCaseを使って送信し、レスポンスを返す
    const response = await this.reportUseCase.submitReport(programId, {
      kind: 'before',
      imageData: result.imageData,
      points: beforeCaptureData,
    });

    return response;
  }

  /**
   * CameraCaptureResultからBeforeCaptureDataを作成
   * @param result - カメラ撮影結果
   */
  private createBeforeCaptureData(result: CameraCaptureResult): BeforeCaptureData {
    // correctionResultからcorrectedImageUrlを除外
    const sanitizedCorrectionResult = this.sanitizeCorrectionResult(result.correctionResult);

    return {
      pose: {
        roll: result.pose?.roll || 0,
        pitch: result.pose?.pitch || 0,
        yaw: result.pose?.yaw || 0,
        distance: result.pose?.distance,
        quality: result.pose?.quality,
        faceSize: result.pose?.faceSize,
      },
      landmarks: Array.isArray(result.landmarks) ? result.landmarks : [],
      correctionResult: sanitizedCorrectionResult,
    };
  }

  /**
   * correctionResultからcorrectedImageUrlを除外
   * @param correctionResult - 元のcorrectionResult
   */
  private sanitizeCorrectionResult(correctionResult: any): any {
    if (!correctionResult) return undefined;
    
    // correctedImageUrlを除外した新しいオブジェクトを作成
    const { correctedImageUrl, ...sanitizedResult } = correctionResult;
    
    return sanitizedResult;
  }
}
