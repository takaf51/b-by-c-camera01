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

## API仕様メモ

### Before撮影時の送信データ（pointsに格納される構造）

```javascript
{
  pose: { roll: 1.2, pitch: -0.5, yaw: 0.3, distance: 1.0, quality: 0.85, faceSize: 0.123 },
  image: "data:image/jpeg;base64,/9j/4AAQ...",
  landmarks: [{x, y, z}, ...], // 468個の3D座標点
  correctionResult: {...},
  timestamp: "2024-01-15T10:30:00.000Z"
}
```
