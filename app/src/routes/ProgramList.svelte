<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import {
    eventStore,
    isEventsLoading,
    eventsError,
    eventsPagination,
  } from '../stores/event';
  import { getEventStatusLabel } from '../domain/event';
  import type { Event } from '../domain/event';
  import Layout from '../components/Layout.svelte';
  import Button from '../components/Button.svelte';
  import Loading from '../components/Loading.svelte';
  import ErrorBanner from '../components/ErrorBanner.svelte';

  // Reactive store subscriptions
  $: events = $eventStore.events;
  $: loading = $isEventsLoading;
  $: error = $eventsError;
  $: pagination = $eventsPagination;

  // 選択されたステータスフィルタ
  let selectedStatus: Event['status'] | 'all' = 'all';

  // 初回データ読み込み
  onMount(() => {
    eventStore.loadEventList();
  });

  // ステータスフィルタ変更時の処理
  function handleStatusFilter() {
    if (selectedStatus === 'all') {
      eventStore.filterByStatus();
    } else {
      eventStore.filterByStatus(selectedStatus);
    }
  }

  // ページネーション
  function goToNextPage() {
    eventStore.loadNextPage();
  }

  function goToPrevPage() {
    eventStore.loadPrevPage();
  }

  // エラー解除
  function clearError() {
    eventStore.clearError();
  }

  // イベント参加可否の判定
  function canParticipate(event: Event): boolean {
    if (event.status !== 'active' && event.status !== 'upcoming') {
      return false;
    }
    if (
      event.maxParticipants &&
      event.currentParticipants >= event.maxParticipants
    ) {
      return false;
    }
    return true;
  }

  // イベント詳細ページへの遷移
  function goToEventDetail(eventId: number) {
    push(`/event/detail/${eventId}`);
  }
</script>

<Layout title="Beauty Experience - イベント一覧">
  <header class="page-header">
    <h1>イベント一覧</h1>
    <p>美容体験イベントに参加して、新しい発見をしましょう</p>
  </header>

  <!-- ステータスフィルタ -->
  <div class="filter-section">
    <label for="status-filter">イベントステータス:</label>
    <select
      id="status-filter"
      bind:value={selectedStatus}
      on:change={handleStatusFilter}
    >
      <option value="all">すべて</option>
      <option value="active">開催中</option>
      <option value="upcoming">開催予定</option>
      <option value="completed">終了</option>
      <option value="cancelled">キャンセル</option>
    </select>
  </div>

  <!-- エラー表示 -->
  {#if error}
    <ErrorBanner message={error.message} type="error" on:dismiss={clearError} />
  {/if}

  <!-- ローディング表示 -->
  {#if loading}
    <Loading message="イベントを読み込み中..." />
  {:else}
    <!-- イベントリスト -->
    <div class="events-grid">
      {#each events as event (event.id)}
        <article class="event-card">
          <!-- イベント画像 -->
          {#if event.imageUrl}
            <div class="event-image">
              <img src={event.imageUrl} alt={event.title} />
            </div>
          {/if}

          <!-- イベント情報 -->
          <div class="event-info">
            <header class="event-header">
              <h2>{event.title}</h2>
              <span class="status-badge status-{event.status}">
                {getEventStatusLabel(event.status)}
              </span>
            </header>

            <p class="event-description">{event.description}</p>

            <div class="event-meta">
              <div class="event-dates">
                <p>
                  <strong>開始:</strong>
                  {new Date(event.startDate).toLocaleDateString('ja-JP')}
                </p>
                <p>
                  <strong>終了:</strong>
                  {new Date(event.endDate).toLocaleDateString('ja-JP')}
                </p>
              </div>

              <div class="event-participants">
                {#if event.maxParticipants}
                  <p>
                    <strong>参加者:</strong>
                    {event.currentParticipants} / {event.maxParticipants}名
                  </p>
                {:else}
                  <p><strong>参加者:</strong> {event.currentParticipants}名</p>
                {/if}
              </div>
            </div>

            <div class="event-actions">
              <Button
                variant="primary"
                on:click={() => goToEventDetail(event.id)}
              >
                詳細を見る
              </Button>

              {#if canParticipate(event)}
                <Button variant="secondary">参加する</Button>
              {:else if event.status === 'completed'}
                <Button variant="disabled" disabled>終了済み</Button>
              {:else if event.maxParticipants && event.currentParticipants >= event.maxParticipants}
                <Button variant="disabled" disabled>満員</Button>
              {:else}
                <Button variant="disabled" disabled>参加不可</Button>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>

    <!-- 検索結果が空の場合 -->
    {#if events.length === 0}
      <div class="empty-state">
        <p>🔍 条件に合うイベントが見つかりませんでした</p>
        <Button variant="primary" on:click={() => eventStore.loadEventList()}>
          すべてのイベントを表示
        </Button>
      </div>
    {/if}

    <!-- ページネーション -->
    {#if pagination.totalPages > 1}
      <div class="pagination">
        <Button
          variant="outline"
          disabled={!pagination.hasPrevPage || loading}
          on:click={goToPrevPage}
        >
          ← 前のページ
        </Button>

        <span class="page-info">
          {pagination.currentPage} / {pagination.totalPages} ページ
        </span>

        <Button
          variant="outline"
          disabled={!pagination.hasNextPage || loading}
          on:click={goToNextPage}
        >
          次のページ →
        </Button>
      </div>
    {/if}
  {/if}
</Layout>

<style>
  .page-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .page-header h1 {
    font-size: 2rem;
    color: #333;
    margin-bottom: 10px;
  }

  .page-header p {
    color: #666;
    font-size: 1.1rem;
  }

  .filter-section {
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .filter-section label {
    font-weight: bold;
    color: #333;
  }

  .filter-section select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 30px;
    margin-bottom: 40px;
  }

  .event-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .event-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .event-image {
    height: 200px;
    overflow: hidden;
  }

  .event-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .event-info {
    padding: 20px;
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
  }

  .event-header h2 {
    font-size: 1.4rem;
    color: #333;
    margin: 0;
    flex: 1;
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    white-space: nowrap;
    margin-left: 10px;
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

  .event-description {
    color: #666;
    line-height: 1.5;
    margin-bottom: 15px;
  }

  .event-meta {
    margin-bottom: 20px;
    font-size: 0.9rem;
  }

  .event-meta p {
    margin: 5px 0;
    color: #555;
  }

  .event-actions {
    display: flex;
    gap: 10px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;
  }

  .empty-state p {
    font-size: 1.2rem;
    margin-bottom: 20px;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 40px;
  }

  .page-info {
    font-weight: bold;
    color: #333;
  }
</style>
