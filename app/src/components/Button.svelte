<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface $$Props extends Omit<HTMLButtonAttributes, 'class'> {
    /** ボタンのバリエーション */
    variant?: 'primary' | 'secondary' | 'outline' | 'disabled' | 'danger';
    /** ボタンのサイズ */
    size?: 'small' | 'medium' | 'large';
    /** ローディング状態 */
    loading?: boolean;
    /** フル幅 */
    fullWidth?: boolean;
    /** CSSクラス */
    class?: string;
  }

  export let variant: $$Props['variant'] = 'primary';
  export let size: $$Props['size'] = 'medium';
  export let loading: $$Props['loading'] = false;
  export let fullWidth: $$Props['fullWidth'] = false;
  export let disabled: $$Props['disabled'] = false;

  let className: string = '';
  export { className as class };

  $: isDisabled = disabled || loading;
  $: classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full-width',
    loading && 'btn-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');
</script>

<button
  {...$$restProps}
  class={classes}
  disabled={isDisabled}
  on:click
  on:focus
  on:blur
  on:keydown
  on:keyup
  on:mouseenter
  on:mouseleave
>
  {#if loading}
    <span class="btn-spinner" aria-hidden="true"></span>
  {/if}
  <span class="btn-content" class:sr-only={loading}>
    <slot />
  </span>
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    position: relative;
    overflow: hidden;
  }

  .btn:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Sizes */
  .btn-small {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .btn-medium {
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .btn-large {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    line-height: 1.5rem;
  }

  /* Variants */
  .btn-primary {
    background: #d6df22;
    color: #000;
    border-radius: 30px;
    font-weight: 600;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  .btn-primary:hover:not(:disabled) {
    background: #f6ff53;
  }

  .btn-primary:active:not(:disabled) {
    background: #c5ce1f;
  }

  .btn-secondary {
    background: #333;
    color: #fff;
    border-radius: 10px;
    font-weight: 600;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #555;
  }

  .btn-secondary:active:not(:disabled) {
    background: #222;
  }

  .btn-outline {
    background-color: transparent;
    color: #888;
    border: 1px solid #888;
    border-radius: 6px;
    font-weight: bold;
  }

  .btn-outline:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: #fff;
  }

  .btn-outline:active:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .btn-disabled {
    background-color: #9ca3af;
    color: white;
    cursor: not-allowed;
  }

  .btn-danger {
    background-color: #dc2626;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #b91c1c;
  }

  .btn-danger:active:not(:disabled) {
    background-color: #991b1b;
  }

  /* Modifiers */
  .btn-full-width {
    width: 100%;
  }

  .btn-loading {
    position: relative;
  }

  /* Loading spinner */
  .btn-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
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

  .btn-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
