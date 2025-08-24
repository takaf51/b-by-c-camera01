<script lang="ts">
  import { onMount } from 'svelte';

  // Props
  export let videoElement: HTMLVideoElement | undefined = undefined;
  export let canvasElement: HTMLCanvasElement | undefined = undefined;
  export let mirrorMode: boolean = false;
  export let showPoseGuidance: boolean = false;
  export let poseGuidanceMessage: string = '';
  export let poseGuidanceType: string = '';
  export let guidanceDirection: string | null = null;
  export let nosePosition: { x: number; y: number } | null = null;
  export let currentMode: string = 'idle';

  // Constants
  export let CaptureMode: any;
  export let previewImage: string | null = null;

  let mounted = false;

  onMount(() => {
    mounted = true;
    console.log('🖥️ CameraPreview mounted with props:', {
      guidanceDirection,
      showPoseGuidance,
      mirrorMode,
    });
  });

  // Watch for mode changes (debug disabled)
  $: if (mounted && currentMode) {
    // console.log('🖥️ Mode changed:', currentMode);

    // Additional check for video element issues
    if (videoElement && (currentMode === 'BEFORE' || currentMode === 'AFTER')) {
      setTimeout(() => {
        if (videoElement) {
          if (videoElement.readyState === 0 && videoElement.srcObject) {
            console.warn(
              '⚠️ Video element has stream but readyState is 0, forcing reload...'
            );
            videoElement.load();
          } else if (
            videoElement.readyState >= 2 &&
            videoElement.videoWidth > 0
          ) {
            // Force display update for ready videos
            videoElement.style.display = 'none';
            videoElement.offsetHeight; // Trigger reflow
            videoElement.style.display = '';
          }
        }
      }, 500);
    }
  }

  // カメラ起動ボタンのハンドラー
  function handleCameraStart() {
    console.log('📷 Camera start requested - starting actual capture');
    // モーダルを表示せず、直接撮影開始イベントを発火
    const event = new CustomEvent('startActualCapture');
    window.dispatchEvent(event);
  }

  // ファイル選択ボタンのハンドラー
  function handleFileSelect() {
    console.log('📁 File select requested');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
      const target = e.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (file) {
        console.log('📁 File selected:', file.name);
        // ファイル選択イベントを発火
        const event = new CustomEvent('fileSelected', { detail: file });
        window.dispatchEvent(event);
      }
    };
    input.click();
  }

  // 中止ボタンのハンドラー
  function handleCancel() {
    console.log('❌ Cancel requested');
    // 前のページに戻るイベントを発火
    const event = new CustomEvent('cancelRequested');
    window.dispatchEvent(event);
  }

  // 撮影開始ボタンのハンドラー（撮影例画面から）
  function handleStartCapture() {
    console.log('📷 Start capture from guide screen');
    // 実際の撮影開始イベントを発火
    const event = new CustomEvent('startCaptureRequested');
    window.dispatchEvent(event);
  }
</script>

<div class="preview-container">
  <!-- Mode indicator - デザインにないため削除 -->

  <!-- 姿勢ガイダンスメッセージ -->
  {#if showPoseGuidance && currentMode !== CaptureMode?.CAMERA_STARTUP}
    <div class="pose-guidance">
      <div class="guidance-message {poseGuidanceType}">
        {poseGuidanceMessage}
      </div>
    </div>
  {/if}

  <!-- ビデオエリア -->
  <div class="video-container">
    {#if (currentMode === CaptureMode?.PREVIEW_BEFORE || currentMode === CaptureMode?.PREVIEW_AFTER) && previewImage}
      <!-- プレビュー画像表示 -->
      <img
        src={previewImage}
        alt="撮影プレビュー"
        class="preview-image {mirrorMode ? 'mirror' : ''}"
      />
    {:else if currentMode === CaptureMode?.PRE_CAPTURE_GUIDE}
      <!-- 撮影例ガイド画面 - デザイン完全再現 -->
      <div class="pre-capture-guide-container">
        <!-- ヘッダー -->
        <div class="guide-header">
          <div class="header-icon">☀️</div>
          <div class="header-title">BEFORE写真の撮影</div>
        </div>

        <!-- 赤いバー -->
        <div class="guide-bar">準備ができたら撮影に進んでください</div>

        <!-- 白いテキストエリア -->
        <div class="guide-instructions">
          <div class="instruction-title">正確な顔のデータ取得のため、</div>
          <div class="instruction-subtitle">
            撮影は顔を引いて真顔でおこなってください
          </div>
        </div>

        <!-- 撮影例画像 -->
        <div class="guide-image-section">
          <img
            src="/assets/images/example-of-shooting.png"
            alt="撮影例"
            class="guide-example-image"
          />
          <div class="image-label">撮影例（イラスト予定）</div>
        </div>

        <!-- ボタンエリア -->
        <div class="guide-buttons">
          <button class="cancel-btn" on:click={handleCancel}>
            キャンセル
          </button>
          <button class="start-btn" on:click={handleStartCapture}>
            撮影を始める
          </button>
        </div>
      </div>
    {:else if currentMode === CaptureMode?.CAMERA_STARTUP}
      <!-- カメラ起動画面 - デザイン通り -->
      <div class="camera-startup-container">
        <!-- 背景に撮影された写真を表示 -->
        {#if previewImage}
          <img
            src={previewImage}
            alt="撮影された写真"
            class="startup-background-image"
          />
        {/if}

        <div class="startup-content">
          <h2 class="startup-title">
            はじめに施術前の写真を<br />アップロードしましょう
          </h2>

          <div class="startup-card">
            <div class="upload-icon">
              <div class="plus-icon">+</div>
            </div>

            <div class="startup-buttons">
              <button
                class="startup-button camera-button"
                on:click={handleCameraStart}
              >
                カメラを起動する
              </button>
              <button
                class="startup-button file-button"
                on:click={handleFileSelect}
              >
                ファイルを選択
              </button>
            </div>
          </div>

          <p class="startup-note">
            写真の精度によっては、正確に測定できない可能性が<br />
            あります。予めご了承ください。
          </p>

          <button class="skip-button" on:click={handleCancel}>
            中止する
          </button>
        </div>
      </div>
    {:else if (currentMode === CaptureMode?.BEFORE || currentMode === CaptureMode?.AFTER) && !previewImage}
      <!-- 撮影中のカメラビュー -->
      <video
        bind:this={videoElement}
        class="input-video {mirrorMode ? 'mirror' : ''}"
        autoplay
        playsinline
        muted
      ></video>
      <canvas
        bind:this={canvasElement}
        class="output-canvas {mirrorMode ? 'mirror' : ''}"
        width="640"
        height="480"
      ></canvas>

      <!-- 顔位置ガイド -->
      <div class="face-guide-overlay">
        <!-- グリッドライン -->
        <div class="grid-lines">
          <div class="grid-line horizontal" style="top: 33.33%"></div>
          <div class="grid-line horizontal" style="top: 66.66%"></div>
          <div class="grid-line vertical" style="left: 33.33%"></div>
          <div class="grid-line vertical" style="left: 66.66%"></div>
        </div>

        <!-- 円形マスク（中央を丸くくり抜く） -->
        <div class="face-circle-mask"></div>

        <!-- 鼻の位置に点を表示 -->
        {#if nosePosition}
          <div
            class="nose-dot"
            style="left: {nosePosition.x}px; top: {nosePosition.y}px;"
            title="鼻の位置"
          ></div>
        {/if}

        <!-- ガイダンス矢印 - 画像ベース -->
        {#if guidanceDirection && showPoseGuidance}
          {@const effectiveDirection =
            mirrorMode &&
            (guidanceDirection === 'turn-left' ||
              guidanceDirection === 'turn-right')
              ? guidanceDirection === 'turn-left'
                ? 'turn-right'
                : 'turn-left'
              : guidanceDirection}
          {console.log('🎯 SVG Arrow Rendering:', {
            guidanceDirection,
            effectiveDirection,
            mirrorMode,
            showPoseGuidance,
            timestamp: new Date().toLocaleTimeString(),
          })}
          <div class="guidance-arrow-image {effectiveDirection}">
            {#if effectiveDirection === 'turn-left'}
              <!-- 左向き矢印 SVG -->
              <svg
                class="arrow-svg"
                width="362"
                height="347"
                viewBox="0 0 362 347"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M50.272 269.773C47.9194 271.421 44.6696 270.852 43.0936 268.452C24.0031 239.369 14.0829 205.174 14.6914 170.31C15.3 135.446 26.4075 101.618 46.5014 73.2192C48.1602 70.8748 51.4279 70.4205 53.7215 72.1489C56.0151 73.8772 56.4657 77.1334 54.8114 79.481C36.0367 106.124 25.6602 137.824 25.09 170.491C24.5197 203.159 33.7837 235.202 51.6171 262.484C53.1884 264.888 52.6245 268.126 50.272 269.773Z"
                  fill="#D2294C"
                />
                <path
                  d="M-8.52372e-07 173.5L9.75 156.613L9.75 190.387L-8.52372e-07 173.5Z"
                  fill="#D2294C"
                />
              </svg>
            {:else if effectiveDirection === 'turn-right'}
              <!-- 右向き矢印 SVG（左向きを反転） -->
              <svg
                class="arrow-svg"
                width="362"
                height="347"
                viewBox="0 0 362 347"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="scale(-1, 1) translate(-362, 0)">
                  <path
                    d="M50.272 269.773C47.9194 271.421 44.6696 270.852 43.0936 268.452C24.0031 239.369 14.0829 205.174 14.6914 170.31C15.3 135.446 26.4075 101.618 46.5014 73.2192C48.1602 70.8748 51.4279 70.4205 53.7215 72.1489C56.0151 73.8772 56.4657 77.1334 54.8114 79.481C36.0367 106.124 25.6602 137.824 25.09 170.491C24.5197 203.159 33.7837 235.202 51.6171 262.484C53.1884 264.888 52.6245 268.126 50.272 269.773Z"
                    fill="#D2294C"
                  />
                  <path
                    d="M-8.52372e-07 173.5L9.75 156.613L9.75 190.387L-8.52372e-07 173.5Z"
                    fill="#D2294C"
                  />
                </g>
              </svg>
            {:else}
              <!-- その他の方向は右向きをベースに回転 -->
              <svg
                class="arrow-svg"
                width="362"
                height="347"
                viewBox="0 0 362 347"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="scale(-1, 1) translate(-362, 0)">
                  <path
                    d="M50.272 269.773C47.9194 271.421 44.6696 270.852 43.0936 268.452C24.0031 239.369 14.0829 205.174 14.6914 170.31C15.3 135.446 26.4075 101.618 46.5014 73.2192C48.1602 70.8748 51.4279 70.4205 53.7215 72.1489C56.0151 73.8772 56.4657 77.1334 54.8114 79.481C36.0367 106.124 25.6602 137.824 25.09 170.491C24.5197 203.159 33.7837 235.202 51.6171 262.484C53.1884 264.888 52.6245 268.126 50.272 269.773Z"
                    fill="#D2294C"
                  />
                  <path
                    d="M-8.52372e-07 173.5L9.75 156.613L9.75 190.387L-8.52372e-07 173.5Z"
                    fill="#D2294C"
                  />
                </g>
              </svg>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Status panel - デザインにないため削除 -->
</div>

<style>
  .preview-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  /* 撮影モード表示 */
  .mode-indicator {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3000;
  }

  .mode-badge {
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
  }

  .mode-badge.before {
    background: linear-gradient(135deg, #4ecdc4, #44a08d);
  }

  .mode-badge.after {
    background: linear-gradient(135deg, #ff9a9e, #fecfef);
    color: #333;
  }

  /* 姿勢ガイダンス */
  .pose-guidance {
    position: fixed;
    top: 20px;
    left: 0;
    right: 0;
    z-index: 2000;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 0;
  }

  .guidance-message {
    background: #d2294c;
    color: white;
    width: min(390px, 100vw);
    height: 47px;
    padding: 12px 16px;
    border-radius: 0;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    animation: messageSlideIn 0.3s ease-out;
    box-sizing: border-box;
    margin: 0;
  }

  .guidance-message.success {
    background: linear-gradient(
      135deg,
      rgba(76, 175, 80, 0.95),
      rgba(46, 125, 50, 0.95)
    ) !important;
  }

  .guidance-message.warning {
    background: linear-gradient(
      135deg,
      rgba(255, 152, 0, 0.95),
      rgba(255, 111, 0, 0.95)
    ) !important;
  }

  .guidance-message.error {
    background: linear-gradient(
      135deg,
      rgba(255, 107, 107, 0.95),
      rgba(255, 69, 58, 0.95)
    ) !important;
  }

  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .video-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    background-color: #000;
    overflow: hidden;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    max-width: 100vw;
    max-height: 100vh;
  }

  .input-video.mirror {
    transform: scaleX(-1);
  }

  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .preview-image.mirror {
    transform: scaleX(-1);
  }

  .output-canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    max-width: 100vw;
    max-height: 100vh;
    object-fit: contain;
  }

  .output-canvas.mirror {
    transform: translate(-50%, -50%) scaleX(-1);
  }

  /* 顔位置ガイド */
  .face-guide-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }

  /* グリッドライン */
  .grid-lines {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .grid-line {
    position: absolute;
    background: rgba(255, 255, 255, 0.3);
  }

  .grid-line.horizontal {
    width: 100%;
    height: 1px;
  }

  .grid-line.vertical {
    width: 1px;
    height: 100%;
  }

  /* 円形マスク（中央を丸くくり抜く） */
  .face-circle-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 5;
    pointer-events: none;
    mask: radial-gradient(
      circle at center,
      transparent min(150px, 25vw),
      black min(154px, 25.5vw)
    );
    -webkit-mask: radial-gradient(
      circle at center,
      transparent min(150px, 25vw),
      black min(154px, 25.5vw)
    );
  }

  .nose-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #ff0000;
    border: 2px solid white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    z-index: 15;
    box-shadow: 0 0 6px rgba(255, 0, 0, 0.6);
  }

  /* ガイダンス矢印 - SVGベース、レスポンシブ対応 */
  .guidance-arrow-image {
    position: absolute;
    z-index: 15;
    animation: pulse 1.5s ease-in-out infinite;
    width: min(90px, 18vw); /* SVGのアスペクト比に合わせて調整 */
    height: min(86px, 17vw); /* 362:347の比率を維持 */
  }

  .arrow-img {
    width: 100%;
    height: 100%;
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
  }

  .arrow-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
  }

  /* 矢印コンテナのスタイル */

  /* 各方向の矢印の位置調整 - 白い円（200px）の周囲に配置 */
  .guidance-arrow-image.turn-left {
    top: 50%;
    left: calc(50% - min(150px, 40vw)); /* 円の半径(100px) + 余白(50px) */
    transform: translateY(-50%); /* 左向き矢印画像を使用 */
  }

  .guidance-arrow-image.turn-right {
    top: 50%;
    right: calc(50% - min(150px, 40vw)); /* 円の半径(100px) + 余白(50px) */
    transform: translateY(-50%); /* 右向き矢印画像を使用 */
  }

  .guidance-arrow-image.look-up {
    top: calc(50% - min(150px, 40vw)); /* 円の半径(100px) + 余白(50px) */
    left: 50%;
    transform: translateX(-50%) rotate(-90deg); /* 右向き画像を90度回転 */
  }

  .guidance-arrow-image.look-down {
    bottom: calc(50% - min(150px, 40vw)); /* 円の半径(100px) + 余白(50px) */
    left: 50%;
    transform: translateX(-50%) rotate(90deg); /* 右向き画像を90度回転 */
  }

  .guidance-arrow-image.tilt-left {
    top: calc(50% - min(130px, 35vw)); /* 円の上部左側 */
    left: calc(50% - min(130px, 35vw));
    transform: rotate(135deg); /* 右向き画像を135度回転 */
  }

  .guidance-arrow-image.tilt-right {
    top: calc(50% - min(130px, 35vw)); /* 円の上部右側 */
    right: calc(50% - min(130px, 35vw));
    transform: rotate(-135deg); /* 右向き画像を-135度回転 */
  }

  /* ミラーモード時の特別な調整は不要 - effectiveDirectionで制御 */

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  /* Idle guide styles */
  .pre-capture-guide-container {
    width: 100%;
    height: 100%;
    background: #2c3e50;
    color: white;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .camera-startup-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);
    color: white;
    padding: 2rem 1rem;
    position: relative;
  }

  .startup-background-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0.3;
    z-index: 1;
  }

  .startup-content {
    text-align: center;
    max-width: 400px;
    width: 100%;
    position: relative;
    z-index: 2;
  }

  .startup-title {
    font-size: 1.3rem;
    font-weight: 600;
    margin: 0 0 2rem 0;
    line-height: 1.5;
  }

  .startup-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2rem 1.5rem;
    margin-bottom: 2rem;
    backdrop-filter: blur(10px);
  }

  .upload-icon {
    margin-bottom: 2rem;
  }

  .plus-icon {
    width: 60px;
    height: 60px;
    border: 3px solid rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 300;
    margin: 0 auto;
    color: rgba(255, 255, 255, 0.7);
  }

  .startup-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .startup-button {
    padding: 12px 24px;
    border-radius: 25px;
    border: none;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .camera-button {
    background: rgba(255, 255, 255, 0.9);
    color: #333;
  }

  .camera-button:hover {
    background: white;
    transform: translateY(-1px);
  }

  .file-button {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .file-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  .startup-note {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    margin: 0 0 2rem 0;
  }

  .skip-button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.8);
    padding: 10px 30px;
    border-radius: 20px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .skip-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
  }

  /* 撮影例画面のヘッダー */
  .guide-header {
    background: #2c3e50;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.2rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-icon {
    font-size: 1.5rem;
  }

  .header-title {
    color: white;
  }

  /* 赤いバー */
  .guide-bar {
    background: #c83e3e;
    color: white;
    padding: 1rem;
    text-align: center;
    font-size: 1rem;
    font-weight: 500;
  }

  /* 白いテキストエリア */
  .guide-instructions {
    background: white;
    color: #333;
    padding: 1.5rem;
    text-align: center;
  }

  .instruction-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: #333;
  }

  .instruction-subtitle {
    font-size: 1rem;
    color: #c83e3e;
    font-weight: 500;
  }

  /* 撮影例画像セクション */
  .guide-image-section {
    background: #f0f0f0;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    justify-content: center;
  }

  .guide-example-image {
    width: 300px;
    height: auto;
    max-width: 90%;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .image-label {
    background: white;
    color: #333;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
    border: 1px solid #ddd;
  }

  /* ボタンエリア */
  .guide-buttons {
    background: #2c3e50;
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
  }

  .cancel-btn {
    flex: 1;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: white;
    padding: 1rem;
    border-radius: 25px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .start-btn {
    flex: 1;
    background: #c4d736;
    border: none;
    color: #333;
    padding: 1rem;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .start-btn:hover {
    background: #b8c62f;
    transform: translateY(-1px);
  }

  .guide-subtitle {
    font-size: 1rem;
    margin-bottom: 2rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .illustration-container {
    background: white;
    border-radius: 15px;
    padding: 2rem;
    margin-bottom: 1rem;
  }

  .face-illustration-guide {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .face-outline {
    position: relative;
    width: 150px;
    height: 180px;
    margin-bottom: 1rem;
  }

  .face-features {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .face-contour {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 3px solid #333;
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    background: transparent;
  }

  .eye {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #333;
    border-radius: 50%;
    top: 50px;
  }

  .left-eye {
    left: 40px;
  }

  .right-eye {
    right: 40px;
  }

  .nose {
    position: absolute;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 20px;
    background: #333;
    border-radius: 2px;
  }

  .mouth {
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 3px;
    background: #333;
    border-radius: 2px;
  }

  .shooting-example-image {
    width: 200px;
    height: auto;
    max-width: 100%;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .illustration-label {
    color: #666;
    font-size: 0.9rem;
    margin: 0;
  }

  /* モバイル・タブレット最適化 */
  @media (max-width: 768px) {
    .guide-header {
      padding: 0.8rem;
      font-size: 1rem;
    }

    .guide-bar {
      padding: 0.8rem;
      font-size: 0.9rem;
    }

    .guide-instructions {
      padding: 1rem;
    }

    .instruction-title,
    .instruction-subtitle {
      font-size: 0.9rem;
    }

    .guide-image-section {
      padding: 1.5rem;
    }

    .guide-example-image {
      width: 250px;
    }

    .guide-buttons {
      padding: 1rem;
      gap: 0.8rem;
    }

    .cancel-btn,
    .start-btn {
      padding: 0.8rem;
      font-size: 0.9rem;
    }

    .video-container {
      border-radius: 0;
    }

    .mode-indicator {
      top: 80px;
    }

    .pose-guidance {
      top: 120px;
    }
  }
</style>
