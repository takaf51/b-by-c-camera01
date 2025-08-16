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
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });

  console.log('🔧 MSW: Mocking enabled');
  console.log('🔧 MSW: API_PROFILE =', import.meta.env.VITE_API_PROFILE);
  console.log('🔧 MSW: API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);
}
