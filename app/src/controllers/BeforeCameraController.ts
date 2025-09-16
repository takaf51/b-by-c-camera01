/**
 * BeforeCameraController
 * Before撮影時の固有処理を管理
 */

import type { CameraCaptureResult } from '../types/camera';
import type { ReportUseCase } from '../usecases/ReportUseCase';
import type { UnifiedCaptureData, KeyPoints, ReportCreateResponse } from '../domain/report';

export class BeforeCameraController {
  constructor(private reportUseCase: ReportUseCase) {}

  /**
   * Before撮影完了時の処理
   */
  async handleCapture(
    result: CameraCaptureResult,
    programId: string
  ): Promise<ReportCreateResponse> {
    // 新しい統一データ構造を作成
    const unifiedCaptureData = this.createUnifiedCaptureData(result);

    // reportUseCaseを使って送信し、レスポンスを返す
    const response = await this.reportUseCase.submitReport(programId, {
      kind: 'before',
      imageData: result.imageData,
      points: unifiedCaptureData,
    });

    return response;
  }

  /**
   * CameraCaptureResultから統一データ構造を作成
   * @param result - カメラ撮影結果
   */
  private createUnifiedCaptureData(result: CameraCaptureResult): UnifiedCaptureData {
    // keyPointsを抽出
    const keyPoints = this.extractKeyPoints(result.landmarks);

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
      keyPoints,
    };
  }

  /**
   * MediaPipeの顔座標からキーポイントを抽出
   * @param landmarks - MediaPipeの顔座標データ
   */
  private extractKeyPoints(landmarks: any): KeyPoints {
    if (!landmarks || !Array.isArray(landmarks)) {
      // デフォルト値を返す
      return {
        leftEye: { x: 0, y: 0 },
        rightEye: { x: 0, y: 0 },
        noseTip: { x: 0, y: 0 },
      };
    }

    try {
      // MediaPipeの特定のランドマークポイントを使用
      const leftEye = landmarks[33]; // 左目
      const rightEye = landmarks[263]; // 右目
      const noseTip = landmarks[1]; // 鼻先

      if (!leftEye || !rightEye || !noseTip) {
        // デフォルト値を返す
        return {
          leftEye: { x: 0, y: 0 },
          rightEye: { x: 0, y: 0 },
          noseTip: { x: 0, y: 0 },
        };
      }

      // 0-1の正規化座標から実際のピクセル座標へ変換
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
      // エラー時はデフォルト値を返す
      return {
        leftEye: { x: 0, y: 0 },
        rightEye: { x: 0, y: 0 },
        noseTip: { x: 0, y: 0 },
      };
    }
  }
}
