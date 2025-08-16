<script lang="ts">
  import { link } from 'svelte-spa-router';
</script>

<div class="container">
  <div class="content">
    <h1>404</h1>
    <h2>ページが見つかりません</h2>
    <p>お探しのページは存在しないか、移動した可能性があります。</p>

    <div class="actions">
      <a href="/" use:link class="btn btn-primary"> ホームに戻る </a>
      <button on:click={() => history.back()} class="btn btn-secondary">
        前のページに戻る
      </button>
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

  .content {
    text-align: center;
    max-width: 500px;
  }

  h1 {
    font-size: 6rem;
    font-weight: 700;
    color: #2563eb;
    margin: 0;
    line-height: 1;
  }

  h2 {
    font-size: 1.5rem;
    color: #111827;
    margin: 1rem 0;
  }

  p {
    color: #6b7280;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background-color: #1d4ed8;
  }

  .btn-secondary {
    background-color: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #4b5563;
  }
</style>
