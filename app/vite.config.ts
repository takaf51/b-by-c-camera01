import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000, // お好みのポート番号に変更
    // host: true, // 外部からアクセスを許可する場合
  },
});
