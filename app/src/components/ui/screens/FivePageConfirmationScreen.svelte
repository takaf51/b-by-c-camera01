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

  function getRedText(page: number): string | null {
    switch (page) {
      case 1:
        return 'ワーク前後で写真を比較し、計測を行います。正確な結果を得るため、以下ご注意ください。';
      case 2:
        return 'ワーク前後で写真を比較し、計測を行います。正確な結果を得るため、以下ご注意ください。';
      default:
        return null;
    }
  }

  function getBottomText(page: number): string | null {
    switch (page) {
      case 1:
        return 'おでこの生え際が写るように、前髪はターバンやピンで留めてください。';
      case 2:
        return '直射日光を避け、 室内の日光が入らない場所で撮影をしてください。また、顔に影がかからないようご注意ください。';
      default:
        return null;
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

        {#if currentPage <= 2}
          <!-- 1-2ページ: 赤いテキスト -->
          {#if getRedText(currentPage)}
            <div class="red-text">{getRedText(currentPage)}</div>
          {/if}
        {:else if currentPage === 3}
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
            <img
              src="/assets/images/confirm/page1/top.png"
              alt="撮影環境上部画像"
              class="page1-top-img"
            />
            <img
              src="/assets/images/confirm/page1/bottom.png"
              alt="撮影環境下部画像"
              class="page1-bottom-img"
            />
          </div>
        {:else if currentPage === 2}
          <!-- ページ2: 顔の隠れ -->
          <div class="page2-layout">
            <img
              src="/assets/images/confirm/page2/top.png"
              alt="撮影時注意点上部画像"
              class="page2-top-img"
            />
            <img
              src="/assets/images/confirm/page2/bottom.png"
              alt="撮影時注意点下部画像"
              class="page2-bottom-img"
            />
          </div>
        {:else if currentPage >= 3}
          <!-- ページ3-5: 背景画像はconfirmation-contentに適用 -->
          <div class="background-spacer"></div>
        {/if}
      </div>

      <!-- ボタンエリア -->
      <div class="button-area">
        {#if currentPage <= 2}
          <!-- 1-2ページ: 下部テキスト + 確認しましたボタン -->
          {#if getBottomText(currentPage)}
            <div class="bottom-text">{getBottomText(currentPage)}</div>
          {/if}
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

  /* ページ3以降のヘッダーセクション */
  .content-scaler:has(.background-spacer) .header-section {
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

  /* 1-2ページの赤いテキスト */
  .red-text {
    color: #d2294c;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.6;
    text-align: center;
    padding: 0 20px;
    margin-top: 10px;
    margin-bottom: 12px;
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
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 0;
  }

  .page1-top-img {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 48%;
    object-fit: contain;
    align-self: center;
  }

  .page1-bottom-img {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 48%;
    object-fit: contain;
    align-self: center;
  }

  /* ページ2レイアウト */
  .page2-layout {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 0;
  }

  .page2-top-img {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 48%;
    object-fit: contain;
    align-self: center;
  }

  .page2-bottom-img {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 48%;
    object-fit: contain;
    align-self: center;
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
    flex-direction: column;
    align-items: center;
    margin-top: 30px;
    flex-shrink: 0;
    position: relative;
    z-index: 100;
  }

  /* 下部テキスト（1-2ページ） */
  .bottom-text {
    color: #2c201e;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.6;
    text-align: center;
    margin-bottom: 20px;
    padding: 0 10px;
  }

  /* 3ページ用（右寄せ） */
  .button-area:has(.right-aligned) {
    flex-direction: row;
    justify-content: flex-end;
  }

  /* 4-5ページ用（両端配置） */
  .button-area:has(.prev-button) {
    flex-direction: row;
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
