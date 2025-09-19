// カメラ設定機能のテスト

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  validateCameraConfig,
  mergeCameraConfig,
  DEFAULT_CAMERA_CONFIG,
  getDeviceType,
  getDevicePitchAdjustment
} from '../domain/cameraConfig';
import { MockCameraConfigRepository } from '../repositories/CameraConfigRepository';
import { CameraConfigUseCase } from '../usecases/CameraConfigUseCase';

describe('Camera Configuration', () => {
  describe('Domain Functions', () => {
    it('should validate valid camera config', () => {
      const validConfig = {
        poseTolerances: {
          rollDegrees: 15.0,
          pitchDegrees: 12.0,
          yawDegrees: 8.0,
        },
        mediaPipeConfig: {
          maxDetectedFaces: 1,
          minDetectionConfidence: 0.8,
          minTrackingConfidence: 0.8,
        },
      };

      const result = validateCameraConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid camera config', () => {
      const invalidConfig = {
        poseTolerances: {
          rollDegrees: -5.0, // Invalid: negative value
          pitchDegrees: 50.0, // Invalid: too large
          yawDegrees: 8.0,
        },
      };

      const result = validateCameraConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should merge configurations correctly', () => {
      const partialConfig = {
        poseTolerances: {
          rollDegrees: 5.0,
        },
        mediaPipeConfig: {
          minDetectionConfidence: 0.9,
        },
      };

      const merged = mergeCameraConfig(DEFAULT_CAMERA_CONFIG, partialConfig);
      
      expect(merged.poseTolerances.rollDegrees).toBe(5.0);
      expect(merged.poseTolerances.pitchDegrees).toBe(DEFAULT_CAMERA_CONFIG.poseTolerances.pitchDegrees);
      expect(merged.mediaPipeConfig.minDetectionConfidence).toBe(0.9);
      expect(merged.mediaPipeConfig.minTrackingConfidence).toBe(DEFAULT_CAMERA_CONFIG.mediaPipeConfig.minTrackingConfidence);
    });

    it('should detect device type correctly', () => {
      // Mock window.innerWidth
      const originalInnerWidth = window.innerWidth;
      
      // Test mobile
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      expect(getDeviceType()).toBe('mobile');
      
      // Test tablet
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
      expect(getDeviceType()).toBe('tablet');
      
      // Test desktop
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      expect(getDeviceType()).toBe('desktop');
      
      // Restore original value
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
    });

    it('should calculate device pitch adjustment', () => {
      const pitchCalibration = {
        baseOffsetDegrees: -65,
        mobileAdjustment: 15,
        tabletAdjustment: 10,
        desktopAdjustment: 0,
      };

      // Mock different device types
      const originalInnerWidth = window.innerWidth;
      
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      expect(getDevicePitchAdjustment(pitchCalibration)).toBe(15);
      
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
      expect(getDevicePitchAdjustment(pitchCalibration)).toBe(10);
      
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      expect(getDevicePitchAdjustment(pitchCalibration)).toBe(0);
      
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
    });
  });

  describe('Repository', () => {
    it('should return mock configuration', async () => {
      const mockConfig = {
        ...DEFAULT_CAMERA_CONFIG,
        poseTolerances: {
          rollDegrees: 5.0,
          pitchDegrees: 5.0,
          yawDegrees: 5.0,
        },
      };

      const repository = new MockCameraConfigRepository(mockConfig);
      const result = await repository.getCameraConfig();

      expect(result.success).toBe(true);
      expect(result.config).toEqual(mockConfig);
    });
  });

  describe('UseCase', () => {
    let useCase: CameraConfigUseCase;
    let mockRepository: MockCameraConfigRepository;

    beforeEach(() => {
      mockRepository = new MockCameraConfigRepository(DEFAULT_CAMERA_CONFIG);
      useCase = new CameraConfigUseCase(mockRepository);
    });

    it('should get camera configuration successfully', async () => {
      const config = await useCase.getCameraConfig();
      
      expect(config).toBeDefined();
      expect(config.poseTolerances).toBeDefined();
      expect(config.mediaPipeConfig).toBeDefined();
      expect(config.detectionTimingSettings).toBeDefined();
    });

    it('should generate configuration summary', () => {
      const summary = useCase.getConfigSummary(DEFAULT_CAMERA_CONFIG);
      
      expect(summary).toContain('Camera Configuration Summary');
      expect(summary).toContain('Pose Tolerances');
      expect(summary).toContain('MediaPipe');
    });
  });
});
