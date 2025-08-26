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

  // 2D correction props
  export let beforeImageData: string | null = null;
  export let correctionResult: any = null;

  let mounted = false;

  // 画面サイズ取得
  let innerWidth = 0;
  let innerHeight = 0;

  // 基準画面サイズ（iPhone 8）
  const BASE_WIDTH = 375;
  const BASE_HEIGHT = 667;

  // スケールファクター計算
  $: scaleFactor = Math.min(innerWidth / BASE_WIDTH, innerHeight / BASE_HEIGHT);

  // 矢印のサイズ調整（5倍スケール考慮、以前の良好な値ベース）
  $: arrowStrokeWidth = 2; // 以前の2pxが適切だった
  $: triangleWidth = 8; // 以前の25-17=8が適切だった
  $: triangleHeight = 4; // 以前の52-48=4が適切だった
  $: arrowGap = 0; // 以前は25で位置決めしていた

  // レスポンシブ対応：マスクの円と同じ基準（高さベース）で統一
  const MASK_RADIUS_PERCENT = 30; // マスクの円半径（%）
  const CENTER = 50; // viewBox中央

  // 画面のアスペクト比とマスクの円の実際のサイズを計算
  $: screenAspect = innerWidth / innerHeight;
  $: maskRadiusInViewBox = (MASK_RADIUS_PERCENT / 100) * 100; // 30% = 30 viewBox units

  // マスクの円は高さ基準なので、矢印位置も高さ基準で計算
  // 画面が横に広い場合は、マスクの円の実際の位置に合わせて調整
  $: heightToWidthRatio = innerHeight / innerWidth;
  $: effectiveRadius =
    maskRadiusInViewBox * Math.min(1, heightToWidthRatio * screenAspect);

  $: leftArrowX = CENTER - effectiveRadius + 5;
  $: rightArrowX = CENTER + effectiveRadius - 5;
  $: leftTriangleX = leftArrowX - 12;
  $: rightTriangleX = rightArrowX + 12;

  onMount(() => {
    mounted = true;
    console.log('🖥️ CameraPreview mounted with props:', {
      guidanceDirection,
      showPoseGuidance,
      mirrorMode,
    });
  });

  // デバッグ用：画面サイズと矢印位置をログ出力
  $: if (mounted && innerWidth > 0) {
    console.log('📱 Screen info:', {
      width: innerWidth,
      height: innerHeight,
      aspect: screenAspect.toFixed(2),
      heightToWidthRatio: heightToWidthRatio.toFixed(2),
      effectiveRadius: effectiveRadius.toFixed(1),
      leftArrowX: leftArrowX.toFixed(1),
      rightArrowX: rightArrowX.toFixed(1),
    });
  }

  // Watch for mode changes (debug enabled for troubleshooting)
  $: if (mounted && currentMode) {
    console.log(
      '🖥️ Mode changed:',
      currentMode,
      'CaptureMode.CONFIRMATION:',
      CaptureMode?.CONFIRMATION
    );

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
    console.log('📷 Camera start requested - going to confirmation screen');
    // 確認事項画面に遷移するイベントを発火
    const event = new CustomEvent('cameraStartRequested');
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

  // 確認事項完了ボタンのハンドラー
  function handleConfirmationComplete() {
    console.log('✅ Confirmation completed - going to guide screen');
    // 撮影例画面に遷移するイベントを発火
    const event = new CustomEvent('confirmationCompleted');
    window.dispatchEvent(event);
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

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
    {:else if currentMode === CaptureMode?.CONFIRMATION}
      <!-- 確認事項画面（復元版） -->
      <div class="confirmation-fullscreen">
        <div class="confirmation-modal-content">
          <h2 class="confirmation-modal-title">撮影の前にご確認ください</h2>

          <div class="confirmation-warning-section">
            <div class="confirmation-warning-icon">⚠️</div>
            <div class="confirmation-warning-text">
              <p><strong>前後の比較はデータ分析されます。</strong></p>
              <p>正確な結果を得るため、以下の通りご撮影ください。</p>
            </div>
          </div>

          <div class="confirmation-guidelines-container">
            <div class="confirmation-guidelines-grid">
              <div class="confirmation-guideline-item good">
                <div class="confirmation-guideline-frame">
                  <img
                    src="/assets/images/checklist-good.png"
                    alt="正しい撮影例"
                    class="confirmation-guideline-image"
                  />
                </div>
                <p class="confirmation-guideline-text">
                  顔の輪郭が明確、<br />明るく無地の背景
                </p>
              </div>

              <div class="confirmation-guideline-item bad">
                <div class="confirmation-guideline-frame">
                  <img
                    src="/assets/images/checklist-bad-hair.png"
                    alt="髪で耳が隠れている例"
                    class="confirmation-guideline-image"
                  />
                </div>
                <p class="confirmation-guideline-text">
                  顔に髪がかかって<br />耳が隠れている
                </p>
              </div>

              <div class="confirmation-guideline-item bad">
                <div class="confirmation-guideline-frame">
                  <img
                    src="/assets/images/checklist-bad-shadow.png"
                    alt="強い陰影がある例"
                    class="confirmation-guideline-image"
                  />
                </div>
                <p class="confirmation-guideline-text">
                  顔に強い陰影が<br />ついている
                </p>
              </div>

              <div class="confirmation-guideline-item bad">
                <div class="confirmation-guideline-frame">
                  <img
                    src="/assets/images/checklist-bad-background.png"
                    alt="背景が無地以外の例"
                    class="confirmation-guideline-image"
                  />
                </div>
                <p class="confirmation-guideline-text">背景が<br />無地以外</p>
              </div>
            </div>
          </div>

          <button
            class="confirmation-confirm-button"
            on:click={handleConfirmationComplete}
          >
            <span class="confirmation-confirm-icon">✓</span>
            確認しました
          </button>
        </div>
      </div>
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
          <div class="instruction-text">
            正確な顔のデータ取得のため、<br />
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
    {:else if currentMode === CaptureMode?.CORRECTION && correctionResult}
      <!-- 2D補正結果表示画面 -->
      <div class="correction-results-container">
        <div class="correction-header">
          <h2 class="correction-title">🔧 2D補正結果</h2>
          <p class="correction-subtitle">元画像と補正後画像の比較です</p>
        </div>

        <div class="correction-comparison">
          <div class="correction-item">
            <h3 class="correction-item-title">📸 元画像（Before）</h3>
            <img src={beforeImageData} alt="元画像" class="correction-image" />
            <div class="correction-info">
              <div class="pose-data">
                <strong>元姿勢:</strong><br />
                ロール: {correctionResult.originalPose.roll.toFixed(1)}°<br />
                ピッチ: {correctionResult.originalPose.pitch.toFixed(1)}°<br />
                ヨー: {correctionResult.originalPose.yaw.toFixed(1)}°
              </div>
            </div>
          </div>

          <div class="correction-item">
            <h3 class="correction-item-title">✨ 補正後画像</h3>
            <img
              src={correctionResult.correctedImageUrl}
              alt="補正後画像"
              class="correction-image"
            />
            <div class="correction-info">
              <div class="pose-data">
                <strong>補正後姿勢:</strong><br />
                ロール: {correctionResult.estimatedCorrectedPose.roll.toFixed(
                  1
                )}°<br />
                ピッチ: {correctionResult.estimatedCorrectedPose.pitch.toFixed(
                  1
                )}°<br />
                ヨー: {correctionResult.estimatedCorrectedPose.yaw.toFixed(1)}°
              </div>
              <div class="improvement-data">
                <strong>改善度:</strong><br />
                ロール: {Math.abs(
                  correctionResult.originalPose.roll -
                    correctionResult.estimatedCorrectedPose.roll
                ).toFixed(1)}°<br />
                ピッチ: {Math.abs(
                  correctionResult.originalPose.pitch -
                    correctionResult.estimatedCorrectedPose.pitch
                ).toFixed(1)}°<br />
                ヨー: {Math.abs(
                  correctionResult.originalPose.yaw -
                    correctionResult.estimatedCorrectedPose.yaw
                ).toFixed(1)}°
              </div>
            </div>
          </div>
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

        <!-- 鼻の位置の点は削除（ピノキオ棒をFaceDetectionで描画） -->
        <!-- SVG矢印 - コンテナ全体に広げて円弧で描画 -->
        {#if guidanceDirection && showPoseGuidance}
          {@const effectiveDirection =
            mirrorMode &&
            (guidanceDirection === 'turn-left' ||
              guidanceDirection === 'turn-right' ||
              guidanceDirection === 'tilt-left' ||
              guidanceDirection === 'tilt-right')
              ? guidanceDirection === 'turn-left'
                ? 'turn-right'
                : guidanceDirection === 'turn-right'
                  ? 'turn-left'
                  : guidanceDirection === 'tilt-left'
                    ? 'tilt-right'
                    : 'tilt-left'
              : guidanceDirection}
          {console.log('🎯 SVG Arrow Rendering:', {
            guidanceDirection,
            effectiveDirection,
            mirrorMode,
            showPoseGuidance,
            timestamp: new Date().toLocaleTimeString(),
          })}

          <div class="dynamic-elements">
            <svg class="arrow-svg" viewBox="0 0 100 100" style:opacity="1">
              {#if effectiveDirection === 'turn-left'}
                <!-- 左向き矢印 - レスポンシブ対応 -->
                <path
                  d="M {leftArrowX} 28.4 A 35 35 0 0 0 {leftArrowX} 71.6"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width={arrowStrokeWidth}
                  opacity="1"
                />
                <polygon
                  points="{leftTriangleX},50 {leftTriangleX +
                    2},53 {leftTriangleX + 2},47"
                  fill="#D2294C"
                />
              {:else if effectiveDirection === 'turn-right'}
                <!-- 右向き矢印 - レスポンシブ対応 -->
                <path
                  d="M {rightArrowX} 28.4 A 35 35 0 0 1 {rightArrowX} 71.6"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width={arrowStrokeWidth}
                  opacity="1"
                />
                <polygon
                  points="{rightTriangleX},50 {rightTriangleX -
                    2},53 {rightTriangleX - 2},47"
                  fill="#D2294C"
                />
              {:else if effectiveDirection === 'look-up'}
                <!-- 上向き矢印 - 左右矢印と同じクオリティで実装 -->
                <path
                  d="M 28.4 25 A 35 35 0 0 1 71.6 25"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width={arrowStrokeWidth}
                  opacity="1"
                />
                <polygon points="50,13 53,15 47,15" fill="#D2294C" />
              {:else if effectiveDirection === 'look-down'}
                <!-- 下向き矢印 - 左右矢印と同じクオリティで実装 -->
                <path
                  d="M 71.6 75 A 35 35 0 0 1 28.4 75"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width={arrowStrokeWidth}
                  opacity="1"
                />
                <polygon points="50,87 47,85 53,85" fill="#D2294C" />
              {:else if effectiveDirection === 'tilt-left'}
                <!-- 左傾き矢印 - 11時-12時から9時-10時の円弧（右傾きと対称） -->
                <path
                  d="M 43 20 A 35 35 0 0 0 20 48"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width={arrowStrokeWidth}
                  opacity="1"
                />
                <polygon points="22.5,47 18,46.5 20,50" fill="#D2294C" />
              {:else if effectiveDirection === 'tilt-right'}
                <!-- 右傾き矢印 - 0時-1時から2時-3時の円弧（調整版） -->
                <path
                  d="M 57 20 A 35 35 0 0 1 80 48"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width={arrowStrokeWidth}
                  opacity="1"
                />
                <polygon points="77.5,47 82,46.5 80,50" fill="#D2294C" />
              {:else}
                <!-- デフォルト: 右向き矢印 -->
                <path
                  d="M 50 25 A 25 25 0 0 1 75 50"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width="4"
                  opacity="1"
                />
                <polygon points="75,48 87,50 75,52" fill="#D2294C" />
              {/if}
            </svg>
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
    background-color: #222222;
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
    /* マスクの円半径を30%に設定（viewBox 100x100の30に対応） */
    mask: radial-gradient(circle at center, transparent 30%, black 31%);
    -webkit-mask: radial-gradient(circle at center, transparent 30%, black 31%);
  }

  /* nose-dot スタイルは削除（ピノキオ棒をFaceDetectionで描画） */
  /* SVG矢印コンテナ - コンテナ全体に広げる */
  .dynamic-elements {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 15;
    pointer-events: none;
  }

  /* SVG要素も100%に広げる */
  .arrow-svg {
    width: 100%;
    height: 100%;
    animation: pulse 1.5s ease-in-out infinite;
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* 確認事項画面のスタイル（復元版） */
  .confirmation-fullscreen {
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

  .confirmation-modal-content {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    padding: 30px 25px;
  }

  .confirmation-modal-title {
    text-align: center;
    margin: 0 0 25px 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
  }

  .confirmation-warning-section {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 25px;
    padding: 15px;
    background: #fff3cd;
    border-radius: 8px;
    border-left: 4px solid #ffc107;
  }

  .confirmation-warning-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .confirmation-warning-text {
    flex: 1;
  }

  .confirmation-warning-text p {
    margin: 0 0 8px 0;
    color: #856404;
    font-size: 14px;
    line-height: 1.5;
  }

  .confirmation-warning-text p:last-child {
    margin-bottom: 0;
  }

  .confirmation-warning-text strong {
    font-weight: 600;
  }

  .confirmation-guidelines-container {
    margin-bottom: 30px;
  }

  .confirmation-guidelines-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .confirmation-guideline-item {
    text-align: center;
  }

  .confirmation-guideline-frame {
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

  .confirmation-guideline-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }

  .confirmation-guideline-text {
    font-size: 12px;
    color: #333;
    line-height: 1.4;
    margin: 0;
    font-weight: 500;
  }

  .confirmation-confirm-button {
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

  .confirmation-confirm-button:hover {
    background: linear-gradient(135deg, #ad1457, #880e4f);
    transform: translateY(-1px);
  }

  .confirmation-confirm-icon {
    font-size: 18px;
  }

  /* Idle guide styles */
  .pre-capture-guide-container {
    width: 100%;
    height: 100%;
    background: #222222;
    color: white;
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 0 0 1rem 0;
  }

  .camera-startup-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: url('/assets/images/bg-bokeh.jpg') center/cover no-repeat;
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
    background: #222222;
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
    padding: 1rem 1.5rem;
    text-align: center;
    margin: 1rem 1.5rem 1rem 1.5rem;
    border-radius: 8px;
  }

  .instruction-text {
    font-size: 1rem;
    color: #d2294c;
    font-weight: normal;
    line-height: 1.5;
  }

  /* 撮影例画像セクション */
  .guide-image-section {
    background: white;
    padding: 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 1.5rem 1rem 1.5rem;
    border-radius: 8px;
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
    background: #222222;
    padding: 1rem 1.5rem 2rem 1.5rem;
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
    .confirmation-fullscreen {
      padding: 15px;
    }

    .confirmation-modal-content {
      padding: 25px 20px;
    }

    .confirmation-modal-title {
      font-size: 16px;
    }

    .confirmation-warning-text p {
      font-size: 13px;
    }

    .confirmation-guidelines-grid {
      gap: 12px;
    }

    .confirmation-guideline-text {
      font-size: 11px;
    }

    .confirmation-confirm-button {
      padding: 12px 16px;
      font-size: 15px;
    }

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

  /* 2D補正結果表示のスタイル */
  .correction-results-container {
    width: 100%;
    height: 100vh;
    background: #f5f5f5;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
  }

  .correction-header {
    text-align: center;
    margin-bottom: 30px;
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .correction-title {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 24px;
    font-weight: 600;
  }

  .correction-subtitle {
    margin: 0;
    color: #666;
    font-size: 16px;
  }

  .correction-comparison {
    display: flex;
    gap: 20px;
    max-width: 1000px;
    margin: 0 auto;
    flex-wrap: wrap;
    justify-content: center;
  }

  .correction-item {
    flex: 1;
    min-width: 300px;
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .correction-item-title {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
  }

  .correction-image {
    width: 100%;
    max-width: 300px;
    height: auto;
    border-radius: 8px;
    margin-bottom: 15px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .correction-info {
    font-size: 14px;
    color: #666;
    line-height: 1.6;
    text-align: left;
  }

  .pose-data {
    background: #e8f5e8;
    border: 1px solid #4caf50;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 10px;
  }

  .improvement-data {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    padding: 12px;
  }

  .pose-data strong,
  .improvement-data strong {
    color: #333;
    font-weight: 600;
  }

  /* モバイル対応 */
  @media (max-width: 768px) {
    .correction-results-container {
      padding: 15px;
    }

    .correction-comparison {
      flex-direction: column;
      gap: 15px;
    }

    .correction-item {
      min-width: auto;
    }

    .correction-title {
      font-size: 20px;
    }

    .correction-subtitle {
      font-size: 14px;
    }
  }
</style>
