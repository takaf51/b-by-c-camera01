<script lang="ts">
  import { auth, authActions, authValidation } from '../stores/auth';
  import { push } from 'svelte-spa-router';
  import { link, querystring } from 'svelte-spa-router';
  import { onMount } from 'svelte';

  let email = '';
  let digit = '';
  let digitError = '';

  // URLのクエリパラメータからメールアドレスを取得
  $: {
    const params = new URLSearchParams($querystring);
    const emailParam = params.get('email');
    if (emailParam) {
      email = emailParam;
    }
  }

  // リアルタイムバリデーション
  $: {
    if (digit) {
      const validation = authValidation.validateDigit(digit);
      digitError = validation.errors[0] || '';
    } else {
      digitError = '';
    }
  }

  // メールアドレスがない場合はログイン画面へ
  onMount(() => {
    if (!email) {
      push('/login');
    }
  });

  // フォーム送信
  async function handleSubmit() {
    if (!email) {
      push('/login');
      return;
    }

    const validation = authValidation.validateDigit(digit);
    if (!validation.isValid) {
      digitError = validation.errors[0];
      return;
    }

    const success = await authActions.verifyDigit(email, digit);
    if (success) {
      // ログイン成功 - ホーム画面へ
      push('/');
    }
  }

  // エラークリア
  function clearError() {
    authActions.clearError();
  }

  // 認証コード再送信
  async function resendCode() {
    if (!email) return;

    const success = await authActions.sendLoginMail(email);
    if (success) {
      digitError = '';
      digit = '';
    }
  }

  // 数字のみ入力許可
  function handleDigitInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value.replace(/\D/g, ''); // 数字以外を除去
    if (value.length <= 4) {
      digit = value;
    }
  }
</script>

<div class="container">
  <div class="form-card">
    <h1>認証コード入力</h1>
    <p class="subtitle">
      {email} に送信された4桁の認証コードを入力してください
    </p>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="field">
        <label for="digit">認証コード（4桁）</label>
        <input
          id="digit"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          value={digit}
          on:input={handleDigitInput}
          placeholder="1234"
          class:error={digitError || $auth.error}
          autocomplete="one-time-code"
          maxlength="4"
          required
        />
        {#if digitError}
          <span class="error-text">{digitError}</span>
        {/if}
        <div class="hint">※ モック環境では「1234」で認証成功します</div>
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
        disabled={$auth.isLoading || !digit || !!digitError}
      >
        {#if $auth.isLoading}
          認証中...
        {:else}
          ログイン
        {/if}
      </button>
    </form>

    <div class="actions">
      <button
        type="button"
        on:click={resendCode}
        class="resend-btn"
        disabled={$auth.isLoading}
      >
        認証コードを再送信
      </button>

      <a href="/login" use:link class="back-link"> メールアドレスを変更する </a>
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
    line-height: 1.5;
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
    font-size: 1.25rem;
    text-align: center;
    letter-spacing: 0.5rem;
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

  .hint {
    color: #059669;
    font-size: 0.75rem;
    margin-top: 0.5rem;
    text-align: center;
    font-style: italic;
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
    margin-bottom: 1rem;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: #1d4ed8;
  }

  .submit-btn:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
  }

  .resend-btn {
    background: none;
    border: 1px solid #d1d5db;
    color: #374151;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .resend-btn:hover:not(:disabled) {
    background-color: #f9fafb;
  }

  .resend-btn:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }

  .back-link {
    color: #2563eb;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .back-link:hover {
    text-decoration: underline;
  }
</style>
