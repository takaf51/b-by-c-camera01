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
          '撮影の流れをご説明します。下記ステップで進めていきます。',
          '',
          '1. 撮影前の注意事項を確認後に撮影を開始する',
          '2. ガイドに従って、顔の位置や角度を調整する',
          '3. 撮影できるまで姿勢を保持する',
          '4. 撮影後、解析結果を確認し画像をアップロードする',
        ],
        hasImage: false,
        imageAlt: '',
        imageSrc: '',
        buttons: [{ text: '次へ', action: 'next', variant: 'primary' }],
      },
      {
        title: '顔の位置の調整',
        content: [
          '顔をPROガイドに合わせてください。',
          '赤い枠が表示されます。顔の位置や角度を調整して',
          'ください。',
        ],
        hasImage: true,
        imageAlt: '顔の位置調整のガイド画面',
        imageSrc: '/assets/images/tutorial/tutorial-1.png',
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '顔の左右の向きの合わせ方',
        content: [
          '左右ピンクの点が中央に来るように調整されています。左右の',
          '方向を整えながら、顔の向きを調整してください。',
        ],
        hasImage: true,
        imageAlt: '左右の向き調整ガイド',
        imageSrc: '/assets/images/tutorial/tutorial-2.png',
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '顔の上下の向きの合わせ方',
        content: [
          '上下にピンクの点が中央に来るように調整されています。左右の',
          '方向を整えながら、顔の向きを調整してください。',
        ],
        hasImage: true,
        imageAlt: '上下の向き調整ガイド',
        imageSrc: '/assets/images/tutorial/tutorial-3.png',
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '顔の傾きの合わせ方',
        content: [
          '左右耳の上にピンクの点が中央に来るように調整されています。',
          '頭部の傾きを調整しながら、顔の向きを調整してください。',
        ],
        hasImage: true,
        imageAlt: '傾き調整ガイド',
        imageSrc: '/assets/images/tutorial/tutorial-4.png',
        buttons: [
          { text: '戻る', action: 'prev', variant: 'secondary' },
          { text: '次へ', action: 'next', variant: 'primary' },
        ],
      },
      {
        title: '撮影準備',
        content: [
          '撮影準備が整いました。顔の位置を調整してから',
          '真正面を向いてください。撮影が始まります。',
        ],
        hasImage: true,
        imageAlt: '撮影準備完了画面',
        imageSrc: '/assets/images/tutorial/tutorial-5.png',
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

        <div class="tutorial-text">
          {#each currentPageData.content as line}
            {#if line === ''}
              <br />
            {:else}
              <p>{line}</p>
            {/if}
          {/each}
        </div>

        <!-- Page indicator -->
        <div class="page-indicator">
          {#each Array(totalPages) as _, index}
            <div
              class="page-dot"
              class:active={index === currentPage}
              on:click={() => (currentPage = index)}
            ></div>
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
    padding: 20px;
  }

  .tutorial-modal {
    background: white;
    border-radius: 20px;
    width: calc(100vw - 40px);
    max-width: none;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .tutorial-content {
    padding: 20px;
    overflow-y: auto;
    max-height: 90vh;
    text-align: center;
  }

  .tutorial-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 15px 0;
  }

  .tutorial-image-container {
    margin: 15px 0;
    display: flex;
    justify-content: center;
  }

  .tutorial-image {
    width: 220px;
    height: 338px;
    object-fit: cover;
    border-radius: 12px;
    border: 2px solid #e9ecef;
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
    font-size: 12px;
    margin: 0;
    text-align: center;
    padding: 0 10px;
  }

  .tutorial-text {
    text-align: left;
    line-height: 1.6;
    color: #333;
    margin-bottom: 20px;
    font-size: 14px;
  }

  .tutorial-text p {
    margin: 0 0 8px 0;
  }

  .page-indicator {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 20px 0;
  }

  .page-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #dee2e6;
    cursor: pointer;
    transition: background 0.2s;
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
    gap: 15px;
    justify-content: space-between;
    align-items: center;
  }

  .tutorial-actions.single-button {
    justify-content: flex-end;
  }

  .tutorial-button {
    padding: 15px 20px;
    border-radius: 25px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    font-size: 16px;
    min-width: 100px;
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
    background: #f8f9fa;
    color: #6c757d;
    border: 1px solid #dee2e6;
  }

  .tutorial-button.secondary:hover {
    background: #e9ecef;
    transform: translateY(-1px);
  }
</style>
