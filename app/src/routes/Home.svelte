<script lang="ts">
  import { auth, authActions } from '../stores/auth';
  import { link } from 'svelte-spa-router';

  async function handleLogout() {
    await authActions.logout();
  }
</script>

<div class="container">
  <h1>ホーム</h1>

  {#if $auth.isAuthenticated}
    <div class="welcome">
      <h2>ようこそ、{$auth.user?.name || 'ゲスト'}さん</h2>
      <p>認証が完了しました。美容体験イベントを探してみましょう。</p>

      <div class="actions">
        <a href="/event/list" use:link class="btn btn-primary">
          イベント一覧
        </a>
        <button on:click={handleLogout} class="logout-btn"> ログアウト </button>
      </div>
    </div>
  {:else}
    <div class="auth-prompt">
      <p>ログインが必要です。</p>

      <div class="actions">
        <a href="/login" use:link class="btn btn-primary"> ログイン </a>
        <a href="/register" use:link class="btn btn-secondary"> 新規登録 </a>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
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

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background-color: #1d4ed8;
  }

  .btn-secondary {
    background-color: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #4b5563;
  }

  .logout-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    background-color: #dc2626;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .logout-btn:hover {
    background-color: #b91c1c;
  }
</style>
