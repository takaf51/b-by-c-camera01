<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
  }

  // --- SCRIPT ---

  // bind:this で実際のDOM要素を取得するための変数
  let screenElement: HTMLDivElement; // 全画面を覆う親要素
  let contentElement: HTMLDivElement; // 白い背景のコンテナ（高さが可変）
  let scalerElement: HTMLDivElement; // 実際にスケールされるコンテンツのラッパー

  // デザインデータ上のコンテンツの基準となる高さ (px)
  // この値を基準に縮小率が計算されます。
  const BASE_CONTENT_HEIGHT = 740;

  /**
   * 画面の高さに応じて、コンテンツのスケールとコンテナの高さを調整する関数
   */
  function adjustScale() {
    // 要素がまだ描画されていない場合は何もしない
    if (!scalerElement || !contentElement || !screenElement) return;

    // 親要素の上部padding(20px)を考慮した、コンテンツが利用できる最大の高さを計算
    const availableHeight = screenElement.clientHeight - 20;

    // 利用可能な高さが、コンテンツの基準の高さより小さい場合に縮小処理を実行
    if (availableHeight < BASE_CONTENT_HEIGHT) {
      const scale = availableHeight / BASE_CONTENT_HEIGHT;
      // 縮小後のコンテンツの実際の高さを計算
      const scaledHeight = BASE_CONTENT_HEIGHT * scale;

      // 1. 外側コンテナの高さを、スケール後のコンテンツの高さにピッタリ合わせる
      //    これにより、画面下部の余白問題が解消されます。
      contentElement.style.height = `${scaledHeight}px`;

      // 2. 内側のコンテンツラッパーを、計算した比率で縮小する
      scalerElement.style.transform = `scale(${scale})`;
    } else {
      // 画面サイズに十分な余裕がある場合は、元のサイズに戻す
      contentElement.style.height = `${BASE_CONTENT_HEIGHT}px`;
      scalerElement.style.transform = 'scale(1)';
    }
  }

  // コンポーネントが最初に画面に表示された時に一度だけ実行
  onMount(() => {
    // 初回のサイズ調整を実行
    adjustScale();

    // ウィンドウサイズが変更された時にも追従して調整するようにイベントを設定
    window.addEventListener('resize', adjustScale);

    // コンポーネントが破棄される時に、不要になったイベントを削除する（メモリリーク防止）
    return () => {
      window.removeEventListener('resize', adjustScale);
    };
  });
</script>

<div
  class="confirmation-screen"
  bind:this={screenElement}
  on:click={handleCancel}
>
  <div
    class="confirmation-content"
    bind:this={contentElement}
    on:click|stopPropagation
  >
    <div class="content-scaler" bind:this={scalerElement}>
      <h2 class="confirmation-title">撮影の前にご確認ください</h2>

      <div class="warning-section">
        <div class="warning-icon-line">
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
</div>

<style>
  .confirmation-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    height: 100dvh; /* iOSのツールバーなどを考慮した高さ */
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

    padding: 40px 24px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

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
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 0; /* flexアイテムの縮小を許可 */
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
    flex-shrink: 0;
    margin-top: 12px;
  }

  .confirm-button:hover {
    background: #c5ce1f;
    transform: translateY(-1px);
  }
</style>
