import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000, // お好みのポート番号に変更
    // host: true, // 外部からアクセスを許可する場合
  },
  build: {
    manifest: true, // PHP統合用にmanifest.jsonを出力
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),      // 完全版アプリ
        camera: resolve(__dirname, 'camera.html')    // カメラ専用版
      },
      output: {
        // エントリーポイント別にファイル名を制御
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name === 'camera' ? 'camera' : 'index';
          return `assets/${name}-[hash].js`;
        }
      }
    }
  }
});
