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

// イベント関連のAPIハンドラ
export const eventHandlers = [
  // イベント一覧取得
  http.get('/api/event/list', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');

    console.log('MSW: Event list request - page:', page, 'limit:', limit, 'status:', status);

    // モックイベントデータ
    const allEvents = [
      {
        id: 1,
        title: 'ビューティ体験イベント Vol.1',
        description: '最新の美容機器を体験できるイベントです。プロのスタッフがサポートします。',
        status: 'active',
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T18:00:00Z',
        maxParticipants: 20,
        currentParticipants: 12,
        imageUrl: '/images/events/event1.jpg',
        eventCode: 'BEAUTY001'
      },
      {
        id: 2,
        title: 'フェイシャルケア無料診断',
        description: 'AI技術を使った肌診断を無料で体験できます。',
        status: 'upcoming',
        startDate: '2024-01-20T14:00:00Z',
        endDate: '2024-01-20T17:00:00Z',
        maxParticipants: 15,
        currentParticipants: 3,
        imageUrl: '/images/events/event2.jpg',
        eventCode: 'FACIAL002'
      },
      {
        id: 3,
        title: 'スキンケアセミナー',
        description: '専門家による正しいスキンケア方法のセミナーです。',
        status: 'completed',
        startDate: '2024-01-10T13:00:00Z',
        endDate: '2024-01-10T16:00:00Z',
        maxParticipants: 30,
        currentParticipants: 25,
        imageUrl: '/images/events/event3.jpg',
        eventCode: 'SKIN003'
      },
      {
        id: 4,
        title: '新春ビューティフェア',
        description: '年始特別企画のビューティイベントです。',
        status: 'upcoming',
        startDate: '2024-02-01T10:00:00Z',
        endDate: '2024-02-01T18:00:00Z',
        currentParticipants: 0,
        imageUrl: '/images/events/event4.jpg',
        eventCode: 'FAIR004'
      }
    ];

    // ステータスでフィルタ
    let filteredEvents = status 
      ? allEvents.filter(event => event.status === status)
      : allEvents;

    // ページネーション
    const totalCount = filteredEvents.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    return HttpResponse.json({
      events: paginatedEvents,
      totalCount,
      currentPage: page,
      totalPages
    });
  }),

  // イベント詳細取得
  http.get('/api/event/detail/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    
    console.log('MSW: Event detail request for ID:', id);

    // モックイベント詳細
    const event = {
      id,
      title: `イベント ${id}`,
      description: `イベント ${id} の詳細説明です。美容機器を使った体験ができます。`,
      status: 'active',
      startDate: '2024-01-15T10:00:00Z',
      endDate: '2024-01-15T18:00:00Z',
      maxParticipants: 20,
      currentParticipants: 10,
      imageUrl: `/images/events/event${id}.jpg`,
      eventCode: `EVENT${id.toString().padStart(3, '0')}`
    };

    return HttpResponse.json(event);
  }),
];

export const planHandlers = [
  // プラン関連のモックハンドラを後で追加
];

// 全ハンドラをエクスポート
export const handlers = [...authHandlers, ...eventHandlers, ...planHandlers];
