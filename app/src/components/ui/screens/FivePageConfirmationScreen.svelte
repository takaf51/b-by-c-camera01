<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  // ページ管理
  let currentPage = 1;

  // bind:this で実際のDOM要素を取得するための変数
  let screenElement: HTMLDivElement;
  let contentElement: HTMLDivElement;
  let scalerElement: HTMLDivElement;

  // デザインデータ上のコンテンツの基準となる高さ (px)
  const BASE_CONTENT_HEIGHT = 740;

  /**
   * 画面の高さに応じて、コンテンツのスケールとコンテナの高さを調整する関数
   */
  function adjustScale() {
    if (!scalerElement || !contentElement || !screenElement) return;

    // 中央表示の場合、上下のパディング（40px）を考慮した利用可能な高さを計算
    const availableHeight = screenElement.clientHeight - 40;

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

  function handleNextPage() {
    if (currentPage < 5) {
      currentPage += 1;

      // 2ページ目に到達した際のイベント（MediaPipe初期化用）
      if (currentPage === 2) {
        dispatch('page2-reached');
      }
    }
  }

  function handlePrevPage() {
    if (currentPage > 1) {
      currentPage -= 1;
    }
  }

  function handleFinalConfirm() {
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

  function getMainTitle(page: number): string {
    switch (page) {
      case 1:
        return '撮影の前にご確認ください';
      case 2:
        return '撮影の前にご確認ください';
      case 3:
        return '撮影時の姿勢';
      case 4:
        return '顔の向きの合わせ方';
      case 5:
        return '顔の表情';
      default:
        return '撮影の前にご確認ください';
    }
  }
</script>

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
    class:page3-bg={currentPage === 3}
    class:page4-bg={currentPage === 4}
    class:page5-bg={currentPage === 5}
    bind:this={contentElement}
    on:click|stopPropagation
    on:keydown|stopPropagation
    role="dialog"
    tabindex="0"
  >
    <div class="content-scaler" bind:this={scalerElement}>
      <!-- ヘッダー部分 -->
      <div class="header-section">
        <!-- ページインジケーター（3、4、5ページ目のみ表示） -->
        {#if currentPage >= 3}
          <div class="page-indicator">
            {#each [1, 2, 3] as pageNum}
              <div
                class="indicator-dot"
                class:active={pageNum === currentPage - 2}
              >
                {pageNum}
              </div>
            {/each}
          </div>
        {/if}

        <h2 class="main-title">{getMainTitle(currentPage)}</h2>

        {#if currentPage === 3}
          <div class="subtitle">撮影は背景を伸ばして、顔を引く</div>
        {:else if currentPage === 4}
          <div class="subtitle">矢印の方向に合わせて顔の高さ・傾きを調整</div>
        {:else if currentPage === 5}
          <div class="subtitle">位置調整後、真顔へ。撮影は自動で開始</div>
        {/if}
      </div>

      <!-- メインコンテンツエリア -->
      <div class="main-content">
        {#if currentPage === 1}
          <!-- ページ1: 撮影環境 -->
          <div class="page1-layout">
            <div class="page1-image-container">
              <div class="page1-image top-left">
                <p class="page1-text above">太陽光が入らない場所で</p>
                <img
                  src="/assets/images/confirm/page1/bad-sun-light.png"
                  alt="太陽光が入らない場所での撮影"
                  class="page1-img"
                />
              </div>

              <div class="page1-image bottom-right">
                <img
                  src="/assets/images/confirm/page1/bad-different-light-and-place.png"
                  alt="異なる環境での撮影"
                  class="page1-img"
                />
                <p class="page1-text below">常に同じ場所で、照明が同じ状態で</p>
              </div>
            </div>
          </div>
        {:else if currentPage === 2}
          <!-- ページ2: 顔の隠れ -->
          <div class="page2-pyramid">
            <div class="pyramid-top">
              <p class="pyramid-text above">顔に髪がかかって耳が隠れている</p>
              <img
                src="/assets/images/confirm/page2/bad-hide-ear.png"
                alt="顔に髪がかかって耳が隠れている"
                class="pyramid-image"
              />
            </div>
            <div class="pyramid-middle">
              <img
                src="/assets/images/confirm/page2/good-image.png"
                alt="良い例"
                class="pyramid-good-image"
              />
            </div>
            <div class="pyramid-bottom">
              <div class="pyramid-bottom-item">
                <img
                  src="/assets/images/confirm/page2/bad-shadow.png"
                  alt="強い陰影"
                  class="pyramid-image"
                />
                <p class="pyramid-text below">顔に強い陰影</p>
              </div>
              <div class="pyramid-bottom-item">
                <img
                  src="/assets/images/confirm/page2/bad-background.png"
                  alt="背景が無地以外"
                  class="pyramid-image"
                />
                <p class="pyramid-text below">背景が無地以外</p>
              </div>
            </div>
          </div>
        {:else if currentPage >= 3}
          <!-- ページ3-5: 背景画像はconfirmation-contentに適用 -->
          <div class="background-spacer"></div>
        {/if}
      </div>

      <!-- ボタンエリア -->
      <div class="button-area">
        {#if currentPage <= 2}
          <!-- 1-2ページ: 確認しましたボタンのみ（中央） -->
          <button class="confirm-button" on:click={handleNextPage}>
            確認しました
          </button>
        {:else if currentPage === 3}
          <!-- 3ページ: 次へボタンのみ（右寄せ） -->
          <button class="next-button right-aligned" on:click={handleNextPage}>
            次へ
          </button>
        {:else if currentPage === 4}
          <!-- 4ページ: 前へ + 次へボタン -->
          <button class="prev-button" on:click={handlePrevPage}> 前へ </button>
          <button class="next-button" on:click={handleNextPage}> 次へ </button>
        {:else if currentPage === 5}
          <!-- 5ページ: 前へ + 撮影するボタン -->
          <button class="prev-button" on:click={handlePrevPage}> 前へ </button>
          <button class="shoot-button" on:click={handleFinalConfirm}>
            撮影する
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .confirmation-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    height: 100dvh;
    background: rgba(34, 34, 34, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;
  }

  .confirmation-content {
    background: #eeeae1; /* デフォルト：1、2、3ページ用 */
    border-radius: 20px;
    width: 100%;
    max-width: 400px;
    max-height: 90vh;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    will-change: height;
    position: relative;
  }

  /* 4、5ページ目の背景色 */
  .confirmation-content.page4-bg,
  .confirmation-content.page5-bg {
    background: #d6d5d1;
  }

  .content-scaler {
    width: 100%;
    height: 100%;
    padding: 24px;
    box-sizing: border-box;
    transform-origin: top;
    transition: transform 0.2s ease-out;
    will-change: transform;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* ヘッダーセクション */
  .header-section {
    text-align: center;
    flex-shrink: 0;
    position: relative;
    z-index: 100;
  }

  /* ページ1以外のヘッダーセクション */
  .content-scaler:not(:has(.page1-layout)) .header-section {
    margin-bottom: 30px;
  }

  /* ページインジケーター（3、4、5ページのみ） */
  .page-indicator {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 15px 0;
  }

  .indicator-dot {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #666;
    transition: all 0.3s ease;
  }

  .indicator-dot.active {
    background: #d2294c;
    color: white;
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .main-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 15px 0 10px 0;
    line-height: 1.4;
  }

  .subtitle {
    font-size: 15px;
    color: #666;
    margin-bottom: 0;
    font-weight: 700;
    font-style: bold;
  }

  /* メインコンテンツエリア */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  /* ページ1専用レイアウト */
  .page1-layout {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .page1-image-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .page1-image {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .page1-image.top-left {
    top: 0;
    left: 0;
    z-index: 1;
  }

  .page1-image.bottom-right {
    bottom: 0;
    right: 0;
    z-index: 2;
  }

  .page1-img {
    height: 250px;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .page1-text {
    font-size: 14px;
    color: #333;
    text-align: center;
    line-height: 1.3;
    font-weight: 500;
  }

  .page1-text.above {
    order: -1;
  }

  .page1-text.below {
    order: 1;
  }

  /* ページ2ピラミッドレイアウト */
  .page2-pyramid {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .pyramid-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .pyramid-middle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
  }

  .pyramid-bottom {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 16px;
  }

  .pyramid-bottom-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .pyramid-image {
    width: 160px;
    height: 200px;
    object-fit: cover;
    border-radius: 12px;
  }

  .pyramid-good-image {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 50%;
  }

  .pyramid-text {
    font-size: 14px;
    color: #333;
    margin: 12px 0;
    text-align: center;
    line-height: 1.3;
    font-weight: 500;
  }

  .pyramid-text.above {
    order: -1;
  }

  .pyramid-text.below {
    order: 1;
  }

  /* ページ3-5の背景画像をheader-section下からconfirmation-content下部まで */
  .confirmation-content.page3-bg {
    z-index: -1;
  }

  .confirmation-content.page3-bg::after {
    content: '';
    position: absolute;
    top: 140px; /* header-sectionの概算高さ分下から開始 */
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('/assets/images/confirm/page3/image.png');
    background-size: contain;
    background-position: center bottom;
    background-repeat: no-repeat;
    z-index: -1;
  }

  .confirmation-content.page4-bg {
    z-index: -1;
  }

  .confirmation-content.page4-bg::after {
    content: '';
    position: absolute;
    top: 140px; /* header-sectionの概算高さ分下から開始 */
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('/assets/images/confirm/page4/image.png');
    background-size: contain;
    background-position: center bottom;
    background-repeat: no-repeat;
    z-index: -1;
  }

  .confirmation-content.page5-bg {
    z-index: -1;
  }

  .confirmation-content.page5-bg::after {
    content: '';
    position: absolute;
    top: 140px; /* header-sectionの概算高さ分下から開始 */
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('/assets/images/confirm/page5/image.png');
    background-size: contain;
    background-position: center bottom;
    background-repeat: no-repeat;
    z-index: -1;
  }

  /* ページ3-5の背景用スペーサー */
  .background-spacer {
    flex: 1;
  }

  /* ボタンエリア */
  .button-area {
    display: flex;
    margin-top: 30px;
    flex-shrink: 0;
    position: relative;
    z-index: 100;
  }

  /* 1-2ページ用（中央配置） */
  .button-area:has(.confirm-button:only-child) {
    justify-content: center;
  }

  /* 3ページ用（右寄せ） */
  .button-area:has(.right-aligned) {
    justify-content: flex-end;
  }

  /* 4-5ページ用（両端配置） */
  .button-area:has(.prev-button) {
    justify-content: space-between;
    gap: 20px;
  }

  /* 基本ボタンスタイル */
  .button-area button {
    border: none;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 15px 30px;
    min-width: 120px;
  }

  /* 前へボタン（4、5ページ） - 黄緑色に変更 */
  .prev-button {
    background: #d6df22;
    color: black;
  }

  .prev-button:hover {
    background: #c5ce1f;
    transform: translateY(-1px);
  }

  /* 次へボタン（4ページ） */
  .next-button {
    background: #d6df22;
    color: black;
  }

  .next-button:hover {
    background: #c5ce1f;
    transform: translateY(-1px);
  }

  /* 確認しましたボタン（1-2ページ） */
  .confirm-button {
    background: #d6df22;
    color: black;
    width: 280px;
    max-width: 90%;
  }

  .confirm-button:hover {
    background: #c5ce1f;
    transform: translateY(-1px);
  }

  /* 撮影するボタン（5ページ） */
  .shoot-button {
    background: #d6df22;
    color: black;
  }

  .shoot-button:hover {
    background: #c5ce1f;
    transform: translateY(-1px);
  }
</style>
