<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let mode: 'before' | 'after' = 'before';

  function handleStartCapture() {
    dispatch('start-capture');
  }

  function handleCancel() {
    dispatch('cancel');
  }

  $: modeIcon = mode === 'before' ? '☀️' : '🌙';
  $: modeTitle = mode === 'before' ? 'BEFORE写真の撮影' : 'AFTER写真の撮影';
</script>

<div class="guide-screen">
  <!-- ヘッダー -->
  <div class="guide-header">
    <div class="header-icon">{modeIcon}</div>
    <div class="header-title">{modeTitle}</div>
  </div>

  <!-- 赤いバー -->
  <div class="guide-bar">準備ができたら撮影に進んでください</div>

  <!-- 白いテキストエリア -->
  <div class="guide-instructions">
    <div class="instruction-text">
      正確な顔のデータ取得のため、<br />
      撮影は顔を引いて真顔でおこなってください
    </div>
  </div>

  <!-- 撮影例画像 -->
  <div class="guide-image-section">
    <img
      src="/assets/images/example-of-shooting.png"
      alt="撮影例"
      class="guide-example-image"
    />
    <div class="image-label">撮影例（イラスト予定）</div>
  </div>

  <!-- ボタンエリア -->
  <div class="guide-buttons">
    <button class="cancel-btn" on:click={handleCancel}> キャンセル </button>
    <button class="start-btn" on:click={handleStartCapture}>
      撮影を始める
    </button>
  </div>
</div>

<style>
  .guide-screen {
    width: 100%;
    height: 100%;
    background: #222222;
    color: white;
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 0 0 1rem 0;
  }

  /* ヘッダー */
  .guide-header {
    background: #222222;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.2rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-icon {
    font-size: 1.5rem;
  }

  .header-title {
    color: white;
  }

  /* 赤いバー */
  .guide-bar {
    background: #c83e3e;
    color: white;
    padding: 1rem;
    text-align: center;
    font-size: 1rem;
    font-weight: 500;
  }

  /* 白いテキストエリア */
  .guide-instructions {
    background: white;
    color: #333;
    padding: 1rem 1.5rem;
    text-align: center;
    margin: 1rem 1.5rem 1rem 1.5rem;
    border-radius: 8px;
  }

  .instruction-text {
    font-size: 1rem;
    color: #d2294c;
    font-weight: normal;
    line-height: 1.5;
  }

  /* 撮影例画像セクション */
  .guide-image-section {
    background: white;
    padding: 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 1.5rem 1rem 1.5rem;
    border-radius: 8px;
  }

  .guide-example-image {
    width: 300px;
    height: auto;
    max-width: 90%;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .image-label {
    background: white;
    color: #333;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
    border: 1px solid #ddd;
  }

  /* ボタンエリア */
  .guide-buttons {
    background: #222222;
    padding: 1rem 1.5rem 2rem 1.5rem;
    display: flex;
    gap: 1rem;
  }

  .cancel-btn {
    flex: 1;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: white;
    padding: 1rem;
    border-radius: 25px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .start-btn {
    flex: 1;
    background: #c4d736;
    border: none;
    color: #333;
    padding: 1rem;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .start-btn:hover {
    background: #b8c62f;
    transform: translateY(-1px);
  }

  /* モバイル対応 */
  @media (max-width: 768px) {
    .guide-header {
      padding: 0.8rem;
      font-size: 1rem;
    }

    .guide-bar {
      padding: 0.8rem;
      font-size: 0.9rem;
    }

    .guide-instructions {
      padding: 1rem;
    }

    .instruction-text {
      font-size: 0.9rem;
    }

    .guide-image-section {
      padding: 1.5rem;
    }

    .guide-example-image {
      width: 250px;
    }

    .guide-buttons {
      padding: 1rem;
      gap: 0.8rem;
    }

    .cancel-btn,
    .start-btn {
      padding: 0.8rem;
      font-size: 0.9rem;
    }
  }
</style>
