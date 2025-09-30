/* eslint-disable @typescript-eslint/no-explicit-any */

interface MediaPipeAsset {
  filename: string;
  data: ArrayBuffer;
  timestamp: number;
  version: string;
}

export class MediaPipeAssetManager {
  private dbName = 'mediapipe-cache';
  private storeName = 'assets';
  private version = '0.5.1675469794'; // MediaPipeのバージョン
  private db: any = null; // IDBDatabase
  private isDownloading = false; // ダウンロード中フラグ
  private downloadPromise: Promise<void> | null = null; // ダウンロード Promise

  // 事前取得すべきアセット一覧
  // MediaPipeが実際に読み込むファイルをすべて含める
  private requiredAssets = [
    'face_mesh_solution_packed_assets.data',
    'face_mesh_solution_simd_wasm_bin.wasm',
    'face_mesh_solution_packed_assets_loader.js',
    'face_mesh_solution_simd_wasm_bin.js',  // loaderスクリプト
    'face_mesh.binarypb'  // モデルデータ
  ];

  async init(): Promise<void> {
    // ブラウザ環境チェック
    if (typeof window === 'undefined' || !(window as any).indexedDB) {
      throw new Error('IndexedDB is not available');
    }

    // 永続ストレージをリクエスト（Safari対策）
    await this.requestPersistentStorage();

    return new Promise((resolve, reject) => {
      const request = (window as any).indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'filename' });
        }
      };
    });
  }

  // 永続ストレージのリクエスト（Safari 7日間制限対策）
  private async requestPersistentStorage(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).navigator && (window as any).navigator.storage && 'persist' in (window as any).navigator.storage) {
      try {
        const persistent = await (window as any).navigator.storage.persist();
        if (persistent) {
          console.log('✅ 永続ストレージが有効になりました');
        } else {
          console.warn('⚠️ 永続ストレージのリクエストが拒否されました（Safari等では7日間で削除される可能性があります）');
        }
      } catch (error) {
        console.warn('永続ストレージのリクエストに失敗:', error);
      }
    } else {
      console.warn('このブラウザは永続ストレージをサポートしていません');
    }
  }

  // 非同期でダウンロードを開始（即座に戻る）
  preloadAssetsAsync(): boolean {
    if (this.isDownloading) {
      console.log('📥 MediaPipeアセットダウンロード既に実行中');
      return false; // 既に実行中
    }

    console.log('🚀 MediaPipeアセットの非同期ダウンロードを開始');
    this.isDownloading = true;
    
    // バックグラウンドで実行（戻り値を待たない）
    this.downloadPromise = this.preloadAllAssets()
      .catch(error => {
        console.error('MediaPipeアセットの非同期ダウンロードに失敗:', error);
      })
      .finally(() => {
        this.isDownloading = false;
      });

    return true; // 開始成功
  }

  // ダウンロード状況を確認
  getDownloadStatus(): { isDownloading: boolean; promise: Promise<void> | null } {
    return {
      isDownloading: this.isDownloading,
      promise: this.downloadPromise
    };
  }

  // ログイン時などに実行：全アセットを事前ダウンロード
  async preloadAllAssets(): Promise<void> {
    if (!this.db) await this.init();
    
    console.log('🚀 MediaPipeアセットの事前ダウンロードを開始');
    const startTime = Date.now();
    let downloadedCount = 0;
    let cachedCount = 0;
    
    for (const filename of this.requiredAssets) {
      try {
        // 既にキャッシュされているかチェック
        const cached = await this.getAsset(filename);
        if (cached) {
          console.log(`✅ 既にキャッシュ済み: ${filename}`);
          cachedCount++;
          continue;
        }

        // ダウンロードして保存
        console.log(`📥 ダウンロード中: ${filename} (${downloadedCount + 1}/${this.requiredAssets.length - cachedCount})`);
        const url = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${filename}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.arrayBuffer();
        await this.saveAsset(filename, data);
        downloadedCount++;
        console.log(`✅ 保存完了: ${filename} (${Math.round(data.byteLength / 1024)}KB)`);
        
      } catch (error) {
        console.error(`❌ アセットの事前ダウンロードに失敗: ${filename}`, error);
        // 個別の失敗は続行（必須でないファイルもあるため）
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`🎉 MediaPipeアセットの事前ダウンロード完了 (${duration}ms, 新規:${downloadedCount}件, キャッシュ済み:${cachedCount}件)`);
  }

  // IndexedDBから取得
  private async getAsset(filename: string): Promise<ArrayBuffer | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(filename);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as MediaPipeAsset | undefined;
        if (result && result.version === this.version) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  }

  // IndexedDBに保存（publicメソッドに変更 - 外部からも保存できるように）
  async saveAsset(filename: string, data: ArrayBuffer): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const asset: MediaPipeAsset = {
        filename,
        data,
        timestamp: Date.now(),
        version: this.version
      };
      
      const request = store.put(asset);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // カメラ起動時に使用：ローカルデータからBlob URLを作成
  async createLocalFileUrl(filename: string): Promise<string | null> {
    const data = await this.getAsset(filename);
    if (!data) return null;

    if (typeof window === 'undefined' || !(window as any).Blob || !(window as any).URL) {
      console.warn('Blob または URL API が利用できません');
      return null;
    }

    const mimeType = this.getMimeType(filename);
    const blob = new (window as any).Blob([data], { type: mimeType });
    return (window as any).URL.createObjectURL(blob);
  }

  private getMimeType(filename: string): string {
    if (filename.endsWith('.wasm')) return 'application/wasm';
    if (filename.endsWith('.js')) return 'application/javascript';
    return 'application/octet-stream';
  }

  // キャッシュのクリア（デバッグ用）
  async clearCache(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('🗑️ MediaPipeアセットキャッシュをクリアしました');
        resolve();
      };
    });
  }

  // キャッシュサイズの取得（デバッグ用）
  async getCacheSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const assets = request.result as MediaPipeAsset[];
        const totalSize = assets.reduce((sum, asset) => sum + asset.data.byteLength, 0);
        resolve(totalSize);
      };
    });
  }
}
