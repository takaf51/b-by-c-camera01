// カメラ設定取得のユースケース

import type { ICameraConfigRepository } from '../repositories/CameraConfigRepository';
import type { 
  CameraConfiguration, 
  CameraConfigResult,
  ConfigValidationResult 
} from '../domain/cameraConfig';
import { 
  DEFAULT_CAMERA_CONFIG, 
  validateCameraConfig, 
  mergeCameraConfig,
  ConfigFetchError,
  ConfigValidationError 
} from '../domain/cameraConfig';

/**
 * カメラ設定取得のユースケース
 */
export class CameraConfigUseCase {
  constructor(private readonly repository: ICameraConfigRepository) {}

  /**
   * カメラ設定を取得し、バリデーション済みの設定を返す
   * エラー時はデフォルト設定にフォールバック
   */
  async getCameraConfig(): Promise<CameraConfiguration> {
    try {
      const result = await this.repository.getCameraConfig();

      if (!result.success || !result.config) {
        return DEFAULT_CAMERA_CONFIG;
      }

      // 取得した設定をバリデーション
      const validation = validateCameraConfig(result.config);
      if (!validation.isValid) {
        return DEFAULT_CAMERA_CONFIG;
      }

      // デフォルト設定とマージして完全な設定を生成
      const mergedConfig = mergeCameraConfig(DEFAULT_CAMERA_CONFIG, result.config);

      return mergedConfig;
    } catch (error) {
      return DEFAULT_CAMERA_CONFIG;
    }
  }

  /**
   * カメラ設定を強制的に再取得（キャッシュクリア）
   */
  async refreshCameraConfig(): Promise<CameraConfiguration> {
    // キャッシュクリア
    if (this.repository.clearCache) {
      this.repository.clearCache();
    }

    return this.getCameraConfig();
  }

  /**
   * 現在のキャッシュされた設定を取得（APIコールなし）
   */
  getCachedConfig(): CameraConfiguration | null {
    if (this.repository.getCachedConfig) {
      return this.repository.getCachedConfig();
    }
    return null;
  }

  /**
   * カメラ設定を更新（将来拡張用）
   */
  async updateCameraConfig(config: Partial<CameraConfiguration>): Promise<CameraConfigResult> {
    // バリデーション
    const validation = validateCameraConfig(config);
    if (!validation.isValid) {
      throw new ConfigValidationError(
        'Invalid camera configuration provided',
        validation.errors
      );
    }

    // 現在の設定と新しい設定をマージ
    const currentConfig = await this.getCameraConfig();
    const updatedConfig = mergeCameraConfig(currentConfig, config);

    // 更新後の設定もバリデーション
    const finalValidation = validateCameraConfig(updatedConfig);
    if (!finalValidation.isValid) {
      throw new ConfigValidationError(
        'Updated configuration is invalid',
        finalValidation.errors
      );
    }

    // キャッシュ更新
    if (this.repository.setCachedConfig) {
      this.repository.setCachedConfig(updatedConfig);
    }

    return {
      success: true,
      config: updatedConfig,
      timestamp: new Date(),
    };
  }

  /**
   * デバッグ用：設定の詳細を文字列で返す
   */
  getConfigSummary(config: CameraConfiguration): string {
    return [
      '=== Camera Configuration Summary ===',
      `Pose Tolerances: Roll=${config.poseTolerances.rollDegrees}°, Pitch=${config.poseTolerances.pitchDegrees}°, Yaw=${config.poseTolerances.yawDegrees}°`,
      `Face Quality: MinSize=${config.faceQualityThresholds.minRelativeSize}, MinQuality=${config.faceQualityThresholds.minQualityScore}`,
      `Detection Timing: StabilityFrames=${config.detectionTimingSettings.stabilityFrameCount}, AutoCaptureDelay=${config.detectionTimingSettings.autoCaptureDelaySeconds}s`,
      `MediaPipe: MaxFaces=${config.mediaPipeConfig.maxDetectedFaces}, DetectionConf=${config.mediaPipeConfig.minDetectionConfidence}, TrackingConf=${config.mediaPipeConfig.minTrackingConfidence}`,
      '======================================',
    ].join('\n');
  }
}
