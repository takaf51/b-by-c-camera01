// Camera component type definitions

export interface CameraCaptureResult {
  imageData: string;
  landmarks: any;
  pose: any;
  timestamp: number;
  mode: 'before' | 'after';
}

export interface CameraConfig {
  mode: 'before' | 'after';
  mirrorMode?: boolean;
  showMesh?: boolean;
  autoCapture?: boolean;
  programId?: string;
}

export type CameraFlowType = 'tutorial' | 'skipTutorial' | 'afterOnly';

export type FlowStep = 'confirmation' | 'guide' | 'camera' | 'upload-complete';

// 姿勢ガイダンス関連のEnum
export enum PoseGuidanceDirection {
  TURN_LEFT = 'turn-left',
  TURN_RIGHT = 'turn-right',
  TILT_LEFT = 'tilt-left',
  TILT_RIGHT = 'tilt-right',
  LOOK_UP = 'look-up',
  LOOK_DOWN = 'look-down'
}

export enum PoseGuidanceType {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

// 姿勢ガイダンスのデータセット
export interface PoseGuidanceData {
  message: string;
  direction: PoseGuidanceDirection | null;
  type: PoseGuidanceType;
}

// 姿勢状態とガイダンスの対応マップ
export const POSE_GUIDANCE_MAP = {
  // Roll（傾き）
  rollPositive: {
    message: '頭を左に少し傾けてください',
    direction: PoseGuidanceDirection.TILT_LEFT,
    type: PoseGuidanceType.WARNING
  } as PoseGuidanceData,
  rollNegative: {
    message: '頭を右に少し傾けてください',
    direction: PoseGuidanceDirection.TILT_RIGHT,
    type: PoseGuidanceType.WARNING
  } as PoseGuidanceData,
  
  // Pitch（上下）
  pitchPositive: {
    message: '顔を少し下に向けてください',
    direction: PoseGuidanceDirection.LOOK_DOWN,
    type: PoseGuidanceType.WARNING
  } as PoseGuidanceData,
  pitchNegative: {
    message: '顔を少し上に向けてください',
    direction: PoseGuidanceDirection.LOOK_UP,
    type: PoseGuidanceType.WARNING
  } as PoseGuidanceData,
  
  // Yaw（左右）
  yawPositive: {
    message: '顔を左に向けてください',
    direction: PoseGuidanceDirection.TURN_LEFT,
    type: PoseGuidanceType.WARNING
  } as PoseGuidanceData,
  yawNegative: {
    message: '顔を右に向けてください',
    direction: PoseGuidanceDirection.TURN_RIGHT,
    type: PoseGuidanceType.WARNING
  } as PoseGuidanceData,
  
  // その他の状態
  perfect: {
    message: '完璧な姿勢です！この状態を保持してください',
    direction: null,
    type: PoseGuidanceType.SUCCESS
  } as PoseGuidanceData,
  tooFar: {
    message: 'カメラに近づいてください（顔が小さすぎます）',
    direction: null,
    type: PoseGuidanceType.ERROR
  } as PoseGuidanceData,
  lowQuality: {
    message: '顔全体をカメラに向けてください',
    direction: null,
    type: PoseGuidanceType.ERROR
  } as PoseGuidanceData
} as const;
