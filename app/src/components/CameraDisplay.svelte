<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props - these will be bound from parent
  export let videoElement: HTMLVideoElement | undefined = undefined;
  export let canvasElement: HTMLCanvasElement | undefined = undefined;
  export let previewImage: string | null = null;
  export let mirrorMode: boolean = true;
  export let mode: 'before' | 'after' = 'before';
  export let isReady: boolean = false;

  // 画面サイズ取得
  let innerWidth = 0;
  let innerHeight = 0;

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

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
</style>
