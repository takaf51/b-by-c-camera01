<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import {
    programStore,
    isProgramLoading,
    programError,
  } from '../stores/program';
  import type { Program } from '../domain/program';
  import { auth } from '../stores/auth';
  import Header from '../components/Header.svelte';
  import Button from '../components/Button.svelte';
  import Loading from '../components/Loading.svelte';
  import ErrorBanner from '../components/ErrorBanner.svelte';

  // Reactive store subscriptions
  $: programs = $programStore.programs;
  $: loading = $isProgramLoading;
  $: error = $programError;

  // 初回データ読み込み
  onMount(() => {
    programStore.loadPrograms();
  });

  // プログラム詳細ページへの遷移
  function goToProgramDetail(programId: number) {
    push(`/plan/detail/${programId}`);
  }

  // エラー解除
  function clearError() {
    programStore.clearError();
  }
</script>

<!-- ヘッダー: ロゴのみ -->
<Header />

<div class="container">
  <!-- ユーザー名表示 -->
  {#if $auth.user}
    <div class="user-welcome">
      <span class="user-name">{$auth.user.name} さん</span>
    </div>
  {/if}

  <!-- サービスキャッチフレーズとロゴ -->
  <div class="service-intro">
    <div class="intro-box">
      <p class="catchphrase">
        自分（ i ）を愛でる（＝）ように<br />360°見つめ直し（！）
      </p>
      <div class="logo-container">
        <img src="/assets/images/logo.svg" alt="ロゴ" class="service-logo" />
      </div>
      <div class="brand-name">EQUAL=i</div>
    </div>
  </div>

  <!-- エラー表示 -->
  {#if error}
    <div class="error-container">
      <ErrorBanner
        type="error"
        message={error.message || 'エラーが発生しました'}
        dismissible
        on:dismiss={clearError}
      />
    </div>
  {/if}

  <!-- ローディング表示 -->
  {#if loading}
    <Loading message="プログラムを読み込み中..." />
  {:else}
    <!-- プログラム一覧 -->
    <div class="program-section">
      <h4 class="program-list-title">プログラムを選択</h4>

      {#if programs.length > 0}
        <ul class="program-list">
          {#each programs as program (program.id)}
            <li class="program-item">
              <div class="program-box">
                <!-- プログラム画像 -->
                <div class="program-image">
                  {#if program.imageUrl}
                    <div
                      class="image-bg"
                      style="background-image: url('{program.imageUrl}')"
                    ></div>
                  {:else}
                    <div class="image-placeholder"></div>
                  {/if}
                </div>

                <!-- プログラム情報 -->
                <div class="program-info">
                  <div class="program-title">{program.title}</div>
                  <div class="program-actions">
                    <Button
                      variant="primary"
                      fullWidth
                      on:click={() => goToProgramDetail(program.id)}
                    >
                      詳細を見る
                    </Button>
                  </div>
                </div>

                <!-- 近日公開オーバーレイ -->
                {#if program.status === 'upcoming'}
                  <div class="overlay">
                    <span class="overlay-text">近日公開予定</span>
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="empty-state">
          <p>プログラムはありません。</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  /* ユーザー名表示 */
  .user-welcome {
    padding: 16px 24px;
    display: flex;
    justify-content: flex-start;
  }

  .user-name {
    background: rgba(255, 255, 255, 0.7);
    color: #333;
    padding: 16px 24px;
    border-radius: 8px;
    font-weight: bold;
    display: inline-block;
  }

  /* サービス紹介セクション */
  .service-intro {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 32px;
    padding: 0 1rem;
  }

  .intro-box {
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    width: 100%;
    max-width: 800px;
    height: 500px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .catchphrase {
    margin-bottom: 1rem;
    text-align: center;
    font-size: 1.1rem;
    color: #fff;
    line-height: 1.6;
  }

  .logo-container {
    margin-bottom: 24px;
  }

  .service-logo {
    max-height: 320px;
    max-width: 90%;
    filter: brightness(0) invert(1); /* ロゴを白くする */
  }

  .brand-name {
    font-family: 'PT Serif', serif;
    font-size: 1.4rem;
    color: #fff;
  }

  /* プログラム一覧セクション */
  .program-section {
    padding: 0 1rem 2rem;
  }

  .program-list-title {
    font-size: 1.4rem;
    margin-bottom: 1.2rem;
    color: #fff;
    font-weight: 600;
    text-align: center;
  }

  .program-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-width: 1200px;
    margin: 0 auto;
  }

  .program-item {
    margin-bottom: 20px;
    text-align: center;
  }

  .program-box {
    display: flex;
    background: #333;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    max-width: 600px;
    margin: 0 auto;
    min-height: 250px;
    position: relative;
  }

  .program-image {
    width: 40%;
    min-width: 120px;
    background: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  .image-bg {
    background-size: cover;
    background-position: center;
    padding: 1rem;
    width: 100%;
    height: 100%;
    border-radius: 10px;
  }

  .image-placeholder {
    width: 100%;
    height: 140px;
    background: #555;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
  }

  .program-info {
    width: 60%;
    padding: 24px 20px;
    display: flex;
    background: #333;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    height: 100%;
    position: relative;
  }

  .program-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 2rem;
    color: #fff;
    text-align: left;
  }

  .program-actions {
    margin-top: auto;
    width: 100%;
    display: flex;
    justify-content: flex-start;
  }

  /* オーバーレイ（近日公開等） */
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    border-radius: 10px;
  }

  .overlay-text {
    color: #fff;
    font-size: 1.1rem;
    font-weight: bold;
    text-align: center;
  }

  .error-container {
    padding: 0 1rem;
    margin-bottom: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: rgba(255, 255, 255, 0.8);
  }

  /* レスポンシブ */
  @media (max-width: 768px) {
    .intro-box {
      height: 400px;
      padding: 1rem;
    }

    .service-logo {
      max-height: 200px;
    }

    .program-box {
      flex-direction: column;
      max-width: 100%;
    }

    .program-image,
    .program-info {
      width: 100%;
    }

    .program-info {
      padding: 16px 10px;
      align-items: center;
    }

    .program-title {
      text-align: center;
      margin-bottom: 1rem;
    }
  }
</style>
