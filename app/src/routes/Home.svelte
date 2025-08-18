<script lang="ts">
  import { auth, authActions } from '../stores/auth';
  import { link } from 'svelte-spa-router';
  import Layout from '../components/Layout.svelte';
  import Button from '../components/Button.svelte';

  async function handleLogout() {
    await authActions.logout();
  }
</script>

<Layout title="Beauty Experience" maxWidth="md">
  <div class="container">
    <h1>ホーム</h1>

    {#if $auth.isAuthenticated}
      <div class="welcome">
        <h2>ようこそ、{$auth.user?.name || 'ゲスト'}さん</h2>
        <p>認証が完了しました。美容体験プログラムを探してみましょう。</p>

        <div class="actions">
          <a href="/program/list" use:link class="link-button">
            <Button variant="primary">プログラム一覧</Button>
          </a>
          <Button
            variant="danger"
            on:click={handleLogout}
            loading={$auth.isLoading}
          >
            ログアウト
          </Button>
        </div>
      </div>
    {:else}
      <div class="auth-prompt">
        <p>ログインが必要です。</p>

        <div class="actions">
          <a href="/login" use:link class="link-button">
            <Button variant="primary">ログイン</Button>
          </a>
          <a href="/register" use:link class="link-button">
            <Button variant="secondary">新規登録</Button>
          </a>
        </div>
      </div>
    {/if}
  </div>
</Layout>

<style>
  .container {
    text-align: center;
  }

  h1 {
    color: #333;
    margin-bottom: 2rem;
  }

  .welcome h2 {
    color: #2563eb;
    margin-bottom: 1rem;
  }

  .actions {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .link-button {
    text-decoration: none;
  }
</style>
