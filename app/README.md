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
