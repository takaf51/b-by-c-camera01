<script lang="ts">
  import { onMount } from 'svelte';
  import {
    eventStore,
    isEventsLoading,
    eventsError,
    eventsPagination,
  } from '../stores/event';
  import { getEventStatusLabel } from '../domain/event';
  import type { Event } from '../domain/event';

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
    // TODO: 後でルーティング実装時に追加
    console.log('Navigate to event detail:', eventId);
  }
</script>

<div class="event-list-container">
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
    <div class="error-banner">
      <p>⚠️ {error.message}</p>
      <button on:click={clearError} class="error-close-btn">✕</button>
    </div>
  {/if}

  <!-- ローディング表示 -->
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>イベントを読み込み中...</p>
    </div>
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
              <button
                class="btn btn-primary"
                on:click={() => goToEventDetail(event.id)}
              >
                詳細を見る
              </button>

              {#if canParticipate(event)}
                <button class="btn btn-secondary"> 参加する </button>
              {:else if event.status === 'completed'}
                <button class="btn btn-disabled" disabled> 終了済み </button>
              {:else if event.maxParticipants && event.currentParticipants >= event.maxParticipants}
                <button class="btn btn-disabled" disabled> 満員 </button>
              {:else}
                <button class="btn btn-disabled" disabled> 参加不可 </button>
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
        <button
          class="btn btn-primary"
          on:click={() => eventStore.loadEventList()}
        >
          すべてのイベントを表示
        </button>
      </div>
    {/if}

    <!-- ページネーション -->
    {#if pagination.totalPages > 1}
      <div class="pagination">
        <button
          class="btn btn-outline"
          disabled={!pagination.hasPrevPage || loading}
          on:click={goToPrevPage}
        >
          ← 前のページ
        </button>

        <span class="page-info">
          {pagination.currentPage} / {pagination.totalPages} ページ
        </span>

        <button
          class="btn btn-outline"
          disabled={!pagination.hasNextPage || loading}
          on:click={goToNextPage}
        >
          次のページ →
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .event-list-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

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

  .error-banner {
    background-color: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #c66;
  }

  .loading {
    text-align: center;
    padding: 60px 20px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
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

  .btn {
    padding: 10px 16px;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background-color 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background-color: #0056b3;
  }

  .btn-secondary {
    background-color: #28a745;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #1e7e34;
  }

  .btn-outline {
    background-color: transparent;
    color: #007bff;
    border: 1px solid #007bff;
  }

  .btn-outline:hover {
    background-color: #007bff;
    color: white;
  }

  .btn-disabled {
    background-color: #6c757d;
    color: white;
    cursor: not-allowed;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
