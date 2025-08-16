<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { auth, authActions } from '../stores/auth';
  import Button from './Button.svelte';

  export let title: string = 'Beauty Experience';
  export let showNavigation: boolean = true;

  let isMenuOpen = false;

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  function closeMenu() {
    isMenuOpen = false;
  }

  async function handleLogout() {
    await authActions.logout();
    closeMenu();
  }

  // Navigation items
  $: navigationItems = [
    { href: '/', label: 'ホーム', auth: false },
    { href: '/event/list', label: 'イベント', auth: true },
    // 今後追加予定
    // { href: '/plan/list', label: 'プラン', auth: true },
    // { href: '/mypage', label: 'マイページ', auth: true },
  ];

  $: visibleItems = showNavigation
    ? navigationItems.filter(item => !item.auth || $auth.isAuthenticated)
    : [];
</script>

<header class="header">
  <div class="header-container">
    <!-- Logo/Title -->
    <div class="header-brand">
      <a href="/" use:link class="brand-link" on:click={closeMenu}>
        <h1 class="brand-title">{title}</h1>
      </a>
    </div>

    <!-- Desktop Navigation -->
    {#if showNavigation}
      <nav class="desktop-nav" aria-label="メインナビゲーション">
        <ul class="nav-list">
          {#each visibleItems as item}
            <li>
              <a
                href={item.href}
                use:link
                class="nav-link"
                on:click={closeMenu}
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>

        <!-- Auth Controls -->
        <div class="auth-controls">
          {#if $auth.isAuthenticated}
            <span class="user-name">
              {$auth.user?.name || 'ユーザー'}
            </span>
            <Button
              variant="outline"
              size="small"
              on:click={handleLogout}
              loading={$auth.isLoading}
            >
              ログアウト
            </Button>
          {:else}
            <Button variant="outline" size="small">
              <a href="/login" use:link class="auth-link" on:click={closeMenu}>
                ログイン
              </a>
            </Button>
          {/if}
        </div>
      </nav>

      <!-- Mobile Menu Button -->
      <button
        class="mobile-menu-button"
        on:click={toggleMenu}
        aria-expanded={isMenuOpen}
        aria-controls="mobile-menu"
        aria-label="メニューを開く"
      >
        <span class="hamburger-line" class:open={isMenuOpen}></span>
        <span class="hamburger-line" class:open={isMenuOpen}></span>
        <span class="hamburger-line" class:open={isMenuOpen}></span>
      </button>
    {/if}
  </div>

  <!-- Mobile Navigation -->
  {#if showNavigation}
    <nav
      id="mobile-menu"
      class="mobile-nav"
      class:open={isMenuOpen}
      aria-label="モバイルナビゲーション"
    >
      <ul class="mobile-nav-list">
        {#each visibleItems as item}
          <li>
            <a
              href={item.href}
              use:link
              class="mobile-nav-link"
              on:click={closeMenu}
            >
              {item.label}
            </a>
          </li>
        {/each}

        <!-- Mobile Auth Controls -->
        <li class="mobile-auth-section">
          {#if $auth.isAuthenticated}
            <div class="mobile-user-info">
              <span class="mobile-user-name">
                {$auth.user?.name || 'ユーザー'}
              </span>
              <Button
                variant="danger"
                size="small"
                fullWidth
                on:click={handleLogout}
                loading={$auth.isLoading}
              >
                ログアウト
              </Button>
            </div>
          {:else}
            <Button variant="primary" size="medium" fullWidth>
              <a href="/login" use:link class="auth-link" on:click={closeMenu}>
                ログイン
              </a>
            </Button>
          {/if}
        </li>
      </ul>
    </nav>
  {/if}
</header>

<style>
  .header {
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
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
    justify-content: space-between;
    height: 4rem;
  }

  .header-brand .brand-link {
    text-decoration: none;
    color: inherit;
  }

  .brand-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  /* Desktop Navigation */
  .desktop-nav {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-list {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-link {
    color: #4b5563;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 0;
    transition: color 0.2s;
    border-bottom: 2px solid transparent;
  }

  .nav-link:hover {
    color: #1f2937;
    border-bottom-color: #3b82f6;
  }

  .auth-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-name {
    color: #4b5563;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .auth-link {
    color: inherit;
    text-decoration: none;
  }

  /* Mobile Menu Button */
  .mobile-menu-button {
    display: none;
    flex-direction: column;
    justify-content: space-around;
    width: 2rem;
    height: 2rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .hamburger-line {
    width: 100%;
    height: 2px;
    background-color: #4b5563;
    transition: all 0.3s ease;
    transform-origin: center;
  }

  .hamburger-line.open:nth-child(1) {
    transform: rotate(45deg) translate(0.5rem, 0.5rem);
  }

  .hamburger-line.open:nth-child(2) {
    opacity: 0;
  }

  .hamburger-line.open:nth-child(3) {
    transform: rotate(-45deg) translate(0.5rem, -0.5rem);
  }

  /* Mobile Navigation */
  .mobile-nav {
    display: none;
    background-color: white;
    border-top: 1px solid #e5e7eb;
    padding: 1rem;
  }

  .mobile-nav.open {
    display: block;
  }

  .mobile-nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mobile-nav-link {
    display: block;
    color: #4b5563;
    text-decoration: none;
    font-weight: 500;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .mobile-nav-link:hover {
    color: #1f2937;
  }

  .mobile-auth-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .mobile-user-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mobile-user-name {
    color: #4b5563;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .desktop-nav {
      display: none;
    }

    .mobile-menu-button {
      display: flex;
    }
  }

  @media (min-width: 769px) {
    .mobile-nav {
      display: none !important;
    }
  }
</style>
