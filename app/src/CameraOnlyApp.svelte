<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import Router from 'svelte-spa-router';
  import { externalConfig } from './stores/externalConfig';

  // カメラ専用ルート（Camera.svelteに直接アクセス）
  import Camera from './routes/Camera.svelte';
  import NotFound from './routes/NotFound.svelte';

  // カメラ専用のルート定義
  const routes = {
    // カメラフロー（確認画面から撮影、補正、送信まで）
    '/': Camera,
    '/camera': Camera,

    // 404
    '*': NotFound,
  };

  onMount(() => {
    console.log('📱 Camera-only app started');
    console.log('⚙️ External config:', $externalConfig);

    // カメラ専用画面は確認画面から開始
    // PHPから直接確認画面に遷移するためのイベントを発行
    setTimeout(() => {
      console.log('📋 Starting with confirmation screen');
      window.dispatchEvent(new Event('cameraStartRequested'));
    }, 100);
  });
</script>

<!-- カメラ専用アプリケーション -->
<Router {routes} />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', sans-serif;
  }
</style>
