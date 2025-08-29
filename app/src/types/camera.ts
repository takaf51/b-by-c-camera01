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
