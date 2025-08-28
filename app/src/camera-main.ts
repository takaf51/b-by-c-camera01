/**
 * カメラ専用アプリケーションのエントリーポイント
 * 確認画面から撮影、自動補正、送信までの一連の流れを提供
 */
import { mount } from 'svelte';
import './app.css';
import CameraOnlyApp from './CameraOnlyApp.svelte';
import { initializeExternalConfig } from './stores/externalConfig';

// MSWの初期化（開発環境でのみ）
async function initializeMocks() {
  const apiProfile = import.meta.env.VITE_API_PROFILE;

  // 開発環境では常にMSWを有効にする
  if (import.meta.env.DEV || apiProfile === 'mock') {
    const { startMocking } = await import('./mocks/browser');
    await startMocking();
    console.log('🔧 MSW started for camera-only app');
  }
}

// アプリケーションの初期化
async function initializeCameraApp() {
  // 外部設定の初期化
  initializeExternalConfig();
  
  // MSW初期化（必要に応じて）
  await initializeMocks();
  
  console.log('📱 Camera-only app initializing...');

  // カメラ専用アプリのマウント
  const app = mount(CameraOnlyApp, {
    target: document.getElementById('app')!,
  });

  console.log('✅ Camera-only app mounted successfully');
  return app;
}

// アプリケーション開始
initializeCameraApp().catch((error) => {
  console.error('❌ Failed to initialize camera app:', error);
});
