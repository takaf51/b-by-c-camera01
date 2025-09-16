<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let show: boolean = false;
  export let autoStart: boolean = false; // 自動でチュートリアル開始するか

  // Tutorial state
  let currentPage = 0;
  let isVisible = false;

  // Tutorial content data - 統一された3画面構成
  const tutorialData: Array<{
    title: string;
    content: string[];
    hasImage: boolean;
    imageAlt: string;
    imageSrc: string;
    hasFlowNumbers: boolean;
    hasMultipleImages?: boolean;
    buttons: Array<{ text: string; action: string; variant: string }>;
  }> = [
    {
      title: '撮影時の姿勢',
      content: ['撮影は背筋を伸ばして、顎を引く'],
      hasImage: true,
      imageAlt: '撮影時の姿勢を示す横顔の画像',
      imageSrc: '/assets/images/tutorial/pose-guide.png',
      hasFlowNumbers: false,
      buttons: [{ text: '次へ', action: 'next', variant: 'primary' }],
    },
    {
      title: '顔の向きの合わせ方',
      content: ['矢印の方向に合わせ顔の向き・傾きを調整'],
      hasImage: true,
      imageAlt: '顔の向き調整を示す3つのガイド画像',
      imageSrc: '',
      hasFlowNumbers: false,
      hasMultipleImages: true,
      buttons: [
        { text: '前へ', action: 'prev', variant: 'secondary' },
        { text: '次へ', action: 'next', variant: 'primary' },
      ],
    },
    {
      title: '顔の表情',
      content: ['位置調整後、真顔へ。撮影が自動で開始'],
      hasImage: true,
      imageAlt: '顔の表情を示すグリッド付き画像',
      imageSrc: '/assets/images/tutorial/face-expression.png',
      hasFlowNumbers: false,
      buttons: [
        { text: '前へ', action: 'prev', variant: 'secondary' },
        { text: '撮影する', action: 'complete', variant: 'primary' },
      ],
    },
  ];

  $: totalPages = tutorialData.length;
  $: currentPageData = tutorialData[currentPage];

  // Reactive visibility control
  $: {
    if (show && !isVisible) {
      isVisible = true;
      currentPage = 0;
    } else if (!show && isVisible) {
      isVisible = false;
    }
  }

  // Auto start tutorial if enabled
  onMount(() => {
    if (autoStart && show) {
      isVisible = true;
    }
  });

  function handleButtonClick(action: string) {
    switch (action) {
      case 'next':
        if (currentPage < totalPages - 1) {
          currentPage++;
        }
        break;
      case 'prev':
        if (currentPage > 0) {
          currentPage--;
        }
        break;
      case 'complete':
        dispatch('complete');
        close();
        break;
      case 'skip':
        dispatch('skip');
        close();
        break;
    }
  }

  function close() {
    isVisible = false;
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isVisible) return;

    switch (event.key) {
      case 'ArrowLeft':
        if (currentPage > 0) {
          currentPage--;
        }
        break;
      case 'ArrowRight':
        if (currentPage < totalPages - 1) {
          currentPage++;
        }
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isVisible}
  <div class="tutorial-overlay">
    <div class="tutorial-modal">
      <!-- Content -->
      <div class="tutorial-content">
        <h2 class="tutorial-title">{currentPageData.title}</h2>

        <!-- 2番目の画面専用: 3つの画像レイアウト（説明テキストの上） -->
        {#if currentPageData.hasMultipleImages}
          <div class="face-alignment-guide">
            <!-- 上段：1つの画像 -->
            <div class="guide-top-row">
              <img
                src="/assets/images/tutorial/face-alignment-1.png"
                alt="顔の向き調整ガイド1"
                class="guide-image"
              />
            </div>
            <!-- 下段：2つの画像 -->
            <div class="guide-bottom-row">
              <img
                src="/assets/images/tutorial/face-alignment-2.png"
                alt="顔の向き調整ガイド2"
                class="guide-image"
              />
              <img
                src="/assets/images/tutorial/face-alignment-3.png"
                alt="顔の向き調整ガイド3"
                class="guide-image"
              />
            </div>
          </div>
        {:else}
          <!-- 1番目と3番目の画面：通常の画像表示 -->
          {#if currentPageData.hasImage && currentPageData.imageSrc}
            <div class="tutorial-image-container">
              <img
                src={currentPageData.imageSrc}
                alt={currentPageData.imageAlt}
                class="tutorial-image"
              />
            </div>
          {:else if currentPageData.hasImage}
            <div class="tutorial-image-container">
              <div class="tutorial-image-placeholder">
                <div class="image-icon">📷</div>
                <p class="image-alt">{currentPageData.imageAlt}</p>
              </div>
            </div>
          {/if}
        {/if}

        <!-- 説明テキスト -->
        <div class="tutorial-text">
          {#each currentPageData.content as line}
            {#if line === ''}
              <br />
            {:else}
              <p>{@html line}</p>
            {/if}
          {/each}
        </div>

        <!-- Action buttons -->
        <div
          class="tutorial-actions"
          class:single-button={currentPageData.buttons.length === 1}
        >
          {#each currentPageData.buttons as button}
            <button
              class="tutorial-button {button.variant}"
              on:click={() => handleButtonClick(button.action)}
            >
              {button.text}
            </button>
          {/each}
        </div>

        <!-- Page indicator -->
        <div class="page-indicator">
          {#each Array(totalPages) as _, index}
            <button
              class="page-dot"
              class:active={index === currentPage}
              on:click={() => (currentPage = index)}
              aria-label="Page {index + 1}"
            ></button>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .tutorial-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
  }

  .tutorial-modal {
    background: white;
    border-radius: 20px;
    width: calc(100vw - 40px);
    max-width: 390px;
    max-height: calc(100vh - 40px);
    max-height: calc(100dvh - 40px); /* iPhone Safari対応 */
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
  }

  .tutorial-content {
    padding: 32px 20px 20px 20px;
    overflow-y: auto;
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* iPhone SEサイズ対応 (375px × 667px) */
  @media (max-height: 667px) {
    .tutorial-overlay {
      padding: 8px;
    }

    .tutorial-modal {
      width: calc(100vw - 16px);
      max-height: calc(100vh - 16px);
      max-height: calc(100dvh - 16px); /* iPhone Safari対応 */
      border-radius: 16px;
    }

    .tutorial-content {
      padding: 16px;
    }
  }

  /* 非常に小さい画面対応 */
  @media (max-height: 600px) {
    .tutorial-overlay {
      padding: 4px;
    }

    .tutorial-modal {
      width: calc(100vw - 8px);
      max-height: calc(100vh - 8px);
      max-height: calc(100dvh - 8px); /* iPhone Safari対応 */
      border-radius: 12px;
    }

    .tutorial-content {
      padding: 12px;
    }
  }

  .tutorial-title {
    font-weight: 700;
    font-size: 20px;
    line-height: 1.3;
    text-align: center;
    color: #333;
    margin: 0 0 24px 0;
    flex-shrink: 0;
  }

  .tutorial-image-container {
    margin: 0 0 16px 0;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .tutorial-image {
    width: 280px;
    height: 400px;
    object-fit: cover;
    border-radius: 12px;
    background: #f5f5f5;
  }

  /* 小画面での画像サイズ調整 */
  @media (max-height: 667px) {
    .tutorial-title {
      margin: 0 0 16px 0;
      font-size: 16px;
    }

    .tutorial-image-container {
      margin: 8px 0;
    }

    .tutorial-image {
      width: 220px;
      height: 320px;
    }
  }

  @media (max-height: 600px) {
    .tutorial-title {
      margin: 0 0 12px 0;
      font-size: 15px;
    }

    .tutorial-image-container {
      margin: 6px 0;
    }

    .tutorial-image {
      width: 180px;
      height: 270px;
    }
  }

  .tutorial-image-placeholder {
    width: 280px;
    height: 200px;
    background: #f8f9fa;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .image-icon {
    font-size: 48px;
    margin-bottom: 8px;
    color: #6c757d;
  }

  .image-alt {
    color: #6c757d;
    font-weight: 400;
    font-style: regular;
    font-size: 12px;
    line-height: 150%;
    letter-spacing: 0px;
    margin: 0;
    text-align: center;
    padding: 0 10px;
  }

  .tutorial-text {
    text-align: center;
    line-height: 1.5;
    color: #333;
    margin-bottom: 16px;
    font-weight: 400;
    font-size: 16px;
    flex: 1;
  }

  .tutorial-text p {
    margin: 0;
    font-weight: 400;
    font-size: 16px;
    line-height: 1.5;
  }

  .page-indicator {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 16px 0 0 0;
    flex-shrink: 0;
  }

  /* 小画面でのテキストとインジケーター調整 */
  @media (max-height: 667px) {
    .tutorial-text {
      margin-bottom: 12px;
      font-size: 13px;
    }

    .tutorial-text p {
      margin: 0 0 4px 0;
      font-size: 13px;
    }

    .page-indicator {
      margin: 12px 0 0 0;
    }
  }

  @media (max-height: 600px) {
    .tutorial-text {
      margin-bottom: 10px;
      font-size: 12px;
    }

    .tutorial-text p {
      margin: 0 0 3px 0;
      font-size: 12px;
    }

    .page-indicator {
      margin: 10px 0 0 0;
    }
  }

  .page-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #dee2e6;
    cursor: pointer;
    transition: background 0.2s;
    border: none;
    padding: 0;
  }

  .page-dot.active {
    background: #e91e63;
  }

  .page-dot:hover {
    background: #adb5bd;
  }

  .page-dot.active:hover {
    background: #e91e63;
  }

  .tutorial-actions {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    margin-top: auto;
  }

  .tutorial-actions.single-button {
    justify-content: flex-end;
  }

  .tutorial-button {
    padding: 12px 18px;
    border-radius: 25px;
    font-weight: 700;
    font-style: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    font-size: 15px;
    line-height: 150%;
    letter-spacing: 0px;
    min-width: 90px;
  }

  /* 小画面でのボタン調整 */
  @media (max-height: 667px) {
    .tutorial-actions {
      gap: 10px;
    }

    .tutorial-button {
      padding: 10px 16px;
      font-size: 14px;
      min-width: 80px;
    }
  }

  @media (max-height: 600px) {
    .tutorial-actions {
      gap: 8px;
    }

    .tutorial-button {
      padding: 8px 14px;
      font-size: 13px;
      min-width: 70px;
    }
  }

  .tutorial-button.primary {
    background: #c4d736;
    color: #333;
  }

  .tutorial-button.primary:hover {
    background: #b8c62f;
    transform: translateY(-1px);
  }

  .tutorial-button.secondary {
    background: #d6df22;
    color: #333;
    border: 1px solid #dee2e6;
  }

  .tutorial-button.secondary:hover {
    background: #c5ce1f;
    transform: translateY(-1px);
  }

  /* 顔の向き調整ガイド用スタイル - ピラミッド型レイアウト */
  .face-alignment-guide {
    margin: 12px 0;
    flex-shrink: 0;
  }

  .guide-top-row {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
  }

  .guide-bottom-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }

  .guide-image-placeholder {
    width: 160px;
    height: 120px;
    border-radius: 12px;
    background: #f8f9fa;
    border: 2px solid #e9ecef;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .image-placeholder-text {
    color: #6c757d;
    font-size: 12px;
    margin: 4px 0 0 0;
    line-height: 1.3;
  }

  .guide-image {
    width: 200px;
    height: 200px;
    object-fit: contain;
    border-radius: 12px;
    background: transparent;
  }

  /* 小画面での調整 */
  @media (max-height: 667px) {
    .face-alignment-guide {
      margin: 12px 0;
    }

    .guide-top-row {
      margin-bottom: 10px;
    }

    .guide-bottom-row {
      gap: 12px;
      margin-bottom: 10px;
    }

    .guide-image-placeholder {
      width: 130px;
      height: 100px;
    }

    .guide-image {
      width: 160px;
      height: 160px;
    }

    .image-placeholder-text {
      font-size: 11px;
    }
  }

  @media (max-height: 600px) {
    .face-alignment-guide {
      margin: 8px 0;
    }

    .guide-top-row {
      margin-bottom: 8px;
    }

    .guide-bottom-row {
      gap: 8px;
      margin-bottom: 8px;
    }

    .guide-image-placeholder {
      width: 110px;
      height: 85px;
    }

    .guide-image {
      width: 130px;
      height: 130px;
    }

    .image-placeholder-text {
      font-size: 10px;
    }
  }
</style>
