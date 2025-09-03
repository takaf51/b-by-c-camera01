<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let message: string;
  export let type: 'error' | 'warning' | 'info' = 'error';
  export let dismissible: boolean = true;
  export let autoHide: boolean = false;
  export let autoHideDelay: number = 5000; // 5 seconds

  const dispatch = createEventDispatcher<{
    dismiss: void;
  }>();

  let visible = true;

  function handleDismiss() {
    visible = false;
    dispatch('dismiss');
  }

  // Auto hide functionality
  if (autoHide) {
    setTimeout(() => {
      if (visible) {
        handleDismiss();
      }
    }, autoHideDelay);
  }

  $: iconMap = {
    error: '⚠️',
    warning: '⚠️',
    info: 'ℹ️',
  };

  $: typeClass = `error-banner-${type}`;
</script>

{#if visible}
  <div class="error-banner {typeClass}" role="alert" aria-live="polite">
    <div class="error-content">
      <span class="error-icon" aria-hidden="true">
        {iconMap[type]}
      </span>
      <span class="error-message">{message}</span>
    </div>

    {#if dismissible}
      <button
        class="error-dismiss"
        on:click={handleDismiss}
        aria-label="エラーを閉じる"
        type="button"
      >
        ✕
      </button>
    {/if}
  </div>
{/if}

<style>
  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid;
    margin-bottom: 1rem;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .error-banner-error {
    background-color: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }

  .error-banner-warning {
    background-color: #fffbeb;
    border-color: #fed7aa;
    color: #92400e;
  }

  .error-banner-info {
    background-color: #eff6ff;
    border-color: #bfdbfe;
    color: #1e40af;
  }

  .error-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }

  .error-icon {
    font-size: 1.125rem;
    flex-shrink: 0;
  }

  .error-message {
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
  }

  .error-dismiss {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.125rem;
    padding: 0.25rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    margin-left: 0.5rem;
    flex-shrink: 0;
  }

  .error-dismiss:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .error-dismiss:focus {
    outline: 2px solid;
    outline-offset: 2px;
  }

  .error-banner-error .error-dismiss:focus {
    outline-color: #991b1b;
  }

  .error-banner-warning .error-dismiss:focus {
    outline-color: #92400e;
  }

  .error-banner-info .error-dismiss:focus {
    outline-color: #1e40af;
  }
</style>
