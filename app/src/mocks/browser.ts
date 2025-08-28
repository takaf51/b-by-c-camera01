// MSW ブラウザワーカー設定
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// ワーカーを設定
export const worker = setupWorker(...handlers);

// 開発環境での起動
export async function startMocking() {
  if (typeof window === 'undefined') {
    return;
  }

  await worker.start({
    onUnhandledRequest: (req, print) => {
      const url = req.url;

      // 以下のリクエストは全て無視（MSWでインターセプトしない）
      if (
        // MediaPipeのCDNリクエスト
        url.includes('cdn.jsdelivr.net/npm/@mediapipe/') ||
        url.includes('face_mesh') ||
        url.includes('.wasm') ||
        url.includes('.data') ||
        // Viteの開発サーバーリクエスト
        url.includes('/@') ||
        url.includes('/__vite') ||
        url.includes('/node_modules/') ||
        // 静的アセット
        /\.(js|css|ts|svelte|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)(\?.*)?$/.test(
          url
        )
      ) {
        return 'bypass';
      }

      // API関連パス以外は警告（認証パスは除く）
      if (
        !url.includes('/api/') &&
        !url.includes('/plan/') &&
        !url.includes('/login/') &&
        !url.includes('/register/')
      ) {
        console.warn('[MSW] Unhandled non-API request:', url);
        return 'bypass';
      }
    },
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });

  console.log('🔧 MSW: Mocking enabled');
  console.log('🔧 MSW: API_PROFILE =', import.meta.env.VITE_API_PROFILE);
  console.log('🔧 MSW: API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);
}
