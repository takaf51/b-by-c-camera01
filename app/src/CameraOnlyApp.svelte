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
    // カメラ専用アプリが開始されました
    // PHPに埋め込まれる際は、確認事項画面から開始
  });
</script>

<!-- カメラ専用アプリケーション -->
<Router {routes} />

<style>
  :global(html) {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', sans-serif;
    overflow-x: hidden;
  }

  :global(#app) {
    height: 100%;
    width: 100%;
    overflow-x: hidden;
  }

  /* Ensure the camera app fits properly on mobile */
  :global(*) {
    box-sizing: border-box;
  }
</style>
