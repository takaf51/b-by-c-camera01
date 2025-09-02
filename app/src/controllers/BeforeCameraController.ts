/**
 * BeforeCameraController
 * Before撮影時の固有処理を管理
 */

import type { CameraCaptureResult } from '../types/camera';
import type { ReportUseCase } from '../usecases/ReportUseCase';
import type { BeforeCaptureData } from '../domain/report';

export class BeforeCameraController {
  constructor(private reportUseCase: ReportUseCase) {}

  /**
   * Before撮影完了時の処理
   */
  async handleCapture(
    result: CameraCaptureResult,
    programId: string
  ): Promise<void> {
    // README.md構造に合わせたデータを作成
    const beforeCaptureData = this.createBeforeCaptureData(result);

    // reportUseCaseを使って送信
    await this.reportUseCase.submitReport(programId, {
      kind: 'before',
      imageData: result.imageData,
      points: beforeCaptureData,
    });
  }

  /**
   * CameraCaptureResultからBeforeCaptureDataを作成
   * @param result - カメラ撮影結果
   */
  private createBeforeCaptureData(result: CameraCaptureResult): BeforeCaptureData {
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
      correctionResult: result.correctionResult,
    };
  }
}
