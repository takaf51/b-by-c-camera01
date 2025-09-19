// カメラ設定取得のリポジトリインターフェース

import type { CameraConfiguration, CameraConfigResult } from '../domain/cameraConfig';
import type { HttpClient } from '../lib/http';

/**
 * カメラ設定取得のリポジトリインターフェース
 */
export interface ICameraConfigRepository {
  /**
   * カメラ設定を取得する
   * @returns Promise<CameraConfigResult> 設定取得結果
   */
  getCameraConfig(): Promise<CameraConfigResult>;

  /**
   * カメラ設定をキャッシュする（オプション）
   * @param config キャッシュする設定
   */
  setCachedConfig?(config: CameraConfiguration): void;

  /**
   * キャッシュされた設定を取得する（オプション）
   * @returns CameraConfiguration | null キャッシュされた設定またはnull
   */
  getCachedConfig?(): CameraConfiguration | null;

  /**
   * キャッシュをクリアする（オプション）
   */
  clearCache?(): void;
}

/**
 * HTTP APIを使用したカメラ設定リポジトリの実装
 */
export class ApiCameraConfigRepository implements ICameraConfigRepository {
  private cachedConfig: CameraConfiguration | null = null;
  private cacheExpiry: Date | null = null;
  private readonly cacheExpiryMs: number = 5 * 60 * 1000; // 5分

  constructor(
    private readonly httpClient: HttpClient,
    private readonly apiEndpoint: string = '/setting/camera'
  ) {}

  async getCameraConfig(): Promise<CameraConfigResult> {
    try {
      // キャッシュチェック
      if (this.cachedConfig && this.cacheExpiry && new Date() < this.cacheExpiry) {
        return {
          success: true,
          config: this.cachedConfig,
          timestamp: new Date(),
        };
      }

      // API呼び出し
      const config = await this.httpClient.get<CameraConfiguration>(this.apiEndpoint);

      // キャッシュに保存
      this.setCachedConfig(config);

      return {
        success: true,
        config,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  setCachedConfig(config: CameraConfiguration): void {
    this.cachedConfig = config;
    this.cacheExpiry = new Date(Date.now() + this.cacheExpiryMs);
  }

  getCachedConfig(): CameraConfiguration | null {
    if (this.cachedConfig && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cachedConfig;
    }
    return null;
  }

  clearCache(): void {
    this.cachedConfig = null;
    this.cacheExpiry = null;
  }
}

/**
 * モック用のカメラ設定リポジトリ実装
 */
export class MockCameraConfigRepository implements ICameraConfigRepository {
  constructor(private readonly mockConfig: CameraConfiguration) {}

  async getCameraConfig(): Promise<CameraConfigResult> {
    // モックなので少し遅延を追加してAPIコールを模擬
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      config: this.mockConfig,
      timestamp: new Date(),
    };
  }

  setCachedConfig(config: CameraConfiguration): void {
    // モックでは何もしない
  }

  getCachedConfig(): CameraConfiguration | null {
    return this.mockConfig;
  }

  clearCache(): void {
    // モックでは何もしない
  }
}
