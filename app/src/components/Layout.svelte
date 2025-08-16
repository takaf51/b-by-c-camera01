<script lang="ts">
  import Header from './Header.svelte';

  export let title: string = 'Beauty Experience';
  export let showHeader: boolean = true;
  export let maxWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'lg';
  export let padding: boolean = true;

  $: containerClass = [
    'layout-container',
    `max-width-${maxWidth}`,
    padding && 'layout-padding',
  ]
    .filter(Boolean)
    .join(' ');
</script>

<div class="layout">
  {#if showHeader}
    <Header {title} />
  {/if}

  <main class="layout-main">
    <div class={containerClass}>
      <slot />
    </div>
  </main>

  <!-- Footer is optional and can be added later -->
  <!-- <footer class="layout-footer">
    <slot name="footer" />
  </footer> -->
</div>

<style>
  .layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f9fafb;
  }

  .layout-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .layout-container {
    margin: 0 auto;
    width: 100%;
    flex: 1;
  }

  .layout-padding {
    padding: 2rem 1rem;
  }

  /* Max Width Variants */
  .max-width-sm {
    max-width: 640px;
  }

  .max-width-md {
    max-width: 768px;
  }

  .max-width-lg {
    max-width: 1024px;
  }

  .max-width-xl {
    max-width: 1280px;
  }

  .max-width-full {
    max-width: none;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .layout-padding {
      padding: 1rem 0.5rem;
    }
  }

  /* Layout footer for future use */
  .layout-footer {
    background-color: white;
    border-top: 1px solid #e5e7eb;
    padding: 2rem 1rem;
    margin-top: auto;
  }
</style>
