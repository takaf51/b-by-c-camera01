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

        <!-- 顔位置フレーム -->
        <div class="face-frame">
          <div class="frame-corner top-left"></div>
          <div class="frame-corner top-right"></div>
          <div class="frame-corner bottom-left"></div>
          <div class="frame-corner bottom-right"></div>

          <!-- 顔の中心点 -->
          <div class="face-center-dot"></div>
        </div>

        <!-- 鼻の位置に点を表示（PHPと同じ実装） -->
        {#if nosePosition}
          <div
            class="nose-dot"
            style="left: {nosePosition.x}px; top: {nosePosition.y}px;"
            title="鼻の位置"
          ></div>
        {/if}

        <!-- ガイダンス矢印 - 円形フレームに沿った曲線矢印 -->
        {#if guidanceDirection && showPoseGuidance}
          <div
            class="guidance-arrow-container {guidanceDirection} {mirrorMode
              ? 'mirror'
              : ''}"
          >
            <svg
              class="guidance-arrow-svg"
              viewBox="0 0 120 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              {#if guidanceDirection === 'turn-left'}
                <!-- 左向き曲線矢印 - 円弧に沿った形 -->
                <path
                  d="M 85 35 Q 35 35 35 60 Q 35 85 85 85"
                  fill="none"
                  stroke="#ff4444"
                  stroke-width="5"
                  stroke-linecap="round"
                />
                <polygon points="28,55 40,48 40,58 35,65" fill="#ff4444" />
              {:else if guidanceDirection === 'turn-right'}
                <!-- 右向き曲線矢印 - 円弧に沿った形 -->
                <path
                  d="M 35 35 Q 85 35 85 60 Q 85 85 35 85"
                  fill="none"
                  stroke="#ff4444"
                  stroke-width="5"
                  stroke-linecap="round"
                />
                <polygon points="92,55 80,48 80,58 85,65" fill="#ff4444" />
              {:else if guidanceDirection === 'look-up'}
                <!-- 上向き曲線矢印 - 円弧に沿った形 -->
                <path
                  d="M 35 85 Q 35 35 60 35 Q 85 35 85 85"
                  fill="none"
                  stroke="#ff4444"
                  stroke-width="5"
                  stroke-linecap="round"
                />
                <polygon points="55,28 62,40 72,40 65,35" fill="#ff4444" />
              {:else if guidanceDirection === 'look-down'}
                <!-- 下向き曲線矢印 - 円弧に沿った形 -->
                <path
                  d="M 35 35 Q 35 85 60 85 Q 85 85 85 35"
                  fill="none"
                  stroke="#ff4444"
                  stroke-width="5"
                  stroke-linecap="round"
                />
                <polygon points="55,92 62,80 72,80 65,85" fill="#ff4444" />
              {:else if guidanceDirection === 'tilt-left'}
                <!-- 左傾き曲線矢印 - 回転を示す円弧 -->
                <path
                  d="M 75 25 Q 45 45 60 75 Q 75 95 95 75"
                  fill="none"
                  stroke="#ff4444"
                  stroke-width="5"
                  stroke-linecap="round"
                />
                <polygon points="70,18 82,25 77,32 65,25" fill="#ff4444" />
              {:else if guidanceDirection === 'tilt-right'}
                <!-- 右傾き曲線矢印 - 回転を示す円弧 -->
                <path
                  d="M 45 25 Q 75 45 60 75 Q 45 95 25 75"
                  fill="none"
                  stroke="#ff4444"
                  stroke-width="5"
                  stroke-linecap="round"
                />
                <polygon points="50,18 38,25 43,32 55,25" fill="#ff4444" />
              {/if}
            </svg>
          </div>
        {/if}

        <div class="face-guide-text">顔を右にむけてください</div>
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
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    width: 100%;
    max-width: 600px;
    padding: 0 1rem;
  }

  .guidance-message {
    background: linear-gradient(
      135deg,
      rgba(255, 152, 0, 0.95),
      rgba(255, 111, 0, 0.95)
    );
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
    animation: messageSlideIn 0.3s ease-out;
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

  /* 顔位置フレーム */
  .face-frame {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 300px;
    height: 400px;
    border: 3px solid #007bff;
    border-radius: 15px;
    background: rgba(0, 123, 255, 0.1);
  }

  .frame-corner {
    position: absolute;
    width: 30px;
    height: 30px;
    border: 4px solid #007bff;
  }

  .frame-corner.top-left {
    top: -4px;
    left: -4px;
    border-right: none;
    border-bottom: none;
    border-radius: 15px 0 0 0;
  }

  .frame-corner.top-right {
    top: -4px;
    right: -4px;
    border-left: none;
    border-bottom: none;
    border-radius: 0 15px 0 0;
  }

  .frame-corner.bottom-left {
    bottom: -4px;
    left: -4px;
    border-right: none;
    border-top: none;
    border-radius: 0 0 0 15px;
  }

  .frame-corner.bottom-right {
    bottom: -4px;
    right: -4px;
    border-left: none;
    border-top: none;
    border-radius: 0 0 15px 0;
  }

  .face-center-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: #ff6b6b;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(255, 107, 107, 0.8);
  }

  /* 鼻の位置に表示する点（PHPと同じ実装） */
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

  /* ガイダンス矢印 - 円形フレームに沿った曲線矢印 */
  .guidance-arrow-container {
    position: absolute;
    z-index: 15;
    animation: pulse 1.5s ease-in-out infinite;
    width: 120px;
    height: 120px;
  }

  .guidance-arrow-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
  }

  /* 各方向の矢印の位置調整 - 顔フレーム（300px×400px）の周囲に配置 */
  .guidance-arrow-container.turn-left {
    top: 50%;
    left: calc(50% - 210px); /* 顔フレーム左端から60px外側 */
    transform: translateY(-50%);
  }

  .guidance-arrow-container.turn-right {
    top: 50%;
    right: calc(50% - 210px); /* 顔フレーム右端から60px外側 */
    transform: translateY(-50%);
  }

  .guidance-arrow-container.look-up {
    top: calc(50% - 260px); /* 顔フレーム上端から60px外側 */
    left: 50%;
    transform: translateX(-50%);
  }

  .guidance-arrow-container.look-down {
    bottom: calc(50% - 260px); /* 顔フレーム下端から60px外側 */
    left: 50%;
    transform: translateX(-50%);
  }

  .guidance-arrow-container.tilt-left {
    top: calc(50% - 180px); /* 顔フレーム上部左側 */
    left: calc(50% - 180px);
  }

  .guidance-arrow-container.tilt-right {
    top: calc(50% - 180px); /* 顔フレーム上部右側 */
    right: calc(50% - 180px);
  }

  /* ミラーモード時の矢印の向きを修正 */
  .guidance-arrow-container.mirror.turn-left {
    right: calc(50% - 210px);
    left: auto;
  }

  .guidance-arrow-container.mirror.turn-right {
    left: calc(50% - 210px);
    right: auto;
  }

  .guidance-arrow-container.mirror.tilt-left {
    right: calc(50% - 180px);
    left: auto;
  }

  .guidance-arrow-container.mirror.tilt-right {
    left: calc(50% - 180px);
    right: auto;
  }

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

  .face-guide-text {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    background: rgba(0, 0, 0, 0.6);
    padding: 8px 16px;
    border-radius: 20px;
    backdrop-filter: blur(5px);
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
