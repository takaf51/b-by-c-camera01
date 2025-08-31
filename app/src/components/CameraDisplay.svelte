<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { PoseGuidanceDirection, PoseGuidanceType } from '../types/camera';

  const dispatch = createEventDispatcher();

  // Props - these will be bound from parent
  export let videoElement: HTMLVideoElement | undefined = undefined;
  export let canvasElement: HTMLCanvasElement | undefined = undefined;
  export let previewImage: string | null = null;
  export let mirrorMode: boolean = true;
  export let mode: 'before' | 'after' = 'before';
  export let isReady: boolean = false;

  // Pose guidance props
  export let showPoseGuidance: boolean = false;
  export let poseGuidanceMessage: string = '';
  export let poseGuidanceType: PoseGuidanceType | string = '';
  export let guidanceDirection: PoseGuidanceDirection | null = null;
  export let nosePosition: { x: number; y: number } | null = null;

  // Before reference props (for After mode)
  export let beforeReference: any = null;
  export let currentComparison: any = null;
  export let isAfterMode: boolean = false;

  // 画面サイズ取得
  let innerWidth = 0;
  let innerHeight = 0;

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<!-- 姿勢ガイダンスメッセージ -->
{#if showPoseGuidance && isReady}
  <div class="pose-guidance">
    <div class="guidance-message {poseGuidanceType}">
      {poseGuidanceMessage}
    </div>
  </div>
{/if}

<!-- Before参照情報表示（After撮影時のみ） -->
{#if isAfterMode && isReady}
  <div class="before-reference-info">
    {#if beforeReference}
      <div class="reference-status has-reference">
        <div class="reference-icon">📋</div>
        <div class="reference-text">
          <div class="reference-title">Before姿勢参照中</div>
          {#if currentComparison}
            <div class="match-percentage">
              マッチ度: {currentComparison.matchPercentage}%
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="reference-status no-reference">
        <div class="reference-icon">⚠️</div>
        <div class="reference-text">
          <div class="reference-title">Before参照なし</div>
          <div class="reference-subtitle">通常モードで撮影中</div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<div class="camera-display">
  {#if previewImage}
    <!-- プレビュー画像表示 -->
    <img
      src={previewImage}
      alt="撮影プレビュー"
      class="preview-image {mirrorMode ? 'mirror' : ''}"
    />
  {:else}
    <!-- ライブカメラビュー - Always render video/canvas for DOM binding -->
    <video
      bind:this={videoElement}
      class="input-video {mirrorMode ? 'mirror' : ''}"
      class:hidden={!isReady}
      autoplay
      playsinline
      muted
    ></video>
    <canvas
      bind:this={canvasElement}
      class="output-canvas {mirrorMode ? 'mirror' : ''}"
      class:hidden={!isReady}
      width="640"
      height="480"
    ></canvas>

    {#if isReady}
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

        <!-- SVG矢印ガイダンス -->
        {#if guidanceDirection && showPoseGuidance}
          <div class="dynamic-elements">
            <svg class="arrow-svg" viewBox="0 0 100 100" style:opacity="1">
              {#if guidanceDirection === PoseGuidanceDirection.TURN_LEFT}
                <!-- 左向き矢印 -->
                <path
                  d="M 20 28.4 A 35 35 0 0 0 20 71.6"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width="2"
                  opacity="1"
                />
                <polygon points="8,50 10,53 10,47" fill="#D2294C" />
              {:else if guidanceDirection === PoseGuidanceDirection.TURN_RIGHT}
                <!-- 右向き矢印 -->
                <path
                  d="M 80 28.4 A 35 35 0 0 1 80 71.6"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width="2"
                  opacity="1"
                />
                <polygon points="92,50 90,53 90,47" fill="#D2294C" />
              {:else if guidanceDirection === PoseGuidanceDirection.LOOK_UP}
                <!-- 上向き矢印 -->
                <path
                  d="M 28.4 25 A 35 35 0 0 1 71.6 25"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width="2"
                  opacity="1"
                />
                <polygon points="50,13 53,15 47,15" fill="#D2294C" />
              {:else if guidanceDirection === PoseGuidanceDirection.LOOK_DOWN}
                <!-- 下向き矢印 -->
                <path
                  d="M 71.6 75 A 35 35 0 0 1 28.4 75"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width="2"
                  opacity="1"
                />
                <polygon points="50,87 47,85 53,85" fill="#D2294C" />
              {:else if guidanceDirection === PoseGuidanceDirection.TILT_LEFT}
                <!-- 左傾き矢印 -->
                <path
                  d="M 43 20 A 35 35 0 0 0 20 48"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width="2"
                  opacity="1"
                />
                <polygon points="22.5,47 18,46.5 20,50" fill="#D2294C" />
              {:else if guidanceDirection === PoseGuidanceDirection.TILT_RIGHT}
                <!-- 右傾き矢印 -->
                <path
                  d="M 57 20 A 35 35 0 0 1 80 48"
                  fill="none"
                  stroke="#D2294C"
                  stroke-width="2"
                  opacity="1"
                />
                <polygon points="77.5,47 82,46.5 80,50" fill="#D2294C" />
              {/if}
            </svg>
          </div>
        {/if}
      </div>
    {:else}
      <!-- カメラ準備中 -->
      <div class="camera-loading">
        <div class="loading-spinner"></div>
        <p>カメラを準備中...</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .camera-display {
    position: relative;
    width: 100%;
    height: 100%;
    background: #222;
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
    mask: radial-gradient(circle at center, transparent 30%, black 31%);
    -webkit-mask: radial-gradient(circle at center, transparent 30%, black 31%);
  }

  .camera-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    gap: 20px;
    background: #222;
    z-index: 10;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .camera-loading p {
    margin: 0;
    font-size: 16px;
  }

  .hidden {
    visibility: hidden;
    opacity: 0;
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

  /* SVG矢印スタイル */
  .dynamic-elements {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 15;
    pointer-events: none;
  }

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

  /* Before参照情報表示 */
  .before-reference-info {
    position: fixed;
    top: 80px;
    left: 20px;
    right: 20px;
    z-index: 1100;
    pointer-events: none;
  }

  .reference-status {
    background: rgba(0, 0, 0, 0.8);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .reference-status.has-reference {
    border-color: rgba(76, 175, 80, 0.5);
  }

  .reference-status.no-reference {
    border-color: rgba(255, 152, 0, 0.5);
  }

  .reference-icon {
    font-size: 18px;
    line-height: 1;
  }

  .reference-text {
    flex: 1;
    color: white;
    font-size: 14px;
  }

  .reference-title {
    font-weight: 600;
    margin-bottom: 2px;
  }

  .reference-subtitle {
    font-size: 12px;
    opacity: 0.8;
  }

  .match-percentage {
    font-size: 12px;
    color: #4caf50;
    font-weight: 500;
  }

  /* モバイル対応 */
  @media (max-width: 480px) {
    .before-reference-info {
      top: 60px;
      left: 10px;
      right: 10px;
    }

    .reference-status {
      padding: 10px 12px;
    }

    .reference-text {
      font-size: 13px;
    }

    .reference-title {
      font-size: 13px;
    }

    .reference-subtitle,
    .match-percentage {
      font-size: 11px;
    }
  }
</style>
