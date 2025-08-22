<script lang="ts">
  import { link } from 'svelte-spa-router';

  export let title: string = 'EQUAL=i';
  export let showBackButton: boolean = false;
  export let backUrl: string = '/plan/list';
</script>

<header class="header">
  <div class="header-container">
    <!-- Back Button (if needed) -->
    {#if showBackButton}
      <a
        href={backUrl}
        use:link
        class="back-button"
        aria-label="前のページに戻る"
      >
        <span class="arrow-back"></span>
      </a>
    {/if}

    <!-- Logo -->
    <div class="header-brand">
      <a href="/plan/list" use:link class="brand-link">
        <h1 class="brand-title">{title}</h1>
      </a>
    </div>

    <!-- Spacer for centering (when back button exists) -->
    {#if showBackButton}
      <div class="spacer"></div>
    {/if}
  </div>
</header>

<style>
  .header {
    position: relative;
  }

  .header-container {
    position: relative;
  }

  .back-button {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    text-decoration: none;
    padding-left: 1.5em;
    color: #888;
    font-weight: bold;
    font-family: sans-serif;
    font-size: 1.1em;
  }

  .arrow-back {
    position: relative;
    display: block;
    width: 0.8em;
    height: 0.8em;
  }

  .arrow-back::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    transform: translateY(-50%) rotate(45deg);
    width: 0.8em;
    height: 0.8em;
    border-left: 2.5px solid #888;
    border-bottom: 2.5px solid #888;
  }

  .header-brand {
    text-align: center;
  }

  .header-brand .brand-link {
    text-decoration: none;
    color: inherit;
  }

  .brand-title {
    font-size: 1.8rem;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.4);
    letter-spacing: 2px;
    padding: 0.3rem 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    margin: 0;
    color: #fff;
    font-family: 'PT Serif', serif;
    font-weight: 400;
  }

  .spacer {
    display: none;
  }

  @media (max-width: 768px) {
    .brand-title {
      font-size: 1.5rem;
    }

    .back-button {
      font-size: 1rem;
    }
  }
</style>
