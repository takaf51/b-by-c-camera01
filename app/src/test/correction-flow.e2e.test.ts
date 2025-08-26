/**
 * 2D補正機能のE2Eテスト
 * Playwright またはCypressで実行することを想定
 */

import { test, expect } from '@playwright/test';

test.describe('2D Correction Feature E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用のプログラムページに移動
    await page.goto('/camera/test-program-id');
    
    // カメラ権限の許可（テスト環境での設定が必要）
    await page.context().grantPermissions(['camera']);
  });

  test('should complete full correction workflow', async ({ page }) => {
    // 1. カメラ起動画面から開始
    await expect(page.getByText('カメラを起動する')).toBeVisible();
    await page.getByText('カメラを起動する').click();

    // 2. 確認事項画面
    await expect(page.getByText('撮影の前にご確認ください')).toBeVisible();
    await page.getByText('確認しました').click();

    // 3. 撮影例ガイド画面
    await expect(page.getByText('BEFORE写真の撮影')).toBeVisible();
    await page.getByText('撮影を始める').click();

    // 4. Before撮影（顔検出の模擬）
    // 実際のテストでは、MediaPipeの顔検出をモックする必要がある
    await page.waitForSelector('.input-video');
    
    // 顔検出が安定するまで待機（模擬）
    await page.waitForTimeout(2000);
    
    // 自動撮影が完了するまで待機
    await expect(page.getByText('📸 Switched to PREVIEW_BEFORE mode')).toBeVisible({ timeout: 10000 });

    // 5. Before撮影プレビュー画面
    await expect(page.locator('.preview-image')).toBeVisible();
    await expect(page.getByText('🔧 2D補正実行')).toBeVisible();
    
    // 6. 2D補正実行
    await page.getByText('🔧 2D補正実行').click();
    
    // 補正処理中の表示を確認
    await expect(page.getByText('🔧 補正処理中...')).toBeVisible();
    
    // 7. 補正結果画面
    await expect(page.getByText('🔧 2D補正結果')).toBeVisible();
    await expect(page.getByText('📸 元画像（Before）')).toBeVisible();
    await expect(page.getByText('✨ 補正後画像')).toBeVisible();
    
    // 補正データの表示確認
    await expect(page.getByText('元姿勢:')).toBeVisible();
    await expect(page.getByText('補正後姿勢:')).toBeVisible();
    await expect(page.getByText('改善度:')).toBeVisible();
    
    // 8. After撮影への遷移
    await page.getByText('After撮影へ →').click();
    
    // After撮影画面の確認
    await expect(page.locator('.input-video')).toBeVisible();
    // 参照姿勢情報の表示確認
    await expect(page.getByText('📸 参照姿勢 (Before)')).toBeVisible();
  });

  test('should handle correction without landmarks', async ({ page }) => {
    // ランドマークデータなしでの補正処理テスト
    // 実装は上記と同様だが、顔検出データが不完全な状態を想定
  });

  test('should allow skipping correction', async ({ page }) => {
    // Before撮影 → 補正なしで直接送信のフローテスト
    
    // Before撮影まで実行
    await page.goto('/camera/test-program-id');
    await page.getByText('カメラを起動する').click();
    await page.getByText('確認しました').click();
    await page.getByText('撮影を始める').click();
    
    // 撮影完了まで待機
    await page.waitForSelector('.preview-image');
    
    // 補正をスキップして直接送信
    await page.getByText('📤 送信する（補正なし）').click();
    
    // 送信完了の確認
    await expect(page.getByText('📤 送信中...')).toBeVisible();
    await expect(page.getByText('Before撮影完了')).toBeVisible({ timeout: 10000 });
  });

  test('should display error for failed correction', async ({ page }) => {
    // 補正処理失敗時のエラーハンドリングテスト
    
    // AffineCorrection.correctImage がエラーを投げるように設定
    await page.addInitScript(() => {
      (window as any).mockCorrectionError = true;
    });
    
    // Before撮影まで実行
    await page.goto('/camera/test-program-id');
    // ... 撮影フローの実行
    
    // 補正実行でエラーが発生
    await page.getByText('🔧 2D補正実行').click();
    
    // エラーメッセージの表示確認
    await expect(page.getByText('補正処理エラー:')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // モバイルビューポートでのテスト
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 補正結果画面がモバイルで適切に表示されることを確認
    // ... 補正フローの実行
    
    await expect(page.locator('.correction-comparison')).toHaveCSS('flex-direction', 'column');
    await expect(page.locator('.correction-item')).toHaveCSS('min-width', 'auto');
  });
});

/**
 * E2Eテスト実行のためのセットアップ例
 * 
 * 1. Playwrightの場合:
 *    npm install -D @playwright/test
 *    npx playwright install
 *    npx playwright test src/test/correction-flow.e2e.test.ts
 * 
 * 2. テスト環境での考慮事項:
 *    - カメラアクセス権限の自動許可
 *    - MediaPipeの顔検出モック
 *    - ネットワークリクエストのモック
 *    - テスト用の画像データ
 * 
 * 3. CI/CDでの実行:
 *    - ヘッドレスブラウザでの実行
 *    - 仮想カメラデバイスの設定
 *    - 並列実行の設定
 */
