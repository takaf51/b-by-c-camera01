/**
 * AffineCorrection クラスの単体テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AffineCorrection, type PoseData, type CorrectionResult } from './AffineCorrection';

// Canvas API のモック
class MockCanvas {
  width = 640;
  height = 480;
  
  getContext() {
    return {
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
    };
  }
  
  toDataURL() {
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...'; // Mock base64 data
  }
}

// Image API のモック
class MockImage {
  width = 640;
  height = 480;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  set src(value: string) {
    // Mock successful image load
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

// グローバルモック設定
global.HTMLCanvasElement = MockCanvas as any;
global.Image = MockImage as any;

describe('AffineCorrection', () => {
  let affineCorrection: AffineCorrection;
  
  beforeEach(() => {
    affineCorrection = new AffineCorrection();
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(affineCorrection).toBeInstanceOf(AffineCorrection);
    });
  });

  describe('correctImage', () => {
    const mockPose: PoseData = {
      roll: 5.0,
      pitch: -10.0,
      yaw: 3.0,
    };

    const mockLandmarks = [
      null, // index 0
      { x: 0.5, y: 0.5 }, // index 1 (nose)
    ];

    const mockImageDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...';

    it('should correct image successfully with valid inputs', async () => {
      const result = await affineCorrection.correctImage(mockImageDataUrl, mockPose, mockLandmarks);
      
      expect(result).toBeDefined();
      expect(result.correctedImageUrl).toBeDefined();
      expect(result.correctionInfo).toBeDefined();
      expect(result.originalPose).toEqual(mockPose);
      expect(result.estimatedCorrectedPose).toBeDefined();
    });

    it('should work without landmarks', async () => {
      const result = await affineCorrection.correctImage(mockImageDataUrl, mockPose);
      
      expect(result).toBeDefined();
      expect(result.correctedImageUrl).toBeDefined();
    });

    it('should handle zero pose values', async () => {
      const zeroPose: PoseData = { roll: 0, pitch: 0, yaw: 0 };
      
      const result = await affineCorrection.correctImage(mockImageDataUrl, zeroPose, mockLandmarks);
      
      expect(result).toBeDefined();
      expect(result.originalPose).toEqual(zeroPose);
      expect(result.estimatedCorrectedPose.roll).toBeCloseTo(0, 1);
      expect(result.estimatedCorrectedPose.pitch).toBeCloseTo(0, 1);
      expect(result.estimatedCorrectedPose.yaw).toBeCloseTo(0, 1);
    });

    it('should handle extreme pose values', async () => {
      const extremePose: PoseData = { roll: 45, pitch: -30, yaw: 60 };
      
      const result = await affineCorrection.correctImage(mockImageDataUrl, extremePose, mockLandmarks);
      
      expect(result).toBeDefined();
      expect(result.originalPose).toEqual(extremePose);
      
      // 補正後の値は元の値より改善されている（絶対値が小さくなっている）
      expect(Math.abs(result.estimatedCorrectedPose.roll)).toBeLessThan(Math.abs(extremePose.roll));
      expect(Math.abs(result.estimatedCorrectedPose.pitch)).toBeLessThan(Math.abs(extremePose.pitch));
      expect(Math.abs(result.estimatedCorrectedPose.yaw)).toBeLessThan(Math.abs(extremePose.yaw));
    });

    it('should reject with invalid image data', async () => {
      // Image onerror をトリガーするモック
      const FailingImage = class extends MockImage {
        set src(value: string) {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
      };
      
      const originalImage = global.Image;
      global.Image = FailingImage as any;
      
      try {
        await expect(affineCorrection.correctImage('invalid-data', mockPose)).rejects.toThrow();
      } finally {
        global.Image = originalImage;
      }
    });
  });

  describe('correction parameters calculation', () => {
    it('should calculate correction parameters correctly', async () => {
      const pose: PoseData = { roll: 10, pitch: -5, yaw: 8 };
      const landmarks = [null, { x: 0.5, y: 0.5 }];
      
      const result = await affineCorrection.correctImage(
        'data:image/jpeg;base64,test',
        pose,
        landmarks
      );
      
      expect(result.correctionInfo.scaleX).toBeDefined();
      expect(result.correctionInfo.scaleY).toBeDefined();
      expect(result.correctionInfo.skewX).toBeDefined();
      expect(result.correctionInfo.skewY).toBeDefined();
      expect(result.correctionInfo.translateX).toBeDefined();
      expect(result.correctionInfo.translateY).toBeDefined();
      expect(result.correctionInfo.centerX).toBe(320); // 640 * 0.5
      expect(result.correctionInfo.centerY).toBe(240); // 480 * 0.5
    });

    it('should use image center when no landmarks provided', async () => {
      const pose: PoseData = { roll: 5, pitch: 5, yaw: 5 };
      
      const result = await affineCorrection.correctImage(
        'data:image/jpeg;base64,test',
        pose
      );
      
      expect(result.correctionInfo.centerX).toBe(320); // 640 / 2
      expect(result.correctionInfo.centerY).toBe(240); // 480 / 2
    });
  });

  describe('pose estimation', () => {
    it('should estimate improved pose correctly', async () => {
      const originalPose: PoseData = { roll: 20, pitch: -15, yaw: 12 };
      
      const result = await affineCorrection.correctImage(
        'data:image/jpeg;base64,test',
        originalPose
      );
      
      const estimated = result.estimatedCorrectedPose;
      
      // 補正により姿勢が改善されている
      expect(Math.abs(estimated.roll)).toBeLessThan(Math.abs(originalPose.roll));
      expect(Math.abs(estimated.pitch)).toBeLessThan(Math.abs(originalPose.pitch));
      expect(Math.abs(estimated.yaw)).toBeLessThan(Math.abs(originalPose.yaw));
      
      // 符号は維持される（方向は同じ）
      expect(Math.sign(estimated.roll)).toBe(Math.sign(originalPose.roll));
      expect(Math.sign(estimated.pitch)).toBe(Math.sign(originalPose.pitch));
      expect(Math.sign(estimated.yaw)).toBe(Math.sign(originalPose.yaw));
    });

    it('should handle negative pose values correctly', async () => {
      const negativePose: PoseData = { roll: -15, pitch: -20, yaw: -10 };
      
      const result = await affineCorrection.correctImage(
        'data:image/jpeg;base64,test',
        negativePose
      );
      
      const estimated = result.estimatedCorrectedPose;
      
      // 負の値も正しく改善される
      expect(estimated.roll).toBeGreaterThan(negativePose.roll); // より0に近づく
      expect(estimated.pitch).toBeGreaterThan(negativePose.pitch);
      expect(estimated.yaw).toBeGreaterThan(negativePose.yaw);
    });
  });

  describe('edge cases', () => {
    it('should handle very small pose values', async () => {
      const smallPose: PoseData = { roll: 0.1, pitch: -0.05, yaw: 0.2 };
      
      const result = await affineCorrection.correctImage(
        'data:image/jpeg;base64,test',
        smallPose
      );
      
      expect(result).toBeDefined();
      expect(result.estimatedCorrectedPose).toBeDefined();
    });

    it('should handle missing nose landmark gracefully', async () => {
      const landmarks = [null]; // No nose landmark
      const pose: PoseData = { roll: 5, pitch: 5, yaw: 5 };
      
      const result = await affineCorrection.correctImage(
        'data:image/jpeg;base64,test',
        pose,
        landmarks
      );
      
      // Should fall back to image center
      expect(result.correctionInfo.centerX).toBe(320);
      expect(result.correctionInfo.centerY).toBe(240);
    });
  });
});
