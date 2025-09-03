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
    padding: 0;
  }

  .confirmation-content {
    background: white;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 500px;
    height: auto;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    padding: 40px 24px 40px 24px;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
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
</style>
