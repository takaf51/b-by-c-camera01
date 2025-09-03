<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { push } from 'svelte-spa-router';
  import {
    programDetailStore,
    isProgramDetailLoading,
    programDetailError,
    currentProgramDetail,
  } from '../stores/program';
  import Header from '../components/ui/common/Header.svelte';
  import Button from '../components/ui/common/Button.svelte';
  import Loading from '../components/ui/common/Loading.svelte';
  import ErrorBanner from '../components/ui/common/ErrorBanner.svelte';
  import Layout from '../components/ui/common/Layout.svelte';

  export let params: { id: string } = { id: '' };

  // Reactive store subscriptions
  $: programDetail = $currentProgramDetail;
  $: loading = $isProgramDetailLoading;
  $: error = $programDetailError;

  // Program ID from route params
  $: programId = parseInt(params.id);

  // モーダル表示状態
  let showStartModal = false;

  // ライフサイクル
  onMount(async () => {
    if (programId && !isNaN(programId)) {
      await programDetailStore.loadProgramDetail(programId);
    }
  });

  onDestroy(() => {
    programDetailStore.reset();
  });

  // 戻るボタン
  function handleBackToList() {
    push('/plan/list');
  }

  // プログラム開始 - モーダルを表示せず直接カメラ画面に遷移
  function handleStartProgram() {
    console.log('handleStartProgram: programId', programId);
    push(`/camera/${programId}`);

    // Camera.svelteに遷移後、カメラ起動画面を表示するためのイベントを発火
    setTimeout(() => {
      const event = new CustomEvent('cameraStartRequested');
      window.dispatchEvent(event);
    }, 100);
  }

  // カメラ起動（モーダル用 - 使用しない）
  function handleStartCamera() {
    showStartModal = false;
    console.log('handleStartCamera: programId', programId);
    push(`/camera/${programId}`);
  }

  // ファイル選択
  function handleFileUpload() {
    // TODO: ファイルアップロードの実装後に追加
    console.log('ファイル選択');
  }

  // モーダルを閉じる
  function closeModal() {
    showStartModal = false;
  }

  // エラークリア
  function clearError() {
    programDetailStore.clearError();
  }
</script>

<Layout
  title={programDetail
    ? `${programDetail.title} - Beauty Experience`
    : 'プログラム詳細 - Beauty Experience'}
>
  <!-- ヘッダー（戻るボタン付き） -->
  <Header showBackButton={true} backUrl="/plan/list" />

  <div class="wrapper program-detail">
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
      <div class="loading-container">
        <Loading message="プログラム詳細を読み込み中..." />
      </div>
    {:else if programDetail}
      <!-- プログラム画像 -->
      {#if programDetail.imageUrl}
        <img
          src={programDetail.imageUrl}
          alt={programDetail.title}
          class="hero-image"
        />
      {/if}

      <div class="content">
        <!-- プログラム基本情報 -->
        <div class="program-header">
          <h3 class="program-title">{programDetail.title}</h3>

          {#if programDetail.longDescription}
            <div class="program-caption">
              {programDetail.longDescription}
            </div>
          {/if}

          <div class="program-meta">
            <span class="period-badge">30日間</span>
            <span class="period-info">
              プログラム期間:
              <span class="dates">
                {new Date(programDetail.startDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                〜
                {new Date(programDetail.endDate).toLocaleDateString('ja-JP', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>
        </div>

        <!-- プログラム開始ボタン -->
        <div class="start-section">
          <Button
            variant="primary"
            size="large"
            fullWidth
            on:click={handleStartProgram}
          >
            プログラムを開始
          </Button>
        </div>

        <!-- プログラム詳細説明 -->
        {#if programDetail.description}
          <div class="description-section">
            <p class="description">{programDetail.description}</p>
          </div>
        {/if}

        <!-- 詳細セクション -->
        {#if programDetail.requirements && programDetail.requirements.length > 0}
          <div class="detail-section">
            <h4 class="section-title">こんな方におすすめ</h4>
            <div class="section-content">
              {#each programDetail.requirements as requirement}
                <p>{requirement}</p>
              {/each}
            </div>
          </div>
        {/if}

        {#if programDetail.benefits && programDetail.benefits.length > 0}
          <div class="detail-section">
            <h4 class="section-title">変わるポイント</h4>
            <div class="section-content">
              {#each programDetail.benefits as benefit}
                <p>{benefit}</p>
              {/each}
            </div>
          </div>
        {/if}

        <div class="detail-section">
          <h4 class="section-title">部位</h4>
          <div class="section-content">
            <p>顔全体、首、デコルテ</p>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">注意事項</h4>
          <div class="section-content">
            <p>
              施術前後の飲食は控えめにしてください。肌に異常を感じた場合は使用を中止してください。
            </p>
          </div>
        </div>

        <div class="detail-section">
          <h4 class="section-title">使用アイテム</h4>
          <div class="section-content">
            <p>専用美容機器、専用ジェル、クレンジング</p>
          </div>
        </div>
      </div>
    {:else}
      <!-- プログラムが見つからない -->
      <div class="not-found">
        <h2>プログラムが見つかりません</h2>
        <p>指定されたプログラムは存在しないか、削除された可能性があります。</p>
        <Button variant="primary" on:click={handleBackToList}>
          プログラム一覧に戻る
        </Button>
      </div>
    {/if}
  </div>

  <!-- プログラム開始モーダル -->
  {#if showStartModal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="modal-overlay" on:click={closeModal} role="presentation">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <div
        class="modal-content"
        on:click|stopPropagation
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
      >
        <div class="modal-header">
          <h4 id="modal-title">
            はじめに施術前の写真を<br />アップロードしましょう
          </h4>
        </div>

        <div class="modal-body">
          <div class="modal-buttons">
            <Button
              variant="outline"
              fullWidth
              on:click={handleStartCamera}
              class="modal-button"
            >
              カメラを起動する
            </Button>

            <Button
              variant="outline"
              fullWidth
              on:click={handleFileUpload}
              class="modal-button"
            >
              ファイルを選択する
            </Button>
          </div>

          <p class="modal-note">
            写真の精度によっては、正確に測定できない可能性がございます。予めご了承ください。
          </p>
        </div>

        <div class="modal-footer">
          <Button variant="secondary" fullWidth on:click={closeModal}>
            中止する
          </Button>
        </div>
      </div>
    </div>
  {/if}
</Layout>

<style>
  .program-detail {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .hero-image {
    width: 100%;
    height: auto;
    display: block;
  }

  .content {
    padding: 0 1rem 2rem;
  }

  .program-header {
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .program-title {
    font-size: 1.3rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  .program-caption {
    margin-bottom: 1rem;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
  }

  .program-meta {
    border-bottom: 1px solid #fff;
    padding-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .period-badge {
    padding: 0.3rem;
    border: 1px solid #fff;
    margin-right: 0.3rem;
    border-radius: 4px;
    display: inline-block;
    font-size: 0.9rem;
  }

  .period-info {
    font-size: 0.9rem;
  }

  .dates {
    font-weight: normal;
  }

  .start-section {
    margin-bottom: 1rem;
    text-align: center;
  }

  .description-section {
    margin-bottom: 3rem;
  }

  .description {
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
    white-space: pre-line;
  }

  .detail-section {
    margin-bottom: 3rem;
  }

  .section-title {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    font-weight: bold;
    color: #fff;
  }

  .section-content {
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
  }

  .section-content p {
    margin: 0.5rem 0;
  }

  .error-container,
  .loading-container {
    padding: 1rem;
  }

  .not-found {
    text-align: center;
    padding: 3rem 1rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .not-found h2 {
    color: #fff;
    margin-bottom: 1rem;
  }

  /* モーダルスタイル */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-content {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    min-width: 260px;
    max-width: 400px;
    width: 100%;
    color: #000;
  }

  .modal-header h4 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
    font-weight: bold;
    line-height: 1.4;
  }

  .modal-body {
    margin-bottom: 1rem;
  }

  .modal-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .modal-note {
    font-size: 0.9rem;
    color: #666;
    text-align: left;
    line-height: 1.4;
    margin: 0;
  }

  @media (max-width: 768px) {
    .content {
      padding: 0 0.5rem 1rem;
    }

    .program-title {
      font-size: 1.1rem;
    }

    .section-title {
      font-size: 1.3rem;
    }

    .modal-content {
      padding: 1.5rem;
      margin: 0 0.5rem;
    }
  }
</style>
