/**
 * MediaPipe Cache Service Worker Registration
 * 
 * 本番環境でMediaPipeのCDNリクエストをキャッシュするService Workerを登録
 */

export async function registerMediaPipeCacheWorker(): Promise<void> {
  // 本番環境のみ、かつService Workerをサポートしているブラウザのみ
  if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    // 既存のService Workerをチェック
    const registration = await navigator.serviceWorker.getRegistration('/mediapipe-cache-sw.js');
    
    if (registration) {
      console.log('✅ MediaPipe Cache Service Worker は既に登録されています');
      return;
    }

    // Service Workerを登録
    const reg = await navigator.serviceWorker.register('/mediapipe-cache-sw.js', {
      scope: '/'
    });

    console.log('🚀 MediaPipe Cache Service Worker を登録しました:', reg.scope);

    // アクティベーション待機
    if (reg.installing) {
      console.log('📦 MediaPipe Cache Service Worker をインストール中...');
      await new Promise<void>((resolve) => {
        const worker = reg.installing!;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            console.log('✅ MediaPipe Cache Service Worker がアクティブになりました');
            resolve();
          }
        });
      });
    } else if (reg.active) {
      console.log('✅ MediaPipe Cache Service Worker は既にアクティブです');
    }

  } catch (error) {
    console.error('❌ MediaPipe Cache Service Worker の登録に失敗:', error);
    // 失敗してもアプリは継続（CDNから直接読み込む）
  }
}

/**
 * Service Workerの登録を解除（トラブルシューティング用）
 */
export async function unregisterMediaPipeCacheWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/mediapipe-cache-sw.js');
    if (registration) {
      await registration.unregister();
      console.log('🗑️ MediaPipe Cache Service Worker を登録解除しました');
    }
  } catch (error) {
    console.error('❌ Service Worker の登録解除に失敗:', error);
  }
}
