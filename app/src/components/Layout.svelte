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
    margin: 0;
    padding: 0;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    line-height: 1.6;
    color: #333;
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>
