<script lang="ts">
  import Button from './Button.svelte';

  // Props
  export let currentMode: string;
  export let capturedImages: string[] = [];
  export let showMesh: boolean = false;
  export let mirrorMode: boolean = false;
  export let isUploading: boolean = false;
  export let reportId: number | null = null;

  // Constants
  export let CAPTURE_COUNT: number = 5;
  export let CaptureMode: any;

  // Event handlers
  export let onStartBeforeCapture: () => void = () => {};
  export let onPerformCorrection: () => void = () => {};
  export let onStartAfterCapture: () => void = () => {};
  export let onToggleMesh: () => void = () => {};
  export let onToggleMirror: () => void = () => {};

  // Correction state
  export let hasBeforeImage: boolean = false;
  export let correctionResult: any = null;
  export let isProcessingCorrection: boolean = false;
</script>

<div class="controls-container">
  <!-- Status Panel -->
  <div class="status-panel">
    <div class="status-message">
      {currentMode === 'idle'
        ? '撮影準備完了'
        : currentMode === 'before_capture'
          ? `ビフォー撮影中 (${capturedImages.length}/${CAPTURE_COUNT})`
          : currentMode === 'after_capture'
            ? `アフター撮影中 (${capturedImages.length}/${CAPTURE_COUNT})`
            : '処理中...'}
    </div>

    {#if isUploading}
      <div class="upload-indicator">
        <div class="spinner"></div>
        <span>API送信中...</span>
      </div>
    {/if}

    {#if reportId}
      <div class="report-info">
        レポートID: {reportId}
      </div>
    {/if}
  </div>

  <!-- Control Buttons -->
  <div class="controls">
    <Button
      variant="primary"
      disabled={currentMode !== CaptureMode.IDLE}
      on:click={onStartBeforeCapture}
    >
      1. ビフォー撮影開始
    </Button>

    <Button
      variant="secondary"
      disabled={!hasBeforeImage || isProcessingCorrection}
      on:click={onPerformCorrection}
    >
      {isProcessingCorrection ? '補正処理中...' : '2. 2D補正実行'}
    </Button>

    <Button
      variant="secondary"
      disabled={!correctionResult}
      on:click={onStartAfterCapture}
    >
      3. アフター撮影開始
    </Button>

    <Button variant="outline" on:click={onToggleMesh}>
      {showMesh ? 'メッシュ非表示' : 'メッシュ表示'}
    </Button>

    <Button variant="outline" on:click={onToggleMirror}>
      {mirrorMode ? 'ミラー解除' : 'ミラー表示'}
    </Button>
  </div>

  <!-- Gallery -->
  {#if capturedImages.length > 0}
    <div class="gallery">
      <h3>撮影結果</h3>
      <div class="captured-images">
        {#each capturedImages as image, index (index)}
          <img src={image} alt="撮影画像 {index + 1}" class="captured-image" />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .controls-container {
    width: 100%;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
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

  .upload-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #ffa500;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 165, 0, 0.3);
    border-top: 2px solid #ffa500;
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

  .report-info {
    color: #90ee90;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    text-align: center;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }

  .gallery {
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 8px;
  }

  .gallery h3 {
    color: #fff;
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .captured-images {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }

  .captured-image {
    width: 100%;
    height: auto;
    border-radius: 4px;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    .controls {
      flex-direction: column;
      width: 100%;
    }
  }
</style>
