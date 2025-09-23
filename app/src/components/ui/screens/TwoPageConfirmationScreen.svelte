<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import ConfirmationScreen from './ConfirmationScreen.svelte';

  const dispatch = createEventDispatcher();

  // ページ管理
  let currentPage = 1;

  // bind:this で実際のDOM要素を取得するための変数（1ページ目用）
  let screenElement: HTMLDivElement;
  let contentElement: HTMLDivElement;
  let scalerElement: HTMLDivElement;

  // デザインデータ上のコンテンツの基準となる高さ (px)
  const BASE_CONTENT_HEIGHT = 760;

  /**
   * 画面の高さに応じて、コンテンツのスケールとコンテナの高さを調整する関数
   */
  function adjustScale() {
    if (!scalerElement || !contentElement || !screenElement) return;

    const availableHeight = screenElement.clientHeight - 20;

    if (availableHeight < BASE_CONTENT_HEIGHT) {
      const scale = availableHeight / BASE_CONTENT_HEIGHT;
      const scaledHeight = BASE_CONTENT_HEIGHT * scale;

      contentElement.style.height = `${scaledHeight}px`;
      scalerElement.style.transform = `scale(${scale})`;
    } else {
      contentElement.style.height = `${BASE_CONTENT_HEIGHT}px`;
      scalerElement.style.transform = 'scale(1)';
    }
  }

  // イベントハンドラ
  function handleCancel() {
    dispatch('cancel');
  }

  function handlePage1Next() {
    console.log('Page 1 Next button clicked');
    console.log('📄 確認画面2ページ目に移行します');
    currentPage = 2;

    // MediaPipe pre-initialization already started on page 1
    dispatch('page2-reached');
  }

  function handlePage2Back() {
    currentPage = 1;
  }

  function handlePage2Confirm() {
    dispatch('confirm');
  }

  onMount(() => {
    if (screenElement) {
      screenElement.focus();
    }

    adjustScale();
    window.addEventListener('resize', adjustScale);
    setTimeout(adjustScale, 100);

    // Start MediaPipe pre-initialization immediately on page 1
    console.log('🚀 確認画面1ページ目表示、MediaPipeの事前初期化を開始します');
    dispatch('start-preinitialization');

    return () => {
      window.removeEventListener('resize', adjustScale);
    };
  });
</script>

{#if currentPage === 1}
  <!-- 1ページ目: 施術後の写真アップロード説明 -->
  <div
    class="confirmation-screen"
    bind:this={screenElement}
    on:click={handleCancel}
    on:keydown={e => e.key === 'Escape' && handleCancel()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="confirmation-content"
      bind:this={contentElement}
      on:click|stopPropagation
    >
      <div class="content-scaler" bind:this={scalerElement}>
        <h2 class="confirmation-title">撮影の前にご確認ください</h2>

        <div class="warning-section">
          <div class="warning-line">
            <p>前後の比較はデータ分析されます。</p>
          </div>
          <div class="warning-text">
            <p>正確な結果を得るため、以下の通りご撮影ください。</p>
          </div>
        </div>

        <div class="guidelines-container">
          <!-- 上部の2枚セット -->
          <div class="guideline-set">
            <div class="guideline-images">
              <div class="guideline-item good">
                <div class="guideline-frame">
                  <img
                    src="/assets/images/upload-guide/good-lighting.png"
                    alt="太陽光が入らない場所での撮影"
                    class="guideline-image"
                  />
                </div>
              </div>

              <div class="guideline-item bad">
                <div class="guideline-frame">
                  <img
                    src="/assets/images/upload-guide/bad-lighting.png"
                    alt="太陽光が入る場所での撮影"
                    class="guideline-image"
                  />
                </div>
              </div>
            </div>

            <div class="guideline-descriptions">
              <p class="guideline-text-bold">
                太陽光が入らない場所で撮影を行う
              </p>
              <div class="warning-icon-line">
                <img
                  src="/assets/images/icon/exclamation-mark.png"
                  alt="注意"
                  class="warning-icon"
                />
                <p class="guideline-text-normal">
                  時間によって光が変わるので窓の近くは避けましょう
                </p>
              </div>
            </div>
          </div>

          <!-- 下部の2枚セット -->
          <div class="guideline-set">
            <div class="guideline-images">
              <div class="guideline-item good">
                <div class="guideline-frame">
                  <img
                    src="/assets/images/upload-guide/good-environment.png"
                    alt="常に同じ場所・照明での撮影"
                    class="guideline-image"
                  />
                </div>
              </div>

              <div class="guideline-item bad">
                <div class="guideline-frame">
                  <img
                    src="/assets/images/upload-guide/bad-environment.png"
                    alt="異なる環境での撮影"
                    class="guideline-image"
                  />
                </div>
              </div>
            </div>

            <div class="guideline-descriptions">
              <p class="guideline-text-bold">
                常に同じ場所で、照明が同じ状態で撮影を行う
              </p>
              <div class="warning-icon-line">
                <img
                  src="/assets/images/icon/exclamation-mark.png"
                  alt="注意"
                  class="warning-icon"
                />
                <p class="guideline-text-normal">
                  白い壁の前や照明の状態を常に一定にするのがポイント
                </p>
              </div>
            </div>
          </div>
        </div>

        <button class="confirm-button" on:click={handlePage1Next}>
          確認しました
        </button>
      </div>
    </div>
  </div>
{:else if currentPage === 2}
  <!-- 2ページ目: 既存の確認画面をそのまま使用 -->
  <ConfirmationScreen
    on:confirm={handlePage2Confirm}
    on:cancel={handlePage2Back}
  />
{/if}

<style>
  /* 既存のConfirmationScreenと全く同じスタイルを使用 */
  .confirmation-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    height: 100dvh;
    background: rgba(34, 34, 34, 0.8);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    padding: 20px 0 0 0;
    box-sizing: border-box;
  }

  .confirmation-content {
    background: white;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 -5px 30px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    will-change: height;
  }

  .content-scaler {
    width: 100%;
    height: 740px;
    padding: 40px 24px;
    box-sizing: border-box;
    transform-origin: top;
    transition: transform 0.2s ease-out;
    will-change: transform;
  }

  .confirmation-title {
    text-align: center;
    margin: 0 0 25px 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
    flex-shrink: 0;
  }

  .warning-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 25px;
    flex-shrink: 0;
  }

  .warning-icon-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .warning-line p {
    margin: 0;
    color: #d2294c;
  }

  .warning-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: -1px;
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
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
  }

  .guideline-set {
    margin-bottom: 20px;
  }

  .guideline-set:last-child {
    margin-bottom: 0;
  }

  .guideline-images {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .guideline-descriptions {
    text-align: center;
  }

  .guideline-item {
    text-align: center;
  }

  .guideline-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 128/150;
    border-radius: 8px;
    margin-bottom: 0;
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

  .guideline-text-bold {
    font-size: 12px;
    color: #333;
    line-height: 1.4;
    margin: 0 0 4px 0;
    font-weight: 600;
  }

  .guideline-text-normal {
    font-size: 12px;
    color: #333;
    line-height: 1.4;
    margin: 0;
    font-weight: 400;
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
    flex-shrink: 0;
    margin-top: 12px;
  }

  .confirm-button:hover {
    background: #c5ce1f;
    transform: translateY(-1px);
  }
</style>
