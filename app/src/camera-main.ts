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

  // 開発環境またはmockプロファイルでMSWを有効にする
  if (import.meta.env.DEV || apiProfile === 'mock') {
    const { startMocking } = await import('./mocks/browser');
    await startMocking();
  }
}

// ビューポート高さの動的調整（古いブラウザ対応）
function setupViewportHeight() {
  // dvhサポートをチェック
  if (!CSS.supports('height', '100dvh')) {
    console.log('🔧 dvh not supported, using JavaScript fallback');
    
    function setCustomVH() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setCustomVH();
    window.addEventListener('resize', setCustomVH);
    window.addEventListener('orientationchange', setCustomVH);
  } else {
    console.log('✅ dvh supported, using native CSS');
  }
}

// アプリケーションの初期化
async function initializeCameraApp() {
  // ビューポート高さ設定（最初に実行）
  setupViewportHeight();
  
  // 外部設定の初期化
  initializeExternalConfig();
  
  // MSW初期化（必要に応じて）
  await initializeMocks();
  


  // カメラ専用アプリのマウント
  const app = mount(CameraOnlyApp, {
    target: document.getElementById('app')!,
  });


  return app;
}

// アプリケーション開始
initializeCameraApp().catch((error) => {
  console.error('❌ Failed to initialize camera app:', error);
});
