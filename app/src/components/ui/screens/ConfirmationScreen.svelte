<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="confirmation-screen">
  <div class="confirmation-content">
    <h2 class="confirmation-title">撮影の前にご確認ください</h2>

    <div class="warning-section">
      <div class="warning-icon-line">
        <img
          src="/assets/images/icon/exclamation-mark.png"
          alt="注意"
          class="warning-icon"
        />
        <p>前後の比較はデータ分析されます。</p>
      </div>
      <div class="warning-text">
        <p>正確な結果を得るため、以下の通りご撮影ください。</p>
      </div>
    </div>

    <div class="guidelines-container">
      <div class="guidelines-grid">
        <div class="guideline-item good">
          <div class="guideline-frame">
            <img
              src="/assets/images/confirm/checklist-good.png"
              alt="正しい撮影例"
              class="guideline-image"
            />
          </div>
          <p class="guideline-text">
            顔の輪郭が明確、<br />明るく無地の背景
          </p>
        </div>

        <div class="guideline-item bad">
          <div class="guideline-frame">
            <img
              src="/assets/images/confirm/checklist-bad-hair.png"
              alt="髪で耳が隠れている例"
              class="guideline-image"
            />
          </div>
          <p class="guideline-text">
            顔に髪がかかって<br />耳が隠れている
          </p>
        </div>

        <div class="guideline-item bad">
          <div class="guideline-frame">
            <img
              src="/assets/images/confirm/checklist-bad-shadow.png"
              alt="強い陰影がある例"
              class="guideline-image"
            />
          </div>
          <p class="guideline-text">
            顔に強い陰影が<br />ついている
          </p>
        </div>

        <div class="guideline-item bad">
          <div class="guideline-frame">
            <img
              src="/assets/images/confirm/checklist-bad-background.png"
              alt="背景が無地以外の例"
              class="guideline-image"
            />
          </div>
          <p class="guideline-text">背景が<br />無地以外</p>
        </div>
      </div>
    </div>

    <button class="confirm-button" on:click={handleConfirm}>
      確認しました
    </button>
  </div>
</div>

<style>
  .confirmation-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #222222;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    padding: 20px 0 0 0; /* 上部に最小限の余白のみ */
  }

  .confirmation-content {
    background: white;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 500px;
    max-height: calc(100vh - 20px); /* 上部余白を除いた高さまで */
    min-height: auto; /* コンテンツに応じて高さを調整 */
    overflow-y: auto; /* スクロールを有効にする */
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    padding: 40px 24px 40px 24px;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    /* スクロールバーのスタイリング（WebKit系ブラウザ用） */
    scrollbar-width: thin;
    scrollbar-color: #d2294c transparent;
  }

  /* WebKit系ブラウザ用のスクロールバースタイル */
  .confirmation-content::-webkit-scrollbar {
    width: 4px;
  }

  .confirmation-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .confirmation-content::-webkit-scrollbar-thumb {
    background-color: #d2294c;
    border-radius: 2px;
  }

  .confirmation-content::-webkit-scrollbar-thumb:hover {
    background-color: #b8233c;
  }

  .confirmation-title {
    text-align: center;
    margin: 0 0 25px 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
  }

  .warning-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 25px;
  }

  .warning-icon-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .warning-icon-line p {
    margin: 0;
    color: #d2294c;
  }

  .warning-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .warning-text {
    text-align: center;
  }

  .warning-text p {
    margin: 0 0 8px 0;
    color: #d2294c;
    font-size: 14px;
    line-height: 1.5;
  }

  .warning-text p:last-child {
    margin-bottom: 0;
  }

  .guidelines-container {
    margin-bottom: 30px;
  }

  .guidelines-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .guideline-item {
    text-align: center;
  }

  .guideline-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 128/150;
    border-radius: 8px;
    margin-bottom: 10px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .guideline-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }

  .guideline-text {
    font-size: 12px;
    color: #333;
    line-height: 1.4;
    margin: 0;
    font-weight: 500;
  }

  .confirm-button {
    width: 100%;
    background: #d6df22;
    border: none;
    color: black;
    padding: 15px 20px;
    font-size: 16px;
    font-weight: 400;
    border-radius: 25px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .confirm-button:hover {
    background: #c5ce1f;
    transform: translateY(-1px);
  }

  /* モバイル対応のメディアクエリ */
  @media (max-height: 700px) {
    .confirmation-screen {
      padding: 15px 0 0 0; /* 上部余白を少し縮小 */
    }

    .confirmation-content {
      max-height: calc(100vh - 15px); /* より小さい画面では上部余白を縮小 */
      padding: 30px 20px 30px 20px; /* パディングを少し縮小 */
    }

    .confirmation-title {
      margin: 0 0 20px 0; /* マージンを縮小 */
      font-size: 16px; /* フォントサイズを少し小さく */
    }

    .warning-section {
      margin-bottom: 20px; /* マージンを縮小 */
    }

    .guidelines-container {
      margin-bottom: 25px; /* マージンを縮小 */
    }
  }

  @media (max-height: 600px) {
    .confirmation-screen {
      padding: 10px 0 0 0; /* 上部余白をさらに縮小 */
    }

    .confirmation-content {
      max-height: calc(
        100vh - 10px
      ); /* 非常に小さい画面では上部余白をさらに縮小 */
      padding: 25px 20px 25px 20px; /* さらにパディングを縮小 */
    }

    .confirmation-title {
      margin: 0 0 15px 0;
      font-size: 15px;
    }

    .warning-section {
      margin-bottom: 15px;
    }

    .guidelines-container {
      margin-bottom: 20px;
    }

    .guidelines-grid {
      gap: 12px; /* グリッドのギャップを縮小 */
    }

    .guideline-text {
      font-size: 11px; /* テキストサイズを縮小 */
    }
  }

  /* 非常に小さい画面の場合 */
  @media (max-height: 500px) {
    .confirmation-screen {
      padding: 5px 0 0 0; /* 最小限の上部余白 */
    }

    .confirmation-content {
      max-height: calc(100vh - 5px); /* ほぼ全画面を使用 */
      padding: 20px 16px 20px 16px; /* パディングを最小限に */
    }

    .confirmation-title {
      margin: 0 0 12px 0;
      font-size: 14px;
    }

    .warning-section {
      margin-bottom: 12px;
    }

    .guidelines-container {
      margin-bottom: 15px;
    }

    .guidelines-grid {
      gap: 10px;
    }

    .guideline-text {
      font-size: 10px;
    }

    .confirm-button {
      padding: 12px 18px; /* ボタンパディングも縮小 */
      font-size: 15px;
    }
  }
</style>
