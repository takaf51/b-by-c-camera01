<script lang="ts">
  import { auth, authActions, authValidation } from '../stores/auth';
  import { push } from 'svelte-spa-router';
  import { link } from 'svelte-spa-router';

  let email = '';
  let name = '';
  let emailError = '';
  let nameError = '';

  // リアルタイムバリデーション
  $: {
    if (email) {
      const validation = authValidation.validateEmail(email);
      emailError = validation.errors[0] || '';
    } else {
      emailError = '';
    }

    if (name) {
      const validation = authValidation.validateName(name);
      nameError = validation.errors[0] || '';
    } else {
      nameError = '';
    }
  }

  // フォーム送信
  async function handleSubmit() {
    const emailValidation = authValidation.validateEmail(email);
    const nameValidation = authValidation.validateName(name);

    if (!emailValidation.isValid) {
      emailError = emailValidation.errors[0];
      return;
    }

    if (!nameValidation.isValid) {
      nameError = nameValidation.errors[0];
      return;
    }

    const success = await authActions.sendRegisterMail(email, name);
    if (success) {
      // 認証コード入力画面へ移動
      push(`/login/digit?email=${encodeURIComponent(email)}`);
    }
  }

  // エラークリア
  function clearError() {
    authActions.clearError();
  }
</script>

<div class="container">
  <div class="form-card">
    <h1>新規登録</h1>
    <p class="subtitle">アカウント情報を入力してください</p>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="field">
        <label for="name">お名前</label>
        <input
          id="name"
          type="text"
          bind:value={name}
          placeholder="山田太郎"
          class:error={nameError}
          autocomplete="name"
          required
        />
        {#if nameError}
          <span class="error-text">{nameError}</span>
        {/if}
      </div>

      <div class="field">
        <label for="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="your.email@example.com"
          class:error={emailError || $auth.error}
          autocomplete="email"
          required
        />
        {#if emailError}
          <span class="error-text">{emailError}</span>
        {/if}
      </div>

      {#if $auth.error}
        <div class="error-banner">
          <span>{$auth.error}</span>
          <button type="button" on:click={clearError} class="error-close">
            ×
          </button>
        </div>
      {/if}

      <button
        type="submit"
        class="submit-btn"
        disabled={$auth.isLoading ||
          !email ||
          !name ||
          !!emailError ||
          !!nameError}
      >
        {#if $auth.isLoading}
          送信中...
        {:else}
          認証コードを送信
        {/if}
      </button>
    </form>

    <div class="links">
      <a href="/login" use:link>すでにアカウントをお持ちの方はこちら</a>
    </div>
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background-color: #f9fafb;
  }

  .form-card {
    width: 100%;
    max-width: 400px;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    padding: 2rem;
  }

  h1 {
    text-align: center;
    color: #111827;
    margin-bottom: 0.5rem;
    font-size: 1.75rem;
    font-weight: 600;
  }

  .subtitle {
    text-align: center;
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .field {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    color: #374151;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  input.error {
    border-color: #dc2626;
  }

  .error-text {
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  .error-banner {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-close {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0;
    margin-left: 0.5rem;
  }

  .submit-btn {
    width: 100%;
    background-color: #2563eb;
    color: white;
    border: none;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: #1d4ed8;
  }

  .submit-btn:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }

  .links {
    text-align: center;
    margin-top: 1.5rem;
  }

  .links a {
    color: #2563eb;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .links a:hover {
    text-decoration: underline;
  }
</style>
