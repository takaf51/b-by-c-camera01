// カメラ設定のSvelteストア

import { writable, derived, type Readable } from 'svelte/store';
import type { CameraConfiguration } from '../domain/cameraConfig';
import { DEFAULT_CAMERA_CONFIG } from '../domain/cameraConfig';
import { CameraConfigUseCase } from '../usecases/CameraConfigUseCase';
import { ApiCameraConfigRepository } from '../repositories/CameraConfigRepository';
import { createHttpClient } from '../lib/http';

// ストアの状態
interface CameraConfigState {
  config: CameraConfiguration;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// 初期状態
const initialState: CameraConfigState = {
  config: DEFAULT_CAMERA_CONFIG,
  isLoading: false,
  isLoaded: false,
  error: null,
  lastUpdated: null,
};

// 内部ストア
const cameraConfigStore = writable<CameraConfigState>(initialState);

// ユースケースのインスタンス
const httpClient = createHttpClient();
const repository = new ApiCameraConfigRepository(httpClient);
const useCase = new CameraConfigUseCase(repository);

// アクション
const actions = {
  /**
   * カメラ設定を非同期で取得
   */
  async loadConfig(): Promise<void> {
    cameraConfigStore.update(state => ({
      ...state,
      isLoading: true,
      error: null,
    }));

    try {
      const config = await useCase.getCameraConfig();
      
      cameraConfigStore.update(state => ({
        ...state,
        config,
        isLoading: false,
        isLoaded: true,
        error: null,
        lastUpdated: new Date(),
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      cameraConfigStore.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage,
        // エラー時もデフォルト設定を使用
        config: DEFAULT_CAMERA_CONFIG,
        isLoaded: true,
        lastUpdated: new Date(),
      }));

    }
  },

  /**
   * カメラ設定を強制的に再取得
   */
  async refreshConfig(): Promise<void> {
    cameraConfigStore.update(state => ({
      ...state,
      isLoading: true,
      error: null,
    }));

    try {
      const config = await useCase.refreshCameraConfig();
      
      cameraConfigStore.update(state => ({
        ...state,
        config,
        isLoading: false,
        isLoaded: true,
        error: null,
        lastUpdated: new Date(),
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      cameraConfigStore.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage,
        config: DEFAULT_CAMERA_CONFIG,
        isLoaded: true,
        lastUpdated: new Date(),
      }));

    }
  },

  /**
   * エラーをクリア
   */
  clearError(): void {
    cameraConfigStore.update(state => ({
      ...state,
      error: null,
    }));
  },

  /**
   * ストアをリセット
   */
  reset(): void {
    cameraConfigStore.set(initialState);
  },
};

// 外部公開用の読み取り専用ストア
export const cameraConfig = {
  subscribe: cameraConfigStore.subscribe,
  ...actions,
};

// 便利な派生ストア
export const currentConfig: Readable<CameraConfiguration> = derived(
  cameraConfigStore,
  $store => $store.config
);

export const isConfigLoading: Readable<boolean> = derived(
  cameraConfigStore,
  $store => $store.isLoading
);

export const isConfigLoaded: Readable<boolean> = derived(
  cameraConfigStore,
  $store => $store.isLoaded
);

export const configError: Readable<string | null> = derived(
  cameraConfigStore,
  $store => $store.error
);

export const configLastUpdated: Readable<Date | null> = derived(
  cameraConfigStore,
  $store => $store.lastUpdated
);

// 個別設定項目へのアクセス
export const poseTolerances = derived(
  currentConfig,
  $config => $config.poseTolerances
);

export const faceQualityThresholds = derived(
  currentConfig,
  $config => $config.faceQualityThresholds
);

export const detectionTimingSettings = derived(
  currentConfig,
  $config => $config.detectionTimingSettings
);

export const poseCalculationConfig = derived(
  currentConfig,
  $config => $config.poseCalculationConfig
);

export const mediaPipeConfig = derived(
  currentConfig,
  $config => $config.mediaPipeConfig
);
