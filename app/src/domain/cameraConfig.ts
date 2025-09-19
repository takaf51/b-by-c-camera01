// カメラ設定関連のドメインモデル

/**
 * 姿勢許容値の設定
 */
export interface PoseTolerances {
  rollDegrees: number;
  pitchDegrees: number;
  yawDegrees: number;
}

/**
 * 顔品質しきい値の設定
 */
export interface FaceQualityThresholds {
  minRelativeSize: number;
  minQualityScore: number;
}

/**
 * 検出タイミング設定
 */
export interface DetectionTimingSettings {
  stabilityFrameCount: number;
  autoCaptureDelaySeconds: number;
  guidanceUpdateIntervalMs: number;
}

/**
 * ピッチ調整設定
 */
export interface PitchCalibration {
  baseOffsetDegrees: number;
  mobileAdjustment: number;
  tabletAdjustment: number;
  desktopAdjustment: number;
}

/**
 * 品質計算設定
 */
export interface QualityCalculation {
  faceSizeMultiplier: number;
  distanceRange: {
    min: number;
    max: number;
  };
}

/**
 * 姿勢計算設定
 */
export interface PoseCalculationConfig {
  pitchCalibration: PitchCalibration;
  yawSensitivity: number;
  qualityCalculation: QualityCalculation;
}

/**
 * MediaPipe設定
 */
export interface MediaPipeConfig {
  maxDetectedFaces: number;
  enableRefinedLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  selfieMode: boolean;
  staticImageMode: boolean;
}

/**
 * カメラ設定全体
 */
export interface CameraConfiguration {
  poseTolerances: PoseTolerances;
  faceQualityThresholds: FaceQualityThresholds;
  detectionTimingSettings: DetectionTimingSettings;
  poseCalculationConfig: PoseCalculationConfig;
  mediaPipeConfig: MediaPipeConfig;
}

/**
 * カメラ設定の取得結果
 */
export interface CameraConfigResult {
  success: boolean;
  config?: CameraConfiguration;
  error?: string;
  timestamp?: Date;
}

/**
 * バリデーション結果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * カメラ設定のデフォルト値
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfiguration = {
  poseTolerances: {
    rollDegrees: 10,
    pitchDegrees: 10,
    yawDegrees: 10,
  },
  faceQualityThresholds: {
    minRelativeSize: 0.15,
    minQualityScore: 0.6,
  },
  detectionTimingSettings: {
    stabilityFrameCount: 5,
    autoCaptureDelaySeconds: 3,
    guidanceUpdateIntervalMs: 100,
  },
  poseCalculationConfig: {
    pitchCalibration: {
      baseOffsetDegrees: -65,
      mobileAdjustment: 15,
      tabletAdjustment: 10,
      desktopAdjustment: 0,
    },
    yawSensitivity: 500,
    qualityCalculation: {
      faceSizeMultiplier: 2,
      distanceRange: {
        min: 0.5,
        max: 2,
      },
    },
  },
  mediaPipeConfig: {
    maxDetectedFaces: 1,
    enableRefinedLandmarks: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
    selfieMode: false,
    staticImageMode: false,
  },
};

/**
 * カメラ設定のバリデーション関数
 */
export function validateCameraConfig(config: Partial<CameraConfiguration>): ConfigValidationResult {
  const errors: string[] = [];

  if (config.poseTolerances) {
    const { rollDegrees, pitchDegrees, yawDegrees } = config.poseTolerances;
    if (rollDegrees <= 0 || rollDegrees > 45) {
      errors.push('rollDegrees must be between 0 and 45');
    }
    if (pitchDegrees <= 0 || pitchDegrees > 45) {
      errors.push('pitchDegrees must be between 0 and 45');
    }
    if (yawDegrees <= 0 || yawDegrees > 45) {
      errors.push('yawDegrees must be between 0 and 45');
    }
  }

  if (config.faceQualityThresholds) {
    const { minRelativeSize, minQualityScore } = config.faceQualityThresholds;
    if (minRelativeSize <= 0 || minRelativeSize >= 1) {
      errors.push('minRelativeSize must be between 0 and 1');
    }
    if (minQualityScore <= 0 || minQualityScore >= 1) {
      errors.push('minQualityScore must be between 0 and 1');
    }
  }

  if (config.detectionTimingSettings) {
    const { stabilityFrameCount, autoCaptureDelaySeconds, guidanceUpdateIntervalMs } = config.detectionTimingSettings;
    if (stabilityFrameCount <= 0) {
      errors.push('stabilityFrameCount must be positive');
    }
    if (autoCaptureDelaySeconds <= 0) {
      errors.push('autoCaptureDelaySeconds must be positive');
    }
    if (guidanceUpdateIntervalMs <= 0) {
      errors.push('guidanceUpdateIntervalMs must be positive');
    }
  }

  if (config.mediaPipeConfig) {
    const { maxDetectedFaces, minDetectionConfidence, minTrackingConfidence } = config.mediaPipeConfig;
    if (maxDetectedFaces <= 0) {
      errors.push('maxDetectedFaces must be positive');
    }
    if (minDetectionConfidence < 0 || minDetectionConfidence > 1) {
      errors.push('minDetectionConfidence must be between 0 and 1');
    }
    if (minTrackingConfidence < 0 || minTrackingConfidence > 1) {
      errors.push('minTrackingConfidence must be between 0 and 1');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * カメラ設定のマージ（デフォルト値と部分的な設定を統合）
 */
export function mergeCameraConfig(
  baseConfig: CameraConfiguration,
  partialConfig: Partial<CameraConfiguration>
): CameraConfiguration {
  return {
    poseTolerances: {
      ...baseConfig.poseTolerances,
      ...partialConfig.poseTolerances,
    },
    faceQualityThresholds: {
      ...baseConfig.faceQualityThresholds,
      ...partialConfig.faceQualityThresholds,
    },
    detectionTimingSettings: {
      ...baseConfig.detectionTimingSettings,
      ...partialConfig.detectionTimingSettings,
    },
    poseCalculationConfig: {
      pitchCalibration: {
        ...baseConfig.poseCalculationConfig.pitchCalibration,
        ...partialConfig.poseCalculationConfig?.pitchCalibration,
      },
      yawSensitivity: partialConfig.poseCalculationConfig?.yawSensitivity ?? baseConfig.poseCalculationConfig.yawSensitivity,
      qualityCalculation: {
        ...baseConfig.poseCalculationConfig.qualityCalculation,
        ...partialConfig.poseCalculationConfig?.qualityCalculation,
      },
    },
    mediaPipeConfig: {
      ...baseConfig.mediaPipeConfig,
      ...partialConfig.mediaPipeConfig,
    },
  };
}

/**
 * デバイス判定（既存のロジックから抽出）
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const screenWidth = window.innerWidth;
  if (screenWidth <= 480) {
    return 'mobile';
  } else if (screenWidth <= 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * デバイス別のピッチ調整値を取得
 */
export function getDevicePitchAdjustment(pitchCalibration: PitchCalibration): number {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case 'mobile':
      return pitchCalibration.mobileAdjustment;
    case 'tablet':
      return pitchCalibration.tabletAdjustment;
    case 'desktop':
      return pitchCalibration.desktopAdjustment;
    default:
      return pitchCalibration.desktopAdjustment;
  }
}

/**
 * カメラ設定エラークラス
 */
export class CameraConfigError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'CameraConfigError';
  }
}

export class ConfigValidationError extends CameraConfigError {
  constructor(message: string, public validationErrors: string[]) {
    super(message, 'CONFIG_VALIDATION_ERROR');
  }
}

export class ConfigFetchError extends CameraConfigError {
  constructor(message: string, statusCode?: number) {
    super(message, 'CONFIG_FETCH_ERROR', statusCode);
  }
}
