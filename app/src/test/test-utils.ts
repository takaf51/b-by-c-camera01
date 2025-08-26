/**
 * 2D補正機能テスト用のユーティリティ
 */

import type { PoseData, CorrectionResult } from '../lib/AffineCorrection';

/**
 * テスト用のモック画像データを生成
 */
export function createMockImageDataUrl(): string {
  // 実際の小さな画像データ（1x1 pixel JPEG）
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8H';
}

/**
 * テスト用の姿勢データを生成
 */
export function createMockPoseData(overrides: Partial<PoseData> = {}): PoseData {
  return {
    roll: 0,
    pitch: 0,
    yaw: 0,
    ...overrides,
  };
}

/**
 * テスト用のランドマークデータを生成
 */
export function createMockLandmarks(): any[] {
  // MediaPipeの468ポイントの簡易版（主要ポイントのみ）
  const landmarks = new Array(468).fill(null);
  
  // 鼻の先端（index 1）
  landmarks[1] = { x: 0.5, y: 0.5, z: 0.0 };
  
  // 左目（index 33）
  landmarks[33] = { x: 0.4, y: 0.4, z: -0.01 };
  
  // 右目（index 263）
  landmarks[263] = { x: 0.6, y: 0.4, z: -0.01 };
  
  // 左口角（index 61）
  landmarks[61] = { x: 0.45, y: 0.6, z: 0.0 };
  
  // 右口角（index 291）
  landmarks[291] = { x: 0.55, y: 0.6, z: 0.0 };
  
  return landmarks;
}

/**
 * テスト用の補正結果を生成
 */
export function createMockCorrectionResult(overrides: Partial<CorrectionResult> = {}): CorrectionResult {
  const originalPose = createMockPoseData({ roll: 10, pitch: -5, yaw: 8 });
  
  return {
    correctedImageUrl: createMockImageDataUrl(),
    correctionInfo: {
      scaleX: 1.0,
      skewX: 0.0,
      skewY: 0.0,
      scaleY: 1.0,
      translateX: 0,
      translateY: 0,
      centerX: 320,
      centerY: 240,
      rollCorrection: originalPose.roll,
      pitchCorrection: originalPose.pitch,
      yawCorrection: originalPose.yaw,
    },
    originalPose,
    estimatedCorrectedPose: createMockPoseData({
      roll: originalPose.roll * 0.2, // 80%改善
      pitch: originalPose.pitch * 0.4, // 60%改善
      yaw: originalPose.yaw * 0.3, // 70%改善
    }),
    ...overrides,
  };
}

/**
 * 姿勢角度の改善度を計算
 */
export function calculateImprovementPercentage(original: PoseData, corrected: PoseData): {
  roll: number;
  pitch: number;
  yaw: number;
  overall: number;
} {
  const rollImprovement = Math.abs(original.roll) > 0 
    ? (Math.abs(original.roll) - Math.abs(corrected.roll)) / Math.abs(original.roll) * 100
    : 100;
  
  const pitchImprovement = Math.abs(original.pitch) > 0
    ? (Math.abs(original.pitch) - Math.abs(corrected.pitch)) / Math.abs(original.pitch) * 100
    : 100;
  
  const yawImprovement = Math.abs(original.yaw) > 0
    ? (Math.abs(original.yaw) - Math.abs(corrected.yaw)) / Math.abs(original.yaw) * 100
    : 100;
  
  const overall = (rollImprovement + pitchImprovement + yawImprovement) / 3;
  
  return {
    roll: Math.max(0, Math.min(100, rollImprovement)),
    pitch: Math.max(0, Math.min(100, pitchImprovement)),
    yaw: Math.max(0, Math.min(100, yawImprovement)),
    overall: Math.max(0, Math.min(100, overall)),
  };
}

/**
 * Canvas要素のモックを作成
 */
export function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  
  const mockContext = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  };
  
  canvas.getContext = vi.fn().mockReturnValue(mockContext);
  canvas.toDataURL = vi.fn().mockReturnValue(createMockImageDataUrl());
  
  return canvas;
}

/**
 * Video要素のモックを作成
 */
export function createMockVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  
  Object.defineProperties(video, {
    videoWidth: { value: 640, writable: true },
    videoHeight: { value: 480, writable: true },
    readyState: { value: 4, writable: true }, // HAVE_ENOUGH_DATA
    currentTime: { value: 0, writable: true },
    duration: { value: 100, writable: true },
  });
  
  return video;
}

/**
 * MediaStream のモックを作成
 */
export function createMockMediaStream(): MediaStream {
  const mockTrack = {
    kind: 'video',
    stop: vi.fn(),
    enabled: true,
    readyState: 'live',
  };
  
  return {
    getTracks: () => [mockTrack],
    getVideoTracks: () => [mockTrack],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    active: true,
    id: 'mock-stream-id',
  } as any;
}

/**
 * テスト用のアサーション関数
 */
export const assertions = {
  /**
   * 補正結果が有効かチェック
   */
  isValidCorrectionResult(result: CorrectionResult): boolean {
    return !!(
      result.correctedImageUrl &&
      result.correctionInfo &&
      result.originalPose &&
      result.estimatedCorrectedPose &&
      result.correctedImageUrl.startsWith('data:image/')
    );
  },

  /**
   * 姿勢が改善されているかチェック
   */
  isPoseImproved(original: PoseData, corrected: PoseData): boolean {
    return (
      Math.abs(corrected.roll) <= Math.abs(original.roll) &&
      Math.abs(corrected.pitch) <= Math.abs(original.pitch) &&
      Math.abs(corrected.yaw) <= Math.abs(original.yaw)
    );
  },

  /**
   * 画像データURLが有効かチェック
   */
  isValidImageDataUrl(dataUrl: string): boolean {
    return dataUrl.startsWith('data:image/') && dataUrl.includes('base64,');
  },
};

/**
 * テスト環境での遅延実行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Vitest用のグローバルvi変数の型定義
 * (テストファイルで直接importしないでも使用可能)
 */
declare global {
  const vi: typeof import('vitest').vi;
}
