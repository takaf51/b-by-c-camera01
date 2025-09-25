# Svelte App

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

## Development Environment

### MSW (Mock Service Worker)

**MSW** を使用してAPIをモック化しています。

- `VITE_API_PROFILE=mock` で有効
- 実APIサーバー不要で開発可能
- 認証コード: **1234** で動作確認可能

### Environment Variables

`.env.example` をコピーして `.env` を作成し、必要に応じて値を調整してください。

## External Configuration

PHPアプリケーション側から設定を渡すための外部設定システムです。

### 設定方法

**camera.html または PHP側で設定:**

```javascript
window.CameraSettings = {
  API_ENDPOINT: 'https://api.example.com',
  PLAN_CODE: 'plan-202508-plan1',
  PLAN_REPORT_ID: 123,
  KIND: 'before',
  API_TOKEN: 'your-api-token-here',
  ENABLE_TUTORIAL: true,
  ENABLE_AUTO_CORRECTION: true,
};
```

または

```javascript
window.AppSettings = {
  // 同じ設定項目
};
```

### 設定可能項目

| 項目                          | 型                    | 説明                                             | 例                            |
| ----------------------------- | --------------------- | ------------------------------------------------ | ----------------------------- |
| `API_ENDPOINT`                | `string`              | APIエンドポイントのURL                           | `"https://api.example.com"`   |
| `PLAN_CODE`                   | `string`              | プラン識別コード                                 | `"plan-202508-plan1"`         |
| `PLAN_REPORT_ID`              | `number`              | プランレポートID（チュートリアル表示判定に使用） | `123`                         |
| `KIND`                        | `"before" \| "after"` | 撮影種別                                         | `"before"` または `"after"`   |
| `API_TOKEN`                   | `string`              | API認証トークン                                  | `"your-api-token-here"`       |
| `ENABLE_TUTORIAL`             | `boolean`             | チュートリアル表示制御                           | `true`, `false`, または未設定 |
| `ENABLE_EXPRESSION_DETECTION` | `boolean`             | 表情検知機能制御                                 | `true`, `false`, または未設定 |

### チュートリアル表示制御（ENABLE_TUTORIAL）

**動作仕様:**

- `true`: 常にチュートリアルを表示
- `false`: 常にチュートリアルを非表示
- 未設定（`undefined`）: 既存のロジックを維持
  - After撮影時: チュートリアルをスキップ
  - Before撮影でPLAN_REPORT_IDがある場合: チュートリアルをスキップ
  - その他の場合（初回Before撮影等）: チュートリアルを表示

### 表情検知機能制御（ENABLE_EXPRESSION_DETECTION）

**動作仕様:**

- `true`: 表情検知を有効
  - 撮影時に表情を解析し、不適切な表情（笑顔、眉上げ、目の力み）を検出
  - 表情に問題がある場合は撮影をブロックし、ガイダンスを表示
  - 姿勢と表情の両方が良好な場合のみ撮影を許可
- `false`: 表情検知を無効
  - 表情の解析と検証をスキップ
  - 姿勢のみをチェックして撮影判定
  - 表情関連のガイダンスは表示されない
- 未設定（`undefined`）: 表情検知を有効（既存動作を維持）

### フォールバック動作

各設定項目が未設定の場合、以下のフォールバック順序で値が決定されます：

1. 外部設定（`window.CameraSettings` または `window.AppSettings`）
2. 環境変数（`.env`ファイル）
3. デフォルト値

## Image Management

### 画像管理方針

**静的アセット** (アプリケーション固有):

- 配置場所: `public/images/common/`
- 用途: ロゴ、アイコン、UI素材
- 例: `/images/common/logo.svg`

**動的コンテンツ** (データとして管理):

- 開発環境: 外部プレースホルダー画像 (Picsum Photos)
- 本番環境: CDN経由でAPI応答に含まれる画像URL
- 用途: プログラム画像、ユーザーアップロード画像

この方針により、フロントエンドとバックエンドの責任が明確に分離され、スケーラブルな画像管理が実現されます。

## MediaPipe Asset Management

### 概要

カメラ起動の高速化のため、MediaPipeのアセットファイルをIndexedDBにキャッシュする機能を実装しています。

### 動作フロー

1. **アプリ起動時**: MediaPipeアセット（約3MB）を自動的にIndexedDBにダウンロード・保存
2. **カメラ起動時**: ローカルキャッシュから高速読み込み
3. **フォールバック**: キャッシュがない場合はCDNから取得

### PHP側からの制御

カメラアプリ起動後、`window.bbyc`オブジェクトを通じて以下の操作が可能です：

#### アセットの事前ダウンロード

```javascript
// バックグラウンドで即座に開始（即座に戻る）
const started = window.bbyc.mediaPipe.preloadAssets();
if (started) {
  console.log('バックグラウンドダウンロード開始');
  // UI操作は即座に続行可能
}

// 必要に応じて進捗確認
function checkProgress() {
  const status = window.bbyc.mediaPipe.getDownloadStatus();
  if (status.isDownloading) {
    console.log('ダウンロード中...');
    setTimeout(checkProgress, 1000); // 1秒後に再確認
  } else {
    console.log('ダウンロード完了');
  }
}
checkProgress();
```

#### キャッシュサイズの確認

```javascript
// 現在のキャッシュサイズを取得（バイト単位）
window.bbyc.mediaPipe
  .getCacheSize()
  .then(size => console.log(`キャッシュサイズ: ${Math.round(size / 1024)}KB`));
```

#### キャッシュのクリア

```javascript
// IndexedDBのキャッシュをクリア（デバッグ用）
window.bbyc.mediaPipe
  .clearCache()
  .then(() => console.log('キャッシュクリア完了'));
```

### 自動動作

**アプリ起動時の自動実行:**

- `camera.html`にアクセスした時点で、MediaPipeアセットの事前ダウンロードが自動的に開始されます
- PHP側で特別な処理を行う必要はありません
- ブラウザのコンソールで以下のログを確認できます：

```
🚀 カメラアプリ起動時MediaPipeアセット取得を開始
📥 ダウンロード中: face_mesh_solution_packed_assets.data (1/3)
✅ 保存完了: face_mesh_solution_packed_assets.data (1024KB)
🎉 MediaPipeアセットの事前ダウンロード完了
```

### 手動制御（オプション）

必要に応じて、PHP側から手動でアセット管理を行うことも可能です：

```javascript
// 手動で再ダウンロードを実行
window.bbyc.mediaPipe.preloadAssets();

// キャッシュサイズを確認
window.bbyc.mediaPipe
  .getCacheSize()
  .then(size => console.log(`${Math.round(size / 1024)}KB`));

// キャッシュをクリア（トラブルシューティング用）
window.bbyc.mediaPipe.clearCache();
```

### 技術詳細

- **ストレージ**: IndexedDB（ブラウザ標準、大容量対応）
- **対象ファイル**:
  - `face_mesh_solution_packed_assets.data`
  - `face_mesh_solution_simd_wasm_bin.wasm`
  - `face_mesh_solution_packed_assets_loader.js`
- **キャッシュ有効期限**: バージョンベース（MediaPipe更新時に自動更新）
- **フォールバック**: ネットワーク不安定時もCDNから取得

### スマートフォンでの保存期間

- **Android Chrome**: 基本的に永続保存（容量不足時のみ削除）
- **iOS Safari**: 最大7日間（ITP制限のため）
- **対策**: 永続ストレージAPIを使用して削除リスクを軽減
- **自動再取得**: キャッシュが削除された場合はCDNから自動再ダウンロード

## API仕様メモ

### Before/After撮影時の送信データ（pointsに格納される構造）

Before撮影とAfter撮影で同一のデータ構造を使用します。

```javascript
{
  pose: { roll: 1.2, pitch: -0.5, yaw: 0.3, distance: 1.0, quality: 0.85, faceSize: 0.123 },
  landmarks: [{x, y, z}, ...], // 468個の3D座標点
  keyPoints: {
    leftEye: { x: 213, y: 240 },    // 左目座標（ピクセル座標）
    rightEye: { x: 169, y: 240 },   // 右目座標（ピクセル座標）
    noseTip: { x: 191, y: 260 }     // 鼻先座標（ピクセル座標）
  }
}
```

#### フィールド説明

- **pose**: 顔の姿勢情報（角度、距離、品質など）
- **landmarks**: MediaPipeから取得した468個の顔の特徴点（3D座標）
- **keyPoints**: 画像位置合わせ用の主要3点の座標（ピクセル座標）
  - `leftEye`: 左目座標（MediaPipe landmarks[33]）
  - `rightEye`: 右目座標（MediaPipe landmarks[263]）
  - `noseTip`: 鼻先座標（MediaPipe landmarks[1]）

#### Before撮影とAfter撮影の使い分け

- **Before撮影**: 全データを基準として保存・解析に使用
- **After撮影**: 同一構造でBefore画像との比較・位置合わせに使用
- **keyPoints**: 両方の撮影で効率的な画像位置合わせを実現
