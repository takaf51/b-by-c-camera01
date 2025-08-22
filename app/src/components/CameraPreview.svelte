<script lang="ts">
  import { onMount } from 'svelte';

  // Props
  export let videoElement: HTMLVideoElement | undefined = undefined;
  export let canvasElement: HTMLCanvasElement | undefined = undefined;
  export let mirrorMode: boolean = false;
  export let showPoseGuidance: boolean = false;
  export let poseGuidanceMessage: string = '';
  export let poseGuidanceType: string = '';
  export let progress: number = 0;
  export let currentMode: string = 'idle';
  export let statusMessage: string = '';

  // Constants
  export let CaptureMode: any;

  let mounted = false;

  onMount(() => {
    mounted = true;
  });
</script>

<div class="preview-container">
  <!-- 撮影モード表示 -->
  {#if currentMode !== CaptureMode?.IDLE}
    <div class="mode-indicator">
      <div
        class="mode-badge {currentMode === CaptureMode?.BEFORE
          ? 'before'
          : 'after'}"
      >
        {currentMode === CaptureMode?.BEFORE
          ? 'BEFORE撮影の準備'
          : 'AFTER撮影の準備'}
      </div>
    </div>
  {/if}

  <!-- 姿勢ガイダンスメッセージ -->
  {#if showPoseGuidance}
    <div class="pose-guidance">
      <div class="guidance-message {poseGuidanceType}">
        {poseGuidanceMessage}
      </div>
    </div>
  {/if}

  <!-- ビデオエリア -->
  <div class="video-container">
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
      width="1280"
      height="720"
    ></canvas>

    <!-- 顔位置ガイド -->
    {#if currentMode !== CaptureMode?.IDLE}
      <div class="face-guide-overlay">
        <div class="face-guide-circle"></div>
        <div class="face-guide-text">顔をこの位置に合わせてください</div>
      </div>
    {/if}
  </div>

  <!-- ステータスパネル -->
  <div class="status-panel">
    <div class="status-message">{statusMessage}</div>

    {#if currentMode !== CaptureMode?.IDLE && progress > 0}
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
        <div class="progress-text">{Math.round(progress)}%</div>
      </div>
    {/if}
  </div>
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
  }

  .input-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .input-video.mirror {
    transform: scaleX(-1);
  }

  .output-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .output-canvas.mirror {
    transform: scaleX(-1);
  }

  /* 顔位置ガイド */
  .face-guide-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .face-guide-circle {
    width: 280px;
    height: 350px;
    border: 3px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(2px);
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.3),
      inset 0 0 20px rgba(255, 255, 255, 0.1);
    animation: pulseGuide 2s ease-in-out infinite;
    position: relative;
  }

  .face-guide-circle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 4px;
    height: 4px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  }

  .face-guide-text {
    margin-top: 20px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 16px;
    border-radius: 20px;
    backdrop-filter: blur(5px);
  }

  @keyframes pulseGuide {
    0%,
    100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.02);
    }
  }

  .status-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    padding: 1.5rem;
    text-align: center;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    z-index: 1000;
  }

  .status-message {
    color: #fff;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .progress-container {
    margin-top: 1rem;
    width: 100%;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #8bc34a);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    color: #fff;
    font-size: 0.9rem;
    text-align: center;
  }

  /* モバイル・タブレット最適化 */
  @media (max-width: 768px) {
    .video-container {
      border-radius: 0;
    }

    .mode-indicator {
      top: 20px;
    }

    .pose-guidance {
      top: 60px;
    }
  }
</style>
