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
    background: transparent;
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .header-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .back-button {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    text-decoration: none;
    padding: 0.5rem;
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
    border-left: 2.5px solid #fff;
    border-bottom: 2.5px solid #fff;
  }

  .header-brand .brand-link {
    text-decoration: none;
    color: inherit;
  }

  .brand-title {
    font-size: 2rem;
    font-weight: 400;
    color: #fff;
    margin: 0;
    font-family: 'PT Serif', serif;
  }

  .spacer {
    position: absolute;
    right: 1rem;
    width: 80px; /* Balance the back button */
  }

  @media (max-width: 768px) {
    .brand-title {
      font-size: 1.5rem;
    }

    .back-button {
      padding: 0.4rem 0.8rem;
      font-size: 0.9rem;
    }
  }
</style>
