// MSW モックハンドラ - 認証関連
import { http, HttpResponse } from 'msw';

export const authHandlers = [
  // メール送信（ログイン）
  http.post('/login/mail', async ({ request }) => {
    const body = (await request.json()) as { email: string };

    // バリデーション例
    if (!body.email) {
      return HttpResponse.json(
        { message: 'メールアドレスが必要です', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.email.includes('@')) {
      return HttpResponse.json(
        {
          message: '正しいメールアドレスを入力してください',
          code: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    // 成功レスポンス
    return HttpResponse.json({
      message: 'パスコードをメールで送信しました。メールを確認してください。',
    });
  }),

  // メール送信（登録）
  http.post('/register/mail', async ({ request }) => {
    const body = (await request.json()) as { email: string; name: string };

    if (!body.email || !body.name) {
      return HttpResponse.json(
        { message: 'メールアドレスと名前が必要です', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      message: '認証コードをメールで送信しました。メールを確認してください。',
    });
  }),

  // 4桁コード認証
  http.post('/login/digit', async ({ request }) => {
    const body = (await request.json()) as { email: string; digit: string };

    // バリデーション
    if (!body.email || !body.digit) {
      return HttpResponse.json(
        {
          message: 'メールアドレスと認証コードが必要です',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // 認証コードチェック（モック用：1234 で成功）
    if (body.digit !== '1234') {
      return HttpResponse.json(
        { message: '認証コードが間違っています', code: 'INVALID_DIGIT' },
        { status: 422 }
      );
    }

    // 成功レスポンス
    return HttpResponse.json({
      token: 'mock-token-' + Date.now(),
      name: 'テストユーザー',
      role: 'user',
    });
  }),

  // 認証チェック
  http.get('/api/auth/check', ({ request }) => {
    const authorization = request.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return HttpResponse.json({ auth: false });
    }

    // モック用：mock-tokenで始まるトークンは有効
    const token = authorization.replace('Bearer ', '');
    const isValid = token.startsWith('mock-token');

    return HttpResponse.json({ auth: isValid });
  }),

  // ログアウト
  http.delete('/api/auth/logout', () => {
    return HttpResponse.json({});
  }),
];

// その他のAPIハンドラ（今後追加予定）
export const eventHandlers = [
  // イベント関連のモックハンドラを後で追加
];

export const planHandlers = [
  // プラン関連のモックハンドラを後で追加
];

// 全ハンドラをエクスポート
export const handlers = [...authHandlers, ...eventHandlers, ...planHandlers];
