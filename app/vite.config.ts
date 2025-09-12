import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000, // お好みのポート番号に変更
    host: true, // 外部からアクセスを許可する場合
    // https: {
    //   key: './localhost+3-key.pem',
    //   cert: './localhost+3.pem'
    // }, // mkcertで生成した信頼できる証明書を使用
  },

  build: {
    manifest: true, // PHP統合用にmanifest.jsonを出力
    rollupOptions: {
      input: {
        main: './index.html',      // 完全版アプリ
        camera: './camera.html'    // カメラ専用版
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
