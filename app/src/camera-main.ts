/**
 * カメラ専用アプリケーションのエントリーポイント
 * 確認画面から撮影、自動補正、送信までの一連の流れを提供
 */
import { mount } from 'svelte';
import './app.css';
import CameraOnlyApp from './CameraOnlyApp.svelte';
import { initializeExternalConfig } from './stores/externalConfig';

// アプリケーションの初期化
async function initializeCameraApp() {
  // 外部設定の初期化
  initializeExternalConfig();
  
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
