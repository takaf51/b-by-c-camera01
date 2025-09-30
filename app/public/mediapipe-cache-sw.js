/* eslint-disable */
/**
 * MediaPipe Asset Cache Service Worker
 * 
 * MediaPipeのCDNリクエストをインターセプトして、
 * IndexedDBにキャッシュされたデータで応答します。
 * これにより、ネットワークが遅い環境でも高速に動作します。
 */

const CACHE_DB_NAME = 'mediapipe-cache';
const CACHE_STORE_NAME = 'assets';
// CloudFrontのCDN URLにも対応
const MEDIAPIPE_CDN_PATTERN = /(cdn\.jsdelivr\.net\/npm\/@mediapipe\/face_mesh|d2a697hridziqi\.cloudfront\.net\/assets\/mediapipe)\//;

// IndexedDBを開く
function openCacheDB () {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// IndexedDBからアセットを取得
async function getAssetFromCache (filename) {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.get(filename);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('IndexedDBからの取得に失敗:', error);
    return null;
  }
}

// MIMEタイプを取得
function getMimeType (filename) {
  if (filename.endsWith('.wasm')) return 'application/wasm';
  if (filename.endsWith('.js')) return 'application/javascript';
  if (filename.endsWith('.binarypb')) return 'application/octet-stream';
  return 'application/octet-stream';
}

// fetchイベントをインターセプト
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // MediaPipeのCDNリクエストのみ処理
  if (!MEDIAPIPE_CDN_PATTERN.test(url)) {
    return; // 通常のfetchを実行
  }

  // ファイル名を抽出
  const filename = url.split('/').pop().split('?')[0];

  console.log(`🔍 MediaPipe SW: ${ filename }をインターセプト`);

  event.respondWith(
    (async () => {
      try {
        // IndexedDBからキャッシュを取得
        const cachedData = await getAssetFromCache(filename);

        if (cachedData) {
          console.log(`✅ MediaPipe SW: ${ filename }をキャッシュから返却`);
          return new Response(cachedData, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': getMimeType(filename),
              'Cache-Control': 'public, max-age=31536000',
              'X-Cache-Source': 'IndexedDB'
            }
          });
        }

        // キャッシュがない場合はCDNから取得
        console.log(`🌐 MediaPipe SW: ${ filename }をCDNから取得`);
        const response = await fetch(event.request);

        // 成功した場合はIndexedDBに保存（バックグラウンド）
        if (response.ok) {
          response.clone().arrayBuffer().then(async (data) => {
            try {
              const db = await openCacheDB();
              const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
              const store = transaction.objectStore(CACHE_STORE_NAME);

              const asset = {
                filename: filename,
                data: data,
                timestamp: Date.now(),
                version: '0.5.1675469794'
              };

              store.put(asset);
              console.log(`💾 MediaPipe SW: ${ filename }をIndexedDBに保存`);
            } catch (error) {
              console.warn(`⚠️ MediaPipe SW: ${ filename }の保存に失敗`, error);
            }
          });
        }

        return response;
      } catch (error) {
        console.error(`❌ MediaPipe SW: ${ filename }の取得に失敗`, error);
        // エラー時はCDNから直接取得を試みる
        return fetch(event.request);
      }
    })()
  );
});

// インストール時
self.addEventListener('install', (event) => {
  console.log('📦 MediaPipe Cache Service Worker installed');
  self.skipWaiting();
});

// アクティベーション時
self.addEventListener('activate', (event) => {
  console.log('🚀 MediaPipe Cache Service Worker activated');
  event.waitUntil(self.clients.claim());
});
