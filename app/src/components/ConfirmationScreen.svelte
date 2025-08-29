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
      <div class="warning-icon">⚠️</div>
      <div class="warning-text">
        <p><strong>前後の比較はデータ分析されます。</strong></p>
        <p>正確な結果を得るため、以下の通りご撮影ください。</p>
      </div>
    </div>

    <div class="guidelines-container">
      <div class="guidelines-grid">
        <div class="guideline-item good">
          <div class="guideline-frame">
            <img
              src="/assets/images/checklist-good.png"
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
              src="/assets/images/checklist-bad-hair.png"
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
              src="/assets/images/checklist-bad-shadow.png"
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
              src="/assets/images/checklist-bad-background.png"
              alt="背景が無地以外の例"
              class="guideline-image"
            />
          </div>
          <p class="guideline-text">背景が<br />無地以外</p>
        </div>
      </div>
    </div>

    <button class="confirm-button" on:click={handleConfirm}>
      <span class="confirm-icon">✓</span>
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
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .confirmation-content {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    padding: 30px 25px;
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
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 25px;
    padding: 15px;
    background: #fff3cd;
    border-radius: 8px;
    border-left: 4px solid #ffc107;
  }

  .warning-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .warning-text {
    flex: 1;
  }

  .warning-text p {
    margin: 0 0 8px 0;
    color: #856404;
    font-size: 14px;
    line-height: 1.5;
  }

  .warning-text p:last-child {
    margin-bottom: 0;
  }

  .warning-text strong {
    font-weight: 600;
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
    aspect-ratio: 1;
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
    object-fit: cover;
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
    background: linear-gradient(135deg, #e91e63, #ad1457);
    border: none;
    color: white;
    padding: 15px 20px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 25px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .confirm-button:hover {
    background: linear-gradient(135deg, #ad1457, #880e4f);
    transform: translateY(-1px);
  }

  .confirm-icon {
    font-size: 18px;
  }

  /* モバイル対応 */
  @media (max-width: 768px) {
    .confirmation-screen {
      padding: 15px;
    }

    .confirmation-content {
      padding: 25px 20px;
    }

    .confirmation-title {
      font-size: 16px;
    }

    .warning-text p {
      font-size: 13px;
    }

    .guidelines-grid {
      gap: 12px;
    }

    .guideline-text {
      font-size: 11px;
    }

    .confirm-button {
      padding: 12px 16px;
      font-size: 15px;
    }
  }
</style>
