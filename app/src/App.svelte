<script lang="ts">
  import Router from 'svelte-spa-router';
  import { routes } from './routes';
</script>

<Router {routes} />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      system-ui,
      -apple-system,
      Segoe UI,
      Roboto,
      Helvetica,
      Arial,
      sans-serif;
    background-color: #f9fafb;
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>
