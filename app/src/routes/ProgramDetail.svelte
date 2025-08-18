<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { push } from 'svelte-spa-router';
  import {
    programDetailStore,
    isProgramDetailLoading,
    programDetailError,
    currentProgramDetail,
  } from '../stores/program';
  import {
    getProgramStatusLabel,
    formatProgramDateTime,
    getParticipationRate,
    getRemainingSlots,
    canParticipateInProgram,
  } from '../domain/program';
  import Layout from '../components/Layout.svelte';
  import Button from '../components/Button.svelte';
  import Loading from '../components/Loading.svelte';
  import ErrorBanner from '../components/ErrorBanner.svelte';

  export let params: { id: string } = { id: '' };

  // Reactive store subscriptions
  $: programDetail = $currentProgramDetail;
  $: loading = $isProgramDetailLoading;
  $: error = $programDetailError;

  // Program ID from route params
  $: programId = parseInt(params.id);

  // プログラム情報の計算
  $: dateTimeInfo = programDetail ? formatProgramDateTime(programDetail) : null;
  $: participationRate = programDetail
    ? getParticipationRate(programDetail)
    : 0;
  $: remainingSlots = programDetail ? getRemainingSlots(programDetail) : null;
  $: canParticipate = programDetail
    ? canParticipateInProgram(programDetail)
    : false;

  onMount(() => {
    if (programId && !isNaN(programId)) {
      programDetailStore.loadProgramDetail(programId);
    }
  });

  onDestroy(() => {
    // コンポーネント離脱時にストアをリセット
    programDetailStore.reset();
  });

  function handleBackToList() {
    push('/program/list');
  }

  function handleParticipate() {
    // TODO: 参加申し込み機能の実装
    console.log('参加申し込み:', programDetail?.id);
    alert('参加申し込み機能は今後実装予定です');
  }

  function clearError() {
    programDetailStore.clearError();
  }
</script>

<Layout
  title={programDetail
    ? `${programDetail.title} - Beauty Experience`
    : 'プログラム詳細 - Beauty Experience'}
>
  <div class="program-detail-container">
    <!-- 戻るボタン -->
    <div class="back-navigation">
      <Button variant="outline" on:click={handleBackToList}>
        ← プログラム一覧に戻る
      </Button>
    </div>

    <!-- エラー表示 -->
    {#if error}
      <ErrorBanner
        message={error.message}
        type="error"
        on:dismiss={clearError}
      />
    {/if}

    <!-- ローディング表示 -->
    {#if loading}
      <Loading message="プログラム詳細を読み込み中..." />
    {:else if programDetail}
      <article class="program-detail">
        <!-- ヘッダー画像 -->
        {#if programDetail.imageUrl}
          <div class="program-hero">
            <img
              src={programDetail.imageUrl}
              alt={programDetail.title}
              class="hero-image"
            />
            <div class="hero-overlay">
              <span class="status-badge status-{programDetail.status}">
                {getProgramStatusLabel(programDetail.status)}
              </span>
            </div>
          </div>
        {/if}

        <!-- プログラム基本情報 -->
        <header class="program-header">
          <h1 class="program-title">{programDetail.title}</h1>
          <p class="program-description">{programDetail.description}</p>
        </header>

        <!-- 参加情報 -->
        <section class="participation-info">
          <div class="participation-card">
            <div class="participation-stats">
              {#if programDetail.maxParticipants}
                <div class="stat">
                  <span class="stat-number"
                    >{programDetail.currentParticipants}</span
                  >
                  <span class="stat-label"
                    >/ {programDetail.maxParticipants}名</span
                  >
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    style="width: {participationRate}%"
                  ></div>
                </div>
                {#if remainingSlots !== null}
                  <p class="remaining-slots">
                    残り<strong>{remainingSlots}名</strong>
                  </p>
                {/if}
              {:else}
                <div class="stat">
                  <span class="stat-number"
                    >{programDetail.currentParticipants}</span
                  >
                  <span class="stat-label">名参加</span>
                </div>
              {/if}
            </div>

            <div class="participation-action">
              {#if canParticipate}
                <Button
                  variant="primary"
                  size="large"
                  on:click={handleParticipate}
                >
                  参加申し込み
                </Button>
              {:else if programDetail.status === 'completed'}
                <Button variant="disabled" disabled size="large">
                  終了済み
                </Button>
              {:else if programDetail.maxParticipants && programDetail.currentParticipants >= programDetail.maxParticipants}
                <Button variant="disabled" disabled size="large">満員</Button>
              {:else}
                <Button variant="disabled" disabled size="large">
                  参加不可
                </Button>
              {/if}
            </div>
          </div>
        </section>

        <!-- プログラム詳細情報 -->
        <div class="program-content">
          <div class="content-main">
            <!-- 詳細説明 -->
            {#if programDetail.longDescription}
              <section class="section">
                <h2>詳細説明</h2>
                <div class="long-description">
                  {#each programDetail.longDescription.split('\n') as paragraph}
                    {#if paragraph.trim()}
                      <p>{paragraph}</p>
                    {/if}
                  {/each}
                </div>
              </section>
            {/if}

            <!-- スケジュール -->
            {#if programDetail.schedule && programDetail.schedule.length > 0}
              <section class="section">
                <h2>タイムスケジュール</h2>
                <div class="schedule-list">
                  {#each programDetail.schedule as item}
                    <div class="schedule-item">
                      <div class="schedule-time">{item.time}</div>
                      <div class="schedule-content">
                        <h3>{item.title}</h3>
                        {#if item.description}
                          <p>{item.description}</p>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </section>
            {/if}

            <!-- 参加条件 -->
            {#if programDetail.requirements && programDetail.requirements.length > 0}
              <section class="section">
                <h2>参加条件</h2>
                <ul class="requirements-list">
                  {#each programDetail.requirements as requirement}
                    <li>{requirement}</li>
                  {/each}
                </ul>
              </section>
            {/if}

            <!-- 特典 -->
            {#if programDetail.benefits && programDetail.benefits.length > 0}
              <section class="section">
                <h2>参加特典</h2>
                <ul class="benefits-list">
                  {#each programDetail.benefits as benefit}
                    <li>{benefit}</li>
                  {/each}
                </ul>
              </section>
            {/if}
          </div>

          <div class="content-sidebar">
            <!-- 開催情報 -->
            <section class="info-card">
              <h3>開催情報</h3>
              <div class="info-list">
                {#if dateTimeInfo}
                  <div class="info-item">
                    <span class="info-label">開催日</span>
                    <span class="info-value">{dateTimeInfo.dateRange}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">時間</span>
                    <span class="info-value">{dateTimeInfo.timeRange}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">所要時間</span>
                    <span class="info-value">{dateTimeInfo.duration}</span>
                  </div>
                {/if}
                {#if programDetail.location}
                  <div class="info-item">
                    <span class="info-label">会場</span>
                    <span class="info-value">{programDetail.location}</span>
                  </div>
                {/if}
              </div>
            </section>

            <!-- 主催者情報 -->
            {#if programDetail.organizer}
              <section class="info-card">
                <h3>主催者</h3>
                <div class="info-list">
                  <div class="info-item">
                    <span class="info-label">団体名</span>
                    <span class="info-value"
                      >{programDetail.organizer.name}</span
                    >
                  </div>
                  {#if programDetail.organizer.contact}
                    <div class="info-item">
                      <span class="info-label">連絡先</span>
                      <span class="info-value"
                        >{programDetail.organizer.contact}</span
                      >
                    </div>
                  {/if}
                </div>
              </section>
            {/if}
          </div>
        </div>

        <!-- 追加画像 -->
        {#if programDetail.images && programDetail.images.length > 1}
          <section class="section">
            <h2>プログラム画像</h2>
            <div class="image-gallery">
              {#each programDetail.images as image, index}
                <img
                  src={image}
                  alt={`${programDetail.title} - 画像 ${index + 1}`}
                  class="gallery-image"
                />
              {/each}
            </div>
          </section>
        {/if}
      </article>
    {:else if !loading}
      <div class="not-found">
        <h2>プログラムが見つかりません</h2>
        <p>指定されたプログラムは存在しないか、削除された可能性があります。</p>
        <Button variant="primary" on:click={handleBackToList}>
          プログラム一覧に戻る
        </Button>
      </div>
    {/if}
  </div>
</Layout>

<style>
  .program-detail-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .back-navigation {
    margin-bottom: 2rem;
  }

  .program-detail {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Hero Section */
  .program-hero {
    position: relative;
    height: 300px;
    overflow: hidden;
  }

  .hero-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-overlay {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .status-badge {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: bold;
    white-space: nowrap;
  }

  .status-active {
    background-color: #d4edda;
    color: #155724;
  }
  .status-upcoming {
    background-color: #d1ecf1;
    color: #0c5460;
  }
  .status-completed {
    background-color: #f8d7da;
    color: #721c24;
  }
  .status-cancelled {
    background-color: #e2e3e5;
    color: #383d41;
  }

  /* Header */
  .program-header {
    padding: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .program-title {
    font-size: 2rem;
    color: #1f2937;
    margin: 0 0 1rem 0;
    line-height: 1.3;
  }

  .program-description {
    font-size: 1.125rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.6;
  }

  /* Participation Info */
  .participation-info {
    padding: 2rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .participation-card {
    display: flex;
    align-items: center;
    gap: 2rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .participation-stats {
    flex: 1;
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: #3b82f6;
  }

  .stat-label {
    font-size: 1rem;
    color: #6b7280;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background-color: #3b82f6;
    transition: width 0.3s ease;
  }

  .remaining-slots {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .participation-action {
    flex-shrink: 0;
  }

  /* Content */
  .program-content {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
    padding: 2rem;
  }

  .content-main {
    min-width: 0;
  }

  .content-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section h2 {
    font-size: 1.5rem;
    color: #1f2937;
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #3b82f6;
  }

  .long-description p {
    margin: 0 0 1rem 0;
    line-height: 1.7;
    color: #374151;
  }

  /* Schedule */
  .schedule-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .schedule-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
  }

  .schedule-time {
    font-weight: bold;
    color: #3b82f6;
    min-width: 60px;
    flex-shrink: 0;
  }

  .schedule-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    color: #1f2937;
  }

  .schedule-content p {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }

  /* Lists */
  .requirements-list,
  .benefits-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .requirements-list li,
  .benefits-list li {
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background-color: #f9fafb;
    border-radius: 8px;
    border-left: 4px solid #10b981;
  }

  .requirements-list li {
    border-left-color: #f59e0b;
  }

  /* Info Cards */
  .info-card {
    background-color: #f9fafb;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .info-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: #1f2937;
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-label {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .info-value {
    color: #1f2937;
    line-height: 1.4;
  }

  /* Image Gallery */
  .image-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .gallery-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
  }

  /* Not Found */
  .not-found {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 8px;
  }

  .not-found h2 {
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .not-found p {
    color: #6b7280;
    margin-bottom: 2rem;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .program-content {
      grid-template-columns: 1fr;
    }

    .content-sidebar {
      order: -1;
    }

    .participation-card {
      flex-direction: column;
      text-align: center;
    }

    .program-title {
      font-size: 1.5rem;
    }

    .schedule-item {
      flex-direction: column;
      gap: 0.5rem;
    }

    .schedule-time {
      min-width: auto;
    }

    .image-gallery {
      grid-template-columns: 1fr;
    }
  }
</style>
