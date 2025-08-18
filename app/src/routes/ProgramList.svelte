<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import {
    programStore,
    isProgramLoading,
    programError,
    programPagination,
  } from '../stores/program';
  import { getProgramStatusLabel } from '../domain/program';
  import type { Program } from '../domain/program';
  import Layout from '../components/Layout.svelte';
  import Button from '../components/Button.svelte';
  import Loading from '../components/Loading.svelte';
  import ErrorBanner from '../components/ErrorBanner.svelte';

  // Reactive store subscriptions
  $: programs = $programStore.programs;
  $: loading = $isProgramLoading;
  $: error = $programError;
  $: pagination = $programPagination;

  // 選択されたステータスフィルタ
  let selectedStatus: Program['status'] | 'all' = 'all';

  // 初回データ読み込み
  onMount(() => {
    programStore.loadPrograms();
  });

  // ステータスフィルタ変更時の処理
  function handleStatusFilter() {
    const request = selectedStatus === 'all' ? {} : { status: selectedStatus };
    programStore.loadPrograms(request);
  }

  // ページネーション
  function goToNextPage() {
    if (pagination.currentPage < pagination.totalPages) {
      const request =
        selectedStatus === 'all'
          ? { page: pagination.currentPage + 1 }
          : { page: pagination.currentPage + 1, status: selectedStatus };
      programStore.loadPrograms(request);
    }
  }

  function goToPrevPage() {
    if (pagination.currentPage > 1) {
      const request =
        selectedStatus === 'all'
          ? { page: pagination.currentPage - 1 }
          : { page: pagination.currentPage - 1, status: selectedStatus };
      programStore.loadPrograms(request);
    }
  }

  // エラー解除
  function clearError() {
    programStore.clearError();
  }

  // プログラム参加可否の判定
  function canParticipate(program: Program): boolean {
    if (program.status !== 'active' && program.status !== 'upcoming') {
      return false;
    }
    if (
      program.maxParticipants &&
      program.currentParticipants >= program.maxParticipants
    ) {
      return false;
    }
    return true;
  }

  // プログラム詳細ページへの遷移
  function goToProgramDetail(programId: number) {
    push(`/program/detail/${programId}`);
  }
</script>

<Layout title="Beauty Experience - プログラム一覧">
  <header class="page-header">
    <h1>プログラム一覧</h1>
    <p>美容体験プログラムに参加して、新しい発見をしましょう</p>
  </header>

  <!-- ステータスフィルタ -->
  <div class="filter-section">
    <label for="status-filter">プログラムステータス:</label>
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
    <Loading message="プログラムを読み込み中..." />
  {:else}
    <!-- プログラムリスト -->
    <div class="programs-grid">
      {#each programs as program (program.id)}
        <article class="program-card">
          <!-- プログラム画像 -->
          {#if program.imageUrl}
            <div class="program-image">
              <img src={program.imageUrl} alt={program.title} />
            </div>
          {/if}

          <!-- プログラム情報 -->
          <div class="program-info">
            <header class="program-header">
              <h2>{program.title}</h2>
              <span class="status-badge status-{program.status}">
                {getProgramStatusLabel(program.status)}
              </span>
            </header>

            <p class="program-description">{program.description}</p>

            <div class="program-meta">
              <div class="program-dates">
                <p>
                  <strong>開始:</strong>
                  {new Date(program.startDate).toLocaleDateString('ja-JP')}
                </p>
                <p>
                  <strong>終了:</strong>
                  {new Date(program.endDate).toLocaleDateString('ja-JP')}
                </p>
              </div>

              <div class="program-participants">
                {#if program.maxParticipants}
                  <p>
                    <strong>参加者:</strong>
                    {program.currentParticipants} / {program.maxParticipants}名
                  </p>
                {:else}
                  <p>
                    <strong>参加者:</strong>
                    {program.currentParticipants}名
                  </p>
                {/if}
              </div>
            </div>

            <div class="program-actions">
              <Button
                variant="primary"
                on:click={() => goToProgramDetail(program.id)}
              >
                詳細を見る
              </Button>

              {#if canParticipate(program)}
                <Button variant="secondary">参加する</Button>
              {:else if program.status === 'completed'}
                <Button variant="disabled" disabled>終了済み</Button>
              {:else if program.maxParticipants && program.currentParticipants >= program.maxParticipants}
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
    {#if programs.length === 0}
      <div class="empty-state">
        <p>🔍 条件に合うプログラムが見つかりませんでした</p>
        <Button variant="primary" on:click={() => programStore.loadPrograms()}>
          すべてのプログラムを表示
        </Button>
      </div>
    {/if}

    <!-- ページネーション -->
    {#if pagination.totalPages > 1}
      <div class="pagination">
        <Button
          variant="outline"
          disabled={pagination.currentPage <= 1 || loading}
          on:click={goToPrevPage}
        >
          ← 前のページ
        </Button>

        <span class="page-info">
          {pagination.currentPage} / {pagination.totalPages} ページ
        </span>

        <Button
          variant="outline"
          disabled={pagination.currentPage >= pagination.totalPages || loading}
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

  .programs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 30px;
    margin-bottom: 40px;
  }

  .program-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .program-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .program-image {
    height: 200px;
    overflow: hidden;
  }

  .program-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .program-info {
    padding: 20px;
  }

  .program-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
  }

  .program-header h2 {
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

  .program-description {
    color: #666;
    line-height: 1.5;
    margin-bottom: 15px;
  }

  .program-meta {
    margin-bottom: 20px;
    font-size: 0.9rem;
  }

  .program-meta p {
    margin: 5px 0;
    color: #555;
  }

  .program-actions {
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
