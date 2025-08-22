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
    max-width: 640px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    position: relative;
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
    width: 100%;
    background-color: #000;
    border-radius: 8px;
    overflow: hidden;
  }

  .input-video {
    width: 100%;
    height: auto;
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

  .status-panel {
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
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
</style>
