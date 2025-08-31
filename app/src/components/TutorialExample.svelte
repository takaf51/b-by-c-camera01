<script lang="ts">
  import TutorialModal from './TutorialModal.svelte';

  // Example usage state
  let showTutorial = false;
  let tutorialMode: 'before' | 'after' = 'before';
  let autoStart = false;

  // Example external conditions (これらの値で表示制御)
  let isFirstTime = true;
  let hasSeenTutorial = false;
  let userPreference = 'show'; // 'show' | 'hide' | 'auto'

  // Tutorial control logic
  $: shouldShowTutorial = determineTutorialVisibility();

  function determineTutorialVisibility(): boolean {
    // 外部条件に基づく表示判定ロジック
    if (userPreference === 'hide') return false;
    if (userPreference === 'show') return true;

    // auto mode - 初回のみ表示
    return isFirstTime && !hasSeenTutorial;
  }

  function startTutorial(mode: 'before' | 'after' = 'before') {
    tutorialMode = mode;
    showTutorial = true;
  }

  function handleTutorialComplete() {
    console.log('Tutorial completed!');
    hasSeenTutorial = true;
    showTutorial = false;
    // ここで実際の撮影開始処理を呼び出し
  }

  function handleTutorialSkip() {
    console.log('Tutorial skipped!');
    hasSeenTutorial = true;
    showTutorial = false;
    // ここで実際の撮影開始処理を呼び出し
  }

  function handleTutorialClose() {
    console.log('Tutorial closed');
    showTutorial = false;
  }

  // Simulate external conditions change
  function simulateFirstTimeUser() {
    isFirstTime = true;
    hasSeenTutorial = false;
    userPreference = 'auto';
  }

  function simulateReturningUser() {
    isFirstTime = false;
    hasSeenTutorial = true;
    userPreference = 'auto';
  }
</script>

<div class="tutorial-example">
  <h1>チュートリアルコンポーネント使用例</h1>

  <!-- Control Panel -->
  <div class="control-panel">
    <h2>外部制御パラメータ</h2>

    <div class="control-group">
      <label>
        <input type="checkbox" bind:checked={isFirstTime} />
        初回ユーザー
      </label>
    </div>

    <div class="control-group">
      <label>
        <input type="checkbox" bind:checked={hasSeenTutorial} />
        チュートリアル既読
      </label>
    </div>

    <div class="control-group">
      <label>ユーザー設定:</label>
      <select bind:value={userPreference}>
        <option value="show">常に表示</option>
        <option value="hide">常に非表示</option>
        <option value="auto">自動判定</option>
      </select>
    </div>

    <div class="control-group">
      <label>撮影モード:</label>
      <select bind:value={tutorialMode}>
        <option value="before">Before</option>
        <option value="after">After</option>
      </select>
    </div>

    <div class="control-group">
      <label>
        <input type="checkbox" bind:checked={autoStart} />
        自動開始
      </label>
    </div>
  </div>

  <!-- Status Display -->
  <div class="status-panel">
    <h2>現在の状態</h2>
    <p>
      <strong>チュートリアル表示判定:</strong>
      {shouldShowTutorial ? '表示' : '非表示'}
    </p>
    <p><strong>現在のモード:</strong> {tutorialMode}</p>
    <p><strong>自動開始:</strong> {autoStart ? 'ON' : 'OFF'}</p>
  </div>

  <!-- Action Buttons -->
  <div class="action-panel">
    <h2>操作</h2>
    <button class="btn primary" on:click={() => startTutorial('before')}>
      Beforeチュートリアル開始
    </button>
    <button class="btn primary" on:click={() => startTutorial('after')}>
      Afterチュートリアル開始
    </button>
    <button class="btn secondary" on:click={simulateFirstTimeUser}>
      初回ユーザーをシミュレート
    </button>
    <button class="btn secondary" on:click={simulateReturningUser}>
      リピートユーザーをシミュレート
    </button>
  </div>

  <!-- Integration Code Example -->
  <div class="code-example">
    <h2>統合コード例</h2>
    <pre><code
        >{`<!-- 基本的な使用方法 -->
<TutorialModal
  bind:show={showTutorial}
  mode="before"
  autoStart={false}
  on:complete={handleTutorialComplete}
  on:skip={handleTutorialSkip}
  on:close={handleTutorialClose}
/>

<!-- 外部条件による制御 -->
<script>
  // 表示判定ロジック
  $: shouldShowTutorial = 
    userPreference === 'show' || 
    (userPreference === 'auto' && isFirstTime && !hasSeenTutorial);
  
  // チュートリアル開始
  function startTutorialIfNeeded() {
    if (shouldShowTutorial) {
      showTutorial = true;
    }
  }
</script>`}</code
      ></pre>
  </div>
</div>

<!-- Tutorial Modal -->
<TutorialModal
  bind:show={showTutorial}
  mode={tutorialMode}
  {autoStart}
  on:complete={handleTutorialComplete}
  on:skip={handleTutorialSkip}
  on:close={handleTutorialClose}
/>

<style>
  .tutorial-example {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h1 {
    color: #1a1a1a;
    margin-bottom: 30px;
  }

  h2 {
    color: #333;
    font-size: 18px;
    margin-bottom: 15px;
  }

  .control-panel,
  .status-panel,
  .action-panel,
  .code-example {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .control-group {
    margin-bottom: 15px;
  }

  .control-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
  }

  .control-group input[type='checkbox'] {
    margin-right: 8px;
  }

  .control-group select {
    width: 200px;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .status-panel p {
    margin: 8px 0;
  }

  .action-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .btn {
    padding: 12px 20px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn.primary {
    background: #007bff;
    color: white;
  }

  .btn.primary:hover {
    background: #0056b3;
  }

  .btn.secondary {
    background: #6c757d;
    color: white;
  }

  .btn.secondary:hover {
    background: #545b62;
  }

  .code-example pre {
    background: #f1f3f4;
    padding: 15px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 14px;
    line-height: 1.4;
  }

  .code-example code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  @media (max-width: 768px) {
    .tutorial-example {
      padding: 15px;
    }

    .action-panel {
      flex-direction: column;
    }
  }
</style>
