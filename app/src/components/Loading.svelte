<script lang="ts">
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let message: string = 'Loading...';
  export let centered: boolean = true;
  export let overlay: boolean = false;

  $: sizeClass = `spinner-${size}`;
</script>

<div
  class="loading-container"
  class:loading-centered={centered}
  class:loading-overlay={overlay}
>
  <div class="spinner {sizeClass}" role="status" aria-label={message}>
    <span class="sr-only">{message}</span>
  </div>
  {#if message && !overlay}
    <p class="loading-message">{message}</p>
  {/if}
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .loading-centered {
    justify-content: center;
    min-height: 200px;
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 9999;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  .spinner {
    border-radius: 50%;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #3b82f6;
    animation: spin 1s linear infinite;
  }

  .spinner-small {
    width: 1.5rem;
    height: 1.5rem;
  }

  .spinner-medium {
    width: 2.5rem;
    height: 2.5rem;
  }

  .spinner-large {
    width: 4rem;
    height: 4rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-message {
    color: #6b7280;
    font-size: 0.875rem;
    text-align: center;
    margin: 0;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
