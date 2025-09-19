import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { initializeAuth } from './stores/auth';
import { initializeExternalConfig } from './stores/externalConfig';
import { cameraConfig } from './stores/cameraConfig';

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

  // MSW初期化（必要に応じて）
  await initializeMocks();

  // カメラ設定の初期化（バックグラウンドで実行）
  cameraConfig.loadConfig().catch(() => {
    // エラー時はデフォルト設定を使用（サイレント）
  });

  // 認証状態復元
  await initializeAuth();

  // Svelteアプリのマウント
  const app = mount(App, {
    target: document.getElementById('app')!,
  });

  return app;
}

// アプリ初期化実行
const app = await initializeApp();

export default app;
