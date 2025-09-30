import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { initializeAuth, auth } from './stores/auth';
import { get } from 'svelte/store';
import { initializeExternalConfig } from './stores/externalConfig';
import { cameraConfig } from './stores/cameraConfig';
import { MediaPipeAssetManager } from './lib/MediaPipeAssetManager';

// MediaPipeアセットマネージャーのグローバルインスタンス
let globalAssetManager: MediaPipeAssetManager;

// PHP側から呼び出せるグローバルインターフェース
declare global {
  interface Window {
    bbyc: {
      mediaPipe: {
        preloadAssets: () => boolean;
        getDownloadStatus: () => { isDownloading: boolean; promise: Promise<void> | null };
        clearCache: () => Promise<void>;
        getCacheSize: () => Promise<number>;
      };
    };
  }
}

// MSWの初期化（開発環境でのみ）
async function initializeMocks() {
  const apiProfile = import.meta.env.VITE_API_PROFILE;

  // 開発環境では常にMSWを有効にする
  if (import.meta.env.DEV || apiProfile === 'mock') {
    const { startMocking } = await import('./mocks/browser');
    await startMocking();
  }
}

// アプリの初期化
async function initializeApp() {
  // 外部設定の初期化（既存の動作には影響なし）
  initializeExternalConfig();

  // Service Workerは使用しない（IndexedDB + Blob URLで十分高速）
  // registerMediaPipeCacheWorker().catch(err => {
  //   console.warn('MediaPipe Cache SW登録失敗（CDNから直接読み込みます）:', err);
  // });

  // MSW初期化（必要に応じて）
  await initializeMocks();

  // カメラ設定の初期化（バックグラウンドで実行）
  cameraConfig.loadConfig().catch(() => {
    // エラー時はデフォルト設定を使用（サイレント）
  });

  // 認証状態復元
  await initializeAuth();

  // MediaPipeアセットマネージャーを初期化
  globalAssetManager = new MediaPipeAssetManager();
  await globalAssetManager.init();

  // MediaPipeアセットの事前ダウンロードを即座に実行
  // （認証状態に関係なく、アプリ起動時に必ず実行）
  console.log('🚀 アプリ起動時MediaPipeアセット取得を開始');
  globalAssetManager.preloadAllAssets().catch(error => {
    console.warn('MediaPipeアセットの事前ダウンロードに失敗:', error);
  });

  // PHP側から呼び出せるグローバルAPIを設定
  window.bbyc = {
    mediaPipe: {
      preloadAssets: () => {
        console.log('🚀 外部からMediaPipeアセット取得をトリガー');
        return globalAssetManager.preloadAssetsAsync();
      },
      getDownloadStatus: () => {
        return globalAssetManager.getDownloadStatus();
      },
      clearCache: async () => {
        console.log('🗑️ 外部からMediaPipeアセットキャッシュクリアをトリガー');
        return globalAssetManager.clearCache();
      },
      getCacheSize: async () => {
        const size = await globalAssetManager.getCacheSize();
        console.log(`📊 MediaPipeアセットキャッシュサイズ: ${Math.round(size / 1024)}KB`);
        return size;
      }
    }
  };

  // Svelteアプリのマウント
  const app = mount(App, {
    target: document.getElementById('app')!,
  });

  return app;
}

// アプリ初期化実行
const app = await initializeApp();

export default app;
