<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { push } from 'svelte-spa-router';
  import {
    eventDetailStore,
    isEventDetailLoading,
    eventDetailError,
    currentEventDetail,
  } from '../stores/event';
  import {
    getEventStatusLabel,
    formatEventDateTime,
    getParticipationRate,
    getRemainingSlots,
    canParticipateInEvent,
  } from '../domain/event';
  import Layout from '../components/Layout.svelte';
  import Button from '../components/Button.svelte';
  import Loading from '../components/Loading.svelte';
  import ErrorBanner from '../components/ErrorBanner.svelte';

  export let params: { id: string } = { id: '' };

  // Reactive store subscriptions
  $: eventDetail = $currentEventDetail;
  $: loading = $isEventDetailLoading;
  $: error = $eventDetailError;

  // Event ID from route params
  $: eventId = parseInt(params.id);

  // イベント情報の計算
  $: dateTimeInfo = eventDetail ? formatEventDateTime(eventDetail) : null;
  $: participationRate = eventDetail ? getParticipationRate(eventDetail) : 0;
  $: remainingSlots = eventDetail ? getRemainingSlots(eventDetail) : null;
  $: canParticipate = eventDetail ? canParticipateInEvent(eventDetail) : false;

  onMount(() => {
    if (eventId && !isNaN(eventId)) {
      eventDetailStore.loadEventDetail(eventId);
    }
  });

  onDestroy(() => {
    // コンポーネント離脱時にストアをリセット
    eventDetailStore.reset();
  });

  function handleBackToList() {
    push('/event/list');
  }

  function handleParticipate() {
    // TODO: 参加申し込み機能の実装
    console.log('参加申し込み:', eventDetail?.id);
    alert('参加申し込み機能は今後実装予定です');
  }

  function clearError() {
    eventDetailStore.clearError();
  }
</script>

<Layout
  title={eventDetail
    ? `${eventDetail.title} - Beauty Experience`
    : 'イベント詳細 - Beauty Experience'}
>
  <div class="event-detail-container">
    <!-- 戻るボタン -->
    <div class="back-navigation">
      <Button variant="outline" on:click={handleBackToList}>
        ← イベント一覧に戻る
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
      <Loading message="イベント詳細を読み込み中..." />
    {:else if eventDetail}
      <article class="event-detail">
        <!-- ヘッダー画像 -->
        {#if eventDetail.imageUrl}
          <div class="event-hero">
            <img
              src={eventDetail.imageUrl}
              alt={eventDetail.title}
              class="hero-image"
            />
            <div class="hero-overlay">
              <span class="status-badge status-{eventDetail.status}">
                {getEventStatusLabel(eventDetail.status)}
              </span>
            </div>
          </div>
        {/if}

        <!-- イベント基本情報 -->
        <header class="event-header">
          <h1 class="event-title">{eventDetail.title}</h1>
          <p class="event-description">{eventDetail.description}</p>
        </header>

        <!-- 参加情報 -->
        <section class="participation-info">
          <div class="participation-card">
            <div class="participation-stats">
              {#if eventDetail.maxParticipants}
                <div class="stat">
                  <span class="stat-number"
                    >{eventDetail.currentParticipants}</span
                  >
                  <span class="stat-label"
                    >/ {eventDetail.maxParticipants}名</span
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
                    >{eventDetail.currentParticipants}</span
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
              {:else if eventDetail.status === 'completed'}
                <Button variant="disabled" disabled size="large">
                  終了済み
                </Button>
              {:else if eventDetail.maxParticipants && eventDetail.currentParticipants >= eventDetail.maxParticipants}
                <Button variant="disabled" disabled size="large">満員</Button>
              {:else}
                <Button variant="disabled" disabled size="large">
                  参加不可
                </Button>
              {/if}
            </div>
          </div>
        </section>

        <!-- イベント詳細情報 -->
        <div class="event-content">
          <div class="content-main">
            <!-- 詳細説明 -->
            {#if eventDetail.longDescription}
              <section class="section">
                <h2>詳細説明</h2>
                <div class="long-description">
                  {#each eventDetail.longDescription.split('\n') as paragraph}
                    {#if paragraph.trim()}
                      <p>{paragraph}</p>
                    {/if}
                  {/each}
                </div>
              </section>
            {/if}

            <!-- スケジュール -->
            {#if eventDetail.schedule && eventDetail.schedule.length > 0}
              <section class="section">
                <h2>タイムスケジュール</h2>
                <div class="schedule-list">
                  {#each eventDetail.schedule as item}
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
            {#if eventDetail.requirements && eventDetail.requirements.length > 0}
              <section class="section">
                <h2>参加条件</h2>
                <ul class="requirements-list">
                  {#each eventDetail.requirements as requirement}
                    <li>{requirement}</li>
                  {/each}
                </ul>
              </section>
            {/if}

            <!-- 特典 -->
            {#if eventDetail.benefits && eventDetail.benefits.length > 0}
              <section class="section">
                <h2>参加特典</h2>
                <ul class="benefits-list">
                  {#each eventDetail.benefits as benefit}
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
                {#if eventDetail.location}
                  <div class="info-item">
                    <span class="info-label">会場</span>
                    <span class="info-value">{eventDetail.location}</span>
                  </div>
                {/if}
              </div>
            </section>

            <!-- 主催者情報 -->
            {#if eventDetail.organizer}
              <section class="info-card">
                <h3>主催者</h3>
                <div class="info-list">
                  <div class="info-item">
                    <span class="info-label">団体名</span>
                    <span class="info-value">{eventDetail.organizer.name}</span>
                  </div>
                  {#if eventDetail.organizer.contact}
                    <div class="info-item">
                      <span class="info-label">連絡先</span>
                      <span class="info-value"
                        >{eventDetail.organizer.contact}</span
                      >
                    </div>
                  {/if}
                </div>
              </section>
            {/if}
          </div>
        </div>

        <!-- 追加画像 -->
        {#if eventDetail.images && eventDetail.images.length > 1}
          <section class="section">
            <h2>イベント画像</h2>
            <div class="image-gallery">
              {#each eventDetail.images as image, index}
                <img
                  src={image}
                  alt={`${eventDetail.title} - 画像 ${index + 1}`}
                  class="gallery-image"
                />
              {/each}
            </div>
          </section>
        {/if}
      </article>
    {:else if !loading}
      <div class="not-found">
        <h2>イベントが見つかりません</h2>
        <p>指定されたイベントは存在しないか、削除された可能性があります。</p>
        <Button variant="primary" on:click={handleBackToList}>
          イベント一覧に戻る
        </Button>
      </div>
    {/if}
  </div>
</Layout>

<style>
  .event-detail-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .back-navigation {
    margin-bottom: 2rem;
  }

  .event-detail {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Hero Section */
  .event-hero {
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
  .event-header {
    padding: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .event-title {
    font-size: 2rem;
    color: #1f2937;
    margin: 0 0 1rem 0;
    line-height: 1.3;
  }

  .event-description {
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
  .event-content {
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
    .event-content {
      grid-template-columns: 1fr;
    }

    .content-sidebar {
      order: -1;
    }

    .participation-card {
      flex-direction: column;
      text-align: center;
    }

    .event-title {
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
