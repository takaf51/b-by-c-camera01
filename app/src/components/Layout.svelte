<script lang="ts">
  export let title: string = 'Beauty Experience';
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="layout">
  <slot />
</div>

<style>
  .layout {
    min-height: 100vh;
    width: 100%;
  }

  :global(body) {
    background: #000;
    color: #fff;
    margin: 0;
    padding: 0;
    height: 100%;
    box-sizing: border-box;
    font-family:
      'Segoe UI', 'Helvetica Neue', Arial, 'ヒラギノ角ゴ ProN',
      'Hiragino Kaku Gothic ProN', 'メイリオ', Meiryo, sans-serif;
    background-image:
      linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0) 60%,
        rgba(0, 0, 0, 0.85) 100%
      ),
      url('/assets/images/bg.jpg');
    background-repeat: no-repeat;
    background-position: center top;
    background-size: cover;
    line-height: 1.6;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(.pt-serif-regular) {
    font-family: 'PT Serif', serif;
    font-weight: 400;
    font-style: normal;
  }

  :global(.wrapper) {
    box-sizing: border-box;
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }
</style>
