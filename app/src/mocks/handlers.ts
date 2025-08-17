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

    // モックイベント詳細データベース
    const eventDetailData: Record<number, any> = {
      1: {
        id: 1,
        title: 'ビューティ体験イベント Vol.1',
        description: '最新の美容機器を体験できるイベントです。プロのスタッフがサポートします。',
        longDescription: `最新の美容機器を実際に体験できる特別なイベントです。

このイベントでは、最先端のスキンケア機器やフェイシャルケア機器を実際に使用して、その効果を体感いただけます。経験豊富なプロのスタッフが一人ひとりに合わせてサポートし、機器の使用方法から効果的なケア方法まで丁寧にご案内いたします。

イベント終了後には、参加者限定の特別価格での製品購入も可能です。`,
        status: 'active',
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T18:00:00Z',
        maxParticipants: 20,
        currentParticipants: 12,
        imageUrl: '/images/events/event1.jpg',
        eventCode: 'BEAUTY001',
        location: '東京都渋谷区渋谷1-1-1 ビューティセンター3F',
        requirements: [
          '18歳以上の方',
          '事前の健康チェックシート記入',
          '肌にアレルギーがない方'
        ],
        benefits: [
          '最新美容機器の無料体験',
          'プロによる肌診断',
          '参加者限定の特別割引',
          'オリジナルサンプルセットのプレゼント'
        ],
        organizer: {
          name: 'ビューティテック株式会社',
          contact: 'event@beauty-tech.co.jp'
        },
        schedule: [
          {
            time: '10:00',
            title: '受付開始・ウェルカムドリンク',
            description: '参加者確認とイベント概要の説明'
          },
          {
            time: '10:30',
            title: '美容機器紹介セミナー',
            description: '最新機器の特徴と効果について専門家が解説'
          },
          {
            time: '11:30',
            title: '個別体験セッション（第1グループ）',
            description: 'スキンケア機器の実際の体験'
          },
          {
            time: '13:00',
            title: 'ランチタイム',
            description: '軽食を取りながら参加者同士の交流'
          },
          {
            time: '14:00',
            title: '個別体験セッション（第2グループ）',
            description: 'フェイシャルケア機器の実際の体験'
          },
          {
            time: '15:30',
            title: 'Q&Aセッション',
            description: '専門家への質問タイム'
          },
          {
            time: '16:30',
            title: '特別販売会',
            description: '参加者限定価格での製品販売'
          },
          {
            time: '17:30',
            title: 'クロージング',
            description: 'サンプルプレゼント・アンケート記入'
          }
        ],
        images: [
          '/images/events/event1-main.jpg',
          '/images/events/event1-demo.jpg',
          '/images/events/event1-venue.jpg'
        ]
      },
      2: {
        id: 2,
        title: 'フェイシャルケア無料診断',
        description: 'AI技術を使った肌診断を無料で体験できます。',
        longDescription: `最新のAI技術を駆使した肌診断システムで、あなたの肌状態を詳しく分析します。

このイベントでは、高精度な肌診断機器を使用して、肌の水分量、油分、ハリ、シミ、しわなどを総合的に分析し、一人ひとりに最適なスキンケア方法をご提案いたします。

診断結果に基づいた個別のアドバイスも専門スタッフが行います。`,
        status: 'upcoming',
        startDate: '2024-01-20T14:00:00Z',
        endDate: '2024-01-20T17:00:00Z',
        maxParticipants: 15,
        currentParticipants: 3,
        imageUrl: '/images/events/event2.jpg',
        eventCode: 'FACIAL002',
        location: '東京都新宿区新宿2-2-2 スキンケアサロン',
        requirements: [
          '20歳以上の方',
          '化粧を落としてご参加いただける方'
        ],
        benefits: [
          'AI肌診断（通常3,000円）が無料',
          '個別スキンケアアドバイス',
          'おすすめ製品のサンプル'
        ],
        organizer: {
          name: 'スキンケア研究所',
          contact: 'info@skincare-lab.jp'
        },
        schedule: [
          {
            time: '14:00',
            title: '受付・説明',
            description: 'AI診断システムの説明と注意事項'
          },
          {
            time: '14:20',
            title: 'AI肌診断',
            description: '約15分間の詳細肌分析'
          },
          {
            time: '15:30',
            title: '結果説明・アドバイス',
            description: '専門家による診断結果の解説'
          },
          {
            time: '16:30',
            title: 'サンプル配布',
            description: '診断結果に基づくサンプル製品の提供'
          }
        ],
        images: [
          '/images/events/event2-main.jpg',
          '/images/events/event2-ai.jpg'
        ]
      }
    };

    // 存在しないIDの場合はデフォルトデータを返す
    const eventDetail = eventDetailData[id] || {
      id,
      title: `イベント ${id}`,
      description: `イベント ${id} の詳細説明です。`,
      longDescription: `イベント ${id} の詳細な説明がここに入ります。このイベントでは様々な体験ができます。`,
      status: 'active',
      startDate: '2024-01-15T10:00:00Z',
      endDate: '2024-01-15T18:00:00Z',
      maxParticipants: 20,
      currentParticipants: 10,
      imageUrl: `/images/events/event${id}.jpg`,
      eventCode: `EVENT${id.toString().padStart(3, '0')}`,
      location: `東京都渋谷区 イベント会場${id}`,
      requirements: ['18歳以上の方'],
      benefits: ['特別体験', 'サンプルプレゼント'],
      organizer: {
        name: `イベント運営${id}`,
        contact: `event${id}@example.com`
      },
      schedule: [
        {
          time: '10:00',
          title: '受付開始',
          description: 'イベント受付'
        },
        {
          time: '11:00',
          title: 'メインイベント',
          description: 'イベントの主要プログラム'
        }
      ],
      images: [`/images/events/event${id}.jpg`]
    };

    return HttpResponse.json(eventDetail);
  }),
];

export const planHandlers = [
  // プラン関連のモックハンドラを後で追加
];

// 全ハンドラをエクスポート
export const handlers = [...authHandlers, ...eventHandlers, ...planHandlers];
