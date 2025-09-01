/**
 * AfterCameraController
 * After撮影時の固有処理を管理
 */

import type { CameraCaptureResult } from '../types/camera';
import type { ReportUseCase } from '../usecases/ReportUseCase';
import type { CameraFacePoints } from '../stores/report';

export class AfterCameraController {
  constructor(private reportUseCase: ReportUseCase) {}

  /**
   * After撮影完了時の処理
   */
  async handleCapture(
    result: CameraCaptureResult,
    programId: string
  ): Promise<void> {
    // 顔座標を抽出
    const points = this.extractFacePoints(result.landmarks);

    // reportUseCaseを使って送信
    await this.reportUseCase.submitReport(programId, {
      kind: 'after',
      imageData: result.imageData,
      points,
    });
  }

  /**
   * MediaPipeの顔座標からAPI用の座標情報を抽出
   * @param landmarks - MediaPipeの顔座標データ
   */
  private extractFacePoints(landmarks: any): CameraFacePoints | undefined {
    if (!landmarks || !Array.isArray(landmarks)) {
      return undefined;
    }

    try {
      // MediaPipeの特定のランドマークポイントを使用
      const leftEye = landmarks[33]; // 左目
      const rightEye = landmarks[263]; // 右目
      const noseTip = landmarks[1]; // 鼻先

      if (!leftEye || !rightEye || !noseTip) {
        return undefined;
      }

      // 0-1の正規化座標から実際のピクセル座標へ変換
      // 固定解像度を使用（実際の実装では画像サイズを渡す必要がある）
      const imageWidth = 640;
      const imageHeight = 480;

      return {
        leftEye: {
          x: Math.round(leftEye.x * imageWidth),
          y: Math.round(leftEye.y * imageHeight),
        },
        rightEye: {
          x: Math.round(rightEye.x * imageWidth),
          y: Math.round(rightEye.y * imageHeight),
        },
        noseTip: {
          x: Math.round(noseTip.x * imageWidth),
          y: Math.round(noseTip.y * imageHeight),
        },
      };
      } catch {
        return undefined;
      }
  }
}
