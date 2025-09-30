// MSW ブラウザワーカー設定
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { isMediaPipeCdnUrl } from '../config/mediapipe';

// ワーカーを設定
export const worker = setupWorker(...handlers);

// 開発環境での起動
export async function startMocking() {
  if (typeof window === 'undefined') {
    return;
  }

  await worker.start({
    onUnhandledRequest: 'bypass', // デフォルトで全てバイパス
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });


}
