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
    onUnhandledRequest: (req) => {
      // MediaPipeのCDNリクエストは無視
      const url = req.url;
      if (url.includes('cdn.jsdelivr.net/npm/@mediapipe/') || 
          url.includes('face_mesh') || 
          url.includes('.wasm') || 
          url.includes('.data')) {
        return;
      }
      console.warn('[MSW] Unhandled request:', url);
    },
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });

  console.log('🔧 MSW: Mocking enabled');
  console.log('🔧 MSW: API_PROFILE =', import.meta.env.VITE_API_PROFILE);
  console.log('🔧 MSW: API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);
}
