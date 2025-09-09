/**
 * 外部設定システム
 * PHPアプリケーション側から設定を渡すためのストア
 * 既存のコードには影響を与えず、将来のPHP統合時に使用
 */
import { writable } from 'svelte/store';

interface ExternalConfig {
  apiEndpoint?: string;
  planCode?: string;
  planReportId?: number;
  kind?: 'before' | 'after';
  apiToken?: string;
  enableTutorial?: boolean;
}

// デフォルト設定（既存の動作を維持）
const defaultConfig: ExternalConfig = {
  apiEndpoint: undefined, // 未設定の場合は環境変数を使用
  planCode: undefined,
  planReportId: undefined,
  kind: undefined,
  apiToken: undefined,
  enableTutorial: undefined, // 未設定の場合は既存ロジックを使用
};

// 外部設定ストア
export const externalConfig = writable<ExternalConfig>(defaultConfig);

/**
 * 外部設定を初期化
 * window.CameraSettings または window.AppSettings から設定を読み込み
 */
export function initializeExternalConfig(): void {
  // グローバル設定オブジェクトを確認
  const settings = (window as any).CameraSettings || (window as any).AppSettings;
  
  if (settings) {
    console.log('📱 External config detected:', settings);
    
    externalConfig.set({
      apiEndpoint: settings.API_ENDPOINT,
      planCode: settings.PLAN_CODE,
      planReportId: settings.PLAN_REPORT_ID,
      kind: settings.KIND,
      apiToken: settings.API_TOKEN,
      enableTutorial: settings.ENABLE_TUTORIAL,
    });
  } else {
    console.log('📱 No external config found, using defaults');
  }
}

/**
 * 設定値を取得するヘルパー関数
 * 外部設定がある場合はそれを使用、なければ環境変数を使用
 */
export function getConfigValue(
  externalValue: string | number | undefined,
  envValue: string | undefined,
  defaultValue: string | number = ''
): string | number {
  if (externalValue !== undefined && externalValue !== null && externalValue !== '') {
    return externalValue;
  }
  if (envValue !== undefined && envValue !== null && envValue !== '') {
    return envValue;
  }
  return defaultValue;
}
