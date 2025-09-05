<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let show: boolean = false;
  export let mode: 'before' | 'after' = 'before';
  export let autoStart: boolean = false; // 自動でチュートリアル開始するか

  // Tutorial state
  let currentPage = 0;
  let isVisible = false;

  // Tutorial content data
  const tutorialData = {
    before: [
      {
        title: '撮影の流れ',
        content: [
          '撮影の流れをご紹介します。下記ステップにて撮影を進めていきます。',
          '',
          '1. 撮影前の注意点を確認の上、撮影を始めるボタンを押す',
          '2. ガイドに従って、顔の位置や向きを調整する',
          '3. 調整ができると自動で撮影が始まりアップロードされます',
          '4. 施術後、施術後画像も同様に撮影します。',
          '',
          '施術後画像撮影時には、施術前画像の撮影時の位置ガイドが表示されます。そこに合わせて撮影を行ってください。',
        ],
        hasImage: true,
        imageAlt: '',
        imageSrc: '',
        hasFlowNumbers: true,
        buttons: [{ text: '次へ', action: 'next', variant: 'primary' }],
      },
      {
        title: '顔の位置の調整',
        content: [
          '正確な顔のデータ取得のため、<strong>撮影は背筋を伸ばして、顎を引いて真顔で</strong>おこなってください',
        ],
        hasImage: true,
        imageAlt: '顔の位置調整のガイド画面',
        imageSrc: '/assets/images/tutorial/tutorial-0.png',
        hasFlowNumbers: false,
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '顔の位置の調整',
        content: [
          '顔を円のガイドの中に入れてください。',
          '鼻から伸びる棒は、顔の向きや傾きのガイドです。',
        ],
        hasImage: true,
        imageAlt: '顔の位置調整のガイド画面',
        imageSrc: '/assets/images/tutorial/tutorial-1.png',
        hasFlowNumbers: false,
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '顔の左右の向きの合わせ方',
        content: [
          '左右にピンクの矢印が表示されています。矢印の方向を見ながら、顔の向きを調整してください。',
        ],
        hasImage: true,
        imageAlt: '左右の向き調整ガイド',
        imageSrc: '/assets/images/tutorial/tutorial-2.png',
        hasFlowNumbers: false,
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '顔の上下の向きの合わせ方',
        content: [
          '上下にピンクの矢印が表示されています。矢印の方向を見ながら、顔の向きを調整してください。',
        ],
        hasImage: true,
        imageAlt: '上下の向き調整ガイド',
        imageSrc: '/assets/images/tutorial/tutorial-3.png',
        hasFlowNumbers: false,
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '顔の傾きの合わせ方',
        content: [
          '左右斜め上にピンクの矢印が表示されています。矢印の方向を見ながら、顔の傾きを調整してください。',
        ],
        hasImage: true,
        imageAlt: '傾き調整ガイド',
        imageSrc: '/assets/images/tutorial/tutorial-4.png',
        hasFlowNumbers: false,
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '顔の表情',
        content: [
          '位置調整が終わったら、顔の表情を笑顔ではなく真顔にしてください。撮影が始まります。',
        ],
        hasImage: true,
        imageAlt: '顔の表情画面',
        imageSrc: '/assets/images/tutorial/tutorial-5.png',
        hasFlowNumbers: false,
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '撮影する', action: 'complete', variant: 'primary' },
        ],
      },
    ],
    after: [
      {
        title: 'After撮影について',
        content: [
          'Before撮影時の姿勢と同じ角度で撮影します。',
          '画面に表示される参照情報を確認しながら',
          '同じ姿勢を取ってください。',
        ],
        hasImage: false,
        imageAlt: '',
        imageSrc: '',
        hasFlowNumbers: false,
        buttons: [{ text: '撮影開始', action: 'complete', variant: 'primary' }],
      },
    ],
  };

  $: currentTutorial = tutorialData[mode];
  $: totalPages = currentTutorial.length;
  $: currentPageData = currentTutorial[currentPage];

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

        {#if currentPageData.hasFlowNumbers}
          <!-- Description text for flow page -->
          <div class="tutorial-description">
            <p>{currentPageData.content[0]}</p>
          </div>
          <!-- Flow steps with images -->
          <div class="flow-steps">
            <div class="flow-item">
              <img
                src="/assets/images/tutorial/flow-number-1.png"
                alt="1"
                class="flow-number"
              />
              <p class="flow-text">
                撮影前の注意点を確認の上、撮影を始めるボタンを押す
              </p>
            </div>
            <img
              src="/assets/images/tutorial/flow-under-arrow.png"
              alt="arrow"
              class="flow-arrow"
            />

            <div class="flow-item">
              <img
                src="/assets/images/tutorial/flow-number-2.png"
                alt="2"
                class="flow-number"
              />
              <p class="flow-text">ガイドに従って、顔の位置や向きを調整する</p>
            </div>
            <img
              src="/assets/images/tutorial/flow-under-arrow.png"
              alt="arrow"
              class="flow-arrow"
            />

            <div class="flow-item">
              <img
                src="/assets/images/tutorial/flow-number-3.png"
                alt="3"
                class="flow-number"
              />
              <p class="flow-text">
                調整ができると自動で撮影が始まりアップロードされます
              </p>
            </div>
            <img
              src="/assets/images/tutorial/flow-under-arrow.png"
              alt="arrow"
              class="flow-arrow"
            />

            <div class="flow-item">
              <img
                src="/assets/images/tutorial/flow-number-4.png"
                alt="4"
                class="flow-number"
              />
              <p class="flow-text">施術後、施術後画像も同様に撮影します。</p>
            </div>
          </div>

          <!-- Bottom description -->
          <div class="tutorial-bottom-description">
            <p>
              施術後画像撮影時には、施術前画像の撮影時の位置ガイドが表示されます。そこに合わせて撮影を行ってください。
            </p>
          </div>
        {:else}
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

          <!-- Description text below image -->
          <div class="tutorial-text">
            {#each currentPageData.content as line}
              {#if line === ''}
                <br />
              {:else}
                <p>{@html line}</p>
              {/if}
            {/each}
          </div>
        {/if}

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
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 16px;
  }

  .tutorial-modal {
    background: white;
    border-radius: 20px;
    width: calc(100vw - 32px);
    max-width: none;
    max-height: calc(100vh - 32px);
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
  }

  .tutorial-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
  }

  /* iPhone SEサイズ対応 (375px × 667px) */
  @media (max-height: 667px) {
    .tutorial-overlay {
      padding: 8px;
    }

    .tutorial-modal {
      width: calc(100vw - 16px);
      max-height: calc(100vh - 16px);
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
      border-radius: 12px;
    }

    .tutorial-content {
      padding: 12px;
    }
  }

  .tutorial-title {
    font-weight: 700;
    font-style: bold;
    font-size: 18px;
    line-height: 150%;
    letter-spacing: 0px;
    text-align: center;
    color: #333;
    margin: 0 0 20px 0;
    flex-shrink: 0;
  }

  .tutorial-image-container {
    margin: 10px 0;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .tutorial-image {
    width: 180px;
    height: 270px;
    object-fit: cover;
    border-radius: 12px;
    border: 2px solid #e9ecef;
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
      width: 150px;
      height: 225px;
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
      width: 130px;
      height: 195px;
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
    text-align: left;
    line-height: 150%;
    color: #333;
    margin-bottom: 16px;
    font-weight: 400;
    font-style: regular;
    font-size: 14px;
    letter-spacing: 0px;
    flex: 1;
  }

  .tutorial-text p {
    margin: 0 0 6px 0;
    font-weight: 400;
    font-style: regular;
    font-size: 14px;
    line-height: 150%;
    letter-spacing: 0px;
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

  /* New styles for flow tutorial */
  .tutorial-description {
    margin-bottom: 16px;
  }

  .tutorial-description p {
    font-weight: 400;
    font-style: regular;
    font-size: 14px;
    line-height: 150%;
    letter-spacing: 0px;
    color: #333;
    margin: 0;
    text-align: left;
  }

  .flow-steps {
    margin-bottom: 16px;
    flex: 1;
  }

  .flow-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .flow-number {
    width: 28px;
    height: 28px;
    transform: rotate(0deg);
    flex-shrink: 0;
  }

  .flow-text {
    font-weight: 700;
    font-style: bold;
    font-size: 13px;
    line-height: 150%;
    letter-spacing: 0px;
    color: #333;
    margin: 0;
    text-align: left;
  }

  .flow-arrow {
    width: 32px;
    height: 12px;
    margin: 4px auto;
    display: block;
  }

  .tutorial-bottom-description {
    margin-bottom: 16px;
  }

  .tutorial-bottom-description p {
    font-weight: 400;
    font-style: regular;
    font-size: 13px;
    line-height: 150%;
    letter-spacing: 0px;
    color: #333;
    margin: 0;
    text-align: left;
  }

  /* フロー画面の小画面対応 */
  @media (max-height: 667px) {
    .tutorial-description {
      margin-bottom: 12px;
    }

    .tutorial-description p {
      font-size: 13px;
    }

    .flow-steps {
      margin-bottom: 12px;
    }

    .flow-item {
      margin-bottom: 4px;
    }

    .flow-number {
      width: 24px;
      height: 24px;
    }

    .flow-text {
      font-size: 12px;
    }

    .flow-arrow {
      width: 28px;
      height: 10px;
      margin: 3px auto;
    }

    .tutorial-bottom-description {
      margin-bottom: 12px;
    }

    .tutorial-bottom-description p {
      font-size: 12px;
    }
  }

  @media (max-height: 600px) {
    .tutorial-description {
      margin-bottom: 10px;
    }

    .tutorial-description p {
      font-size: 12px;
    }

    .flow-steps {
      margin-bottom: 10px;
    }

    .flow-item {
      margin-bottom: 3px;
    }

    .flow-number {
      width: 20px;
      height: 20px;
    }

    .flow-text {
      font-size: 11px;
    }

    .flow-arrow {
      width: 24px;
      height: 8px;
      margin: 2px auto;
    }

    .tutorial-bottom-description {
      margin-bottom: 10px;
    }

    .tutorial-bottom-description p {
      font-size: 11px;
    }
  }
</style>
