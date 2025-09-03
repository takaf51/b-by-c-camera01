<!--
  VideoRecommendationModal - 初回Before送信後の動画視聴推奨ダイアログ
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '../common/Button.svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let isOpen = false;
  export let day: number = 1;

  function handleWatchLater() {
    dispatch('watchLater');
  }

  function handleWatchNow() {
    dispatch('watchNow', { day });
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      // オーバーレイクリックでは閉じない（明示的なボタン操作のみ）
    }
  }
</script>

{#if isOpen}
  <div
    class="modal-overlay"
    on:click={handleOverlayClick}
    on:keydown={e => e.key === 'Escape' && handleWatchLater()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-container">
      <div class="modal-content">
        <!-- アイコン -->
        <div class="icon-container">
          <div class="video-icon">📹</div>
        </div>

        <!-- メッセージ -->
        <h2 class="modal-title">ビフォー画像の送信が完了しました！</h2>

        <p class="modal-message">続けて動画を見て施術してみましょう</p>

        <p class="modal-sub-message">
          Day {day} の施術動画をご覧いただけます
        </p>

        <!-- ボタン -->
        <div class="button-container">
          <Button variant="outline" size="large" on:click={handleWatchLater}>
            後で見る
          </Button>

          <Button variant="primary" size="large" on:click={handleWatchNow}>
            視聴する
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-container {
    background: white;
    border-radius: 16px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 420px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    animation: modalSlideIn 0.3s ease-out;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .modal-content {
    padding: 2rem;
    text-align: center;
  }

  .icon-container {
    margin-bottom: 1.5rem;
  }

  .video-icon {
    font-size: 3rem;
    line-height: 1;
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 1rem 0;
    line-height: 1.3;
  }

  .modal-message {
    font-size: 1.1rem;
    color: #374151;
    margin: 0 0 0.5rem 0;
    line-height: 1.5;
  }

  .modal-sub-message {
    font-size: 0.9rem;
    color: #6b7280;
    margin: 0 0 2rem 0;
  }

  .button-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* タブレット以上 */
  @media (min-width: 768px) {
    .button-container {
      flex-direction: row;
      justify-content: center;
    }
  }

  /* モバイル対応 */
  @media (max-width: 480px) {
    .modal-container {
      margin: 1rem;
      border-radius: 12px;
    }

    .modal-content {
      padding: 1.5rem;
    }

    .modal-title {
      font-size: 1.3rem;
    }

    .modal-message {
      font-size: 1rem;
    }
  }
</style>
