<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let mode: 'before' | 'after' = 'before';
  export let show: boolean = false;

  function handleWatchLater() {
    dispatch('watch-later');
  }

  function handleWatchNow() {
    dispatch('watch-now');
  }

  function handleClose() {
    dispatch('close');
  }

  $: modeText = mode === 'before' ? 'ビフォー' : 'アフター';
</script>

{#if show}
  <div
    class="modal-overlay"
    role="dialog"
    tabindex="-1"
    on:click={handleClose}
    on:keydown={handleClose}
  >
    <div
      class="modal-content"
      role="dialog"
      tabindex="0"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <div class="modal-body">
        <h2 class="modal-title">{modeText}画像の送信が完了しました</h2>
        <p class="modal-subtitle">続けて施術動画を見て施術してみましょう？</p>

        <div class="modal-buttons">
          <button class="later-button" on:click={handleWatchLater}>
            後で見る
          </button>
          <button class="watch-button" on:click={handleWatchNow}>
            視聴する
          </button>
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
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .modal-body {
    padding: 30px 25px;
    text-align: center;
  }

  .modal-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 15px 0;
    color: #333;
  }

  .modal-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0 0 30px 0;
    line-height: 1.5;
  }

  .modal-buttons {
    display: flex;
    gap: 15px;
  }

  .later-button,
  .watch-button {
    flex: 1;
    background: #c4d736;
    border: none;
    color: #333;
    padding: 15px 20px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .later-button:hover,
  .watch-button:hover {
    background: #b8c62f;
    transform: translateY(-1px);
  }

  /* モバイル対応 */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 15px;
    }

    .modal-body {
      padding: 25px 20px;
    }

    .modal-title {
      font-size: 16px;
    }

    .modal-subtitle {
      font-size: 13px;
    }

    .modal-buttons {
      gap: 12px;
    }

    .later-button,
    .watch-button {
      padding: 12px 16px;
      font-size: 15px;
    }
  }
</style>
