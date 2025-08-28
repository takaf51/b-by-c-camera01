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

// プログラム関連のAPIハンドラ
// 画像管理方針:
// - 開発環境: 外部プレースホルダー画像（Picsum Photos）を使用
// - 本番環境: CDN経由でAPI応答に含まれる画像URLを使用
// - 静的アセット（ロゴ等）: public/images/ に配置
export const programHandlers = [
  // プログラム一覧取得
  http.get('/api/plan/list', ({ request }) => {
    const url = new globalThis.URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');

    console.log(
      'MSW: Program list request - page:',
      page,
      'limit:',
      limit,
      'status:',
      status
    );

    // モックプログラムデータ
    const allPrograms = [
      {
        id: 1,
        title: 'ビューティ体験プログラム Vol.1',
        description:
          '最新の美容機器を体験できるプログラムです。プロのスタッフがサポートします。',
        status: 'active',
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T18:00:00Z',
        maxParticipants: 20,
        currentParticipants: 12,
        imageUrl: 'https://picsum.photos/400/300?random=1',
        programCode: 'BEAUTY001',
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
        imageUrl: 'https://picsum.photos/400/300?random=2',
        programCode: 'FACIAL002',
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
        imageUrl: 'https://picsum.photos/400/300?random=3',
        programCode: 'SKIN003',
      },
      {
        id: 4,
        title: '新春ビューティフェア',
        description: '年始特別企画のビューティプログラムです。',
        status: 'upcoming',
        startDate: '2024-02-01T10:00:00Z',
        endDate: '2024-02-01T18:00:00Z',
        currentParticipants: 0,
        imageUrl: 'https://picsum.photos/400/300?random=4',
        programCode: 'FAIR004',
      },
    ];

    // ステータスでフィルタ
    let filteredEvents = status
      ? allPrograms.filter(program => program.status === status)
      : allPrograms;

    // ページネーション
    const totalCount = filteredEvents.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    return HttpResponse.json({
      programs: paginatedEvents,
      totalCount,
      currentPage: page,
      totalPages,
    });
  }),

  // プログラム詳細取得
  http.get('/api/plan/detail/:id', ({ params }) => {
    const id = parseInt(params.id as string);

    console.log('MSW: Program detail request for ID:', id);

    // モックプログラム詳細データベース
    const programDetailData: Record<number, unknown> = {
      1: {
        id: 1,
        title: 'ビューティ体験プログラム Vol.1',
        description:
          '最新の美容機器を体験できるプログラムです。プロのスタッフがサポートします。',
        longDescription: `最新の美容機器を実際に体験できる特別なプログラムです。

このプログラムでは、最先端のスキンケア機器やフェイシャルケア機器を実際に使用して、その効果を体感いただけます。経験豊富なプロのスタッフが一人ひとりに合わせてサポートし、機器の使用方法から効果的なケア方法まで丁寧にご案内いたします。

プログラム終了後には、参加者限定の特別価格での製品購入も可能です。`,
        status: 'active',
        startDate: '2024-01-15T10:00:00Z',
        endDate: '2024-01-15T18:00:00Z',
        maxParticipants: 20,
        currentParticipants: 12,
        imageUrl: 'https://picsum.photos/400/300?random=1',
        programCode: 'BEAUTY001',
        location: '東京都渋谷区渋谷1-1-1 ビューティセンター3F',
        requirements: [
          '18歳以上の方',
          '事前の健康チェックシート記入',
          '肌にアレルギーがない方',
        ],
        benefits: [
          '最新美容機器の無料体験',
          'プロによる肌診断',
          '参加者限定の特別割引',
          'オリジナルサンプルセットのプレゼント',
        ],
        organizer: {
          name: 'ビューティテック株式会社',
          contact: 'program@beauty-tech.co.jp',
        },
        schedule: [
          {
            time: '10:00',
            title: '受付開始・ウェルカムドリンク',
            description: '参加者確認とプログラム概要の説明',
          },
          {
            time: '10:30',
            title: '美容機器紹介セミナー',
            description: '最新機器の特徴と効果について専門家が解説',
          },
          {
            time: '11:30',
            title: '個別体験セッション（第1グループ）',
            description: 'スキンケア機器の実際の体験',
          },
          {
            time: '13:00',
            title: 'ランチタイム',
            description: '軽食を取りながら参加者同士の交流',
          },
          {
            time: '14:00',
            title: '個別体験セッション（第2グループ）',
            description: 'フェイシャルケア機器の実際の体験',
          },
          {
            time: '15:30',
            title: 'Q&Aセッション',
            description: '専門家への質問タイム',
          },
          {
            time: '16:30',
            title: '特別販売会',
            description: '参加者限定価格での製品販売',
          },
          {
            time: '17:30',
            title: 'クロージング',
            description: 'サンプルプレゼント・アンケート記入',
          },
        ],
        images: [
          'https://picsum.photos/800/600?random=11',
          'https://picsum.photos/800/600?random=12',
          'https://picsum.photos/800/600?random=13',
        ],
      },
      2: {
        id: 2,
        title: 'フェイシャルケア無料診断',
        description: 'AI技術を使った肌診断を無料で体験できます。',
        longDescription: `最新のAI技術を駆使した肌診断システムで、あなたの肌状態を詳しく分析します。

このプログラムでは、高精度な肌診断機器を使用して、肌の水分量、油分、ハリ、シミ、しわなどを総合的に分析し、一人ひとりに最適なスキンケア方法をご提案いたします。

診断結果に基づいた個別のアドバイスも専門スタッフが行います。`,
        status: 'upcoming',
        startDate: '2024-01-20T14:00:00Z',
        endDate: '2024-01-20T17:00:00Z',
        maxParticipants: 15,
        currentParticipants: 3,
        imageUrl: 'https://picsum.photos/400/300?random=2',
        programCode: 'FACIAL002',
        location: '東京都新宿区新宿2-2-2 スキンケアサロン',
        requirements: ['20歳以上の方', '化粧を落としてご参加いただける方'],
        benefits: [
          'AI肌診断（通常3,000円）が無料',
          '個別スキンケアアドバイス',
          'おすすめ製品のサンプル',
        ],
        organizer: {
          name: 'スキンケア研究所',
          contact: 'info@skincare-lab.jp',
        },
        schedule: [
          {
            time: '14:00',
            title: '受付・説明',
            description: 'AI診断システムの説明と注意事項',
          },
          {
            time: '14:20',
            title: 'AI肌診断',
            description: '約15分間の詳細肌分析',
          },
          {
            time: '15:30',
            title: '結果説明・アドバイス',
            description: '専門家による診断結果の解説',
          },
          {
            time: '16:30',
            title: 'サンプル配布',
            description: '診断結果に基づくサンプル製品の提供',
          },
        ],
        images: [
          'https://picsum.photos/800/600?random=21',
          'https://picsum.photos/800/600?random=22',
        ],
      },
    };

    // 存在しないIDの場合はデフォルトデータを返す
    const programDetail = programDetailData[id] || {
      id,
      title: `プログラム ${id}`,
      description: `プログラム ${id} の詳細説明です。`,
      longDescription: `プログラム ${id} の詳細な説明がここに入ります。このプログラムでは様々な体験ができます。`,
      status: 'active',
      startDate: '2024-01-15T10:00:00Z',
      endDate: '2024-01-15T18:00:00Z',
      maxParticipants: 20,
      currentParticipants: 10,
      imageUrl: `https://picsum.photos/600/400?random=${id}`,
      programCode: `EVENT${id.toString().padStart(3, '0')}`,
      location: `東京都渋谷区 プログラム会場${id}`,
      requirements: ['18歳以上の方'],
      benefits: ['特別体験', 'サンプルプレゼント'],
      organizer: {
        name: `プログラム運営${id}`,
        contact: `program${id}@example.com`,
      },
      schedule: [
        {
          time: '10:00',
          title: '受付開始',
          description: 'プログラム受付',
        },
        {
          time: '11:00',
          title: 'メインプログラム',
          description: 'プログラムの主要プログラム',
        },
      ],
      images: [`https://picsum.photos/800/600?random=${id + 10}`],
    };

    return HttpResponse.json(programDetail);
  }),
];

export const planHandlers = [
  // プラン関連のモックハンドラを後で追加
];

// 全ハンドラをエクスポート
// カメラ関連のAPIハンドラ（Face Matrix API仕様に準拠）
export const cameraHandlers = [
  // 画像アップロード - Face Matrix API仕様に準拠
  http.post('/plan/report/send', async ({ request }) => {
    console.log('🚀 MSW: /plan/report/send endpoint hit!');
    console.log('MSW: Face Matrix API - Image upload request received');

    // ヘッダーチェック
    const authorization = request.headers.get('Authorization');
    const planCode = request.headers.get('X-Plan-Code');
    const contentType = request.headers.get('Content-Type');

    console.log('MSW: Headers -', {
      authorization: authorization ? 'Bearer ***' : 'Missing',
      planCode,
      contentType: contentType?.includes('multipart/form-data')
        ? 'multipart/form-data'
        : contentType,
    });

    // 認証チェック（モック環境では緩和）
    if (!authorization?.startsWith('Bearer ') && authorization !== null) {
      console.warn('MSW: Invalid authorization format, but allowing in mock mode');
    }

    // プランコードチェック
    if (!planCode) {
      return HttpResponse.json(
        { error: 'X-Plan-Code header is required' },
        { status: 400 }
      );
    }

    try {
      const formData = await request.formData();
      const image = formData.get('image') as File;
      const kind = formData.get('kind') as string; // 'before' or 'after'
      const reportIdParam = formData.get('plan_report_id') as string;
      const pointsParam = formData.get('points') as string;

      console.log('MSW: Form data -', {
        kind,
        hasImage: !!image,
        imageSize: image?.size || 0,
        reportId: reportIdParam || 'new',
        hasPoints: !!pointsParam,
      });

      // バリデーション
      if (!kind || !['before', 'after'].includes(kind)) {
        return HttpResponse.json(
          { error: 'kind parameter must be "before" or "after"' },
          { status: 400 }
        );
      }

      if (!image) {
        return HttpResponse.json(
          { error: 'image file is required' },
          { status: 400 }
        );
      }

      // 座標情報をパース（送信されている場合）
      let points = null;
      if (pointsParam) {
        try {
          points = JSON.parse(pointsParam);
          console.log('MSW: Parsed points -', points);
        } catch (error) {
          console.warn('MSW: Failed to parse points -', error);
        }
      }

      // plan_report_idを決定（新規作成 or 更新）
      const reportId = reportIdParam
        ? parseInt(reportIdParam)
        : Math.floor(Math.random() * 1000) + 100;
      const isNewReport = !reportIdParam;

      // 開発用：さまざまなシナリオをシミュレート
      const scenarios = {
        success: 0.85, // 85%の確率で成功
        serverError: 0.05, // 5%の確率でサーバーエラー
        timeout: 0.05, // 5%の確率でタイムアウト
        validationError: 0.05, // 5%の確率でバリデーションエラー
      };

      const random = Math.random();

      // エラーシナリオのシミュレート
      if (random > scenarios.success) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 遅延

        if (random > scenarios.success + scenarios.validationError) {
          if (
            random >
            scenarios.success + scenarios.validationError + scenarios.timeout
          ) {
            // サーバーエラー
            console.log('MSW: Simulating server error');
            return HttpResponse.json(
              { error: 'Internal server error occurred' },
              { status: 500 }
            );
          } else {
            // タイムアウト
            console.log('MSW: Simulating timeout');
            await new Promise(resolve => setTimeout(resolve, 10000)); // 長い遅延
          }
        } else {
          // バリデーションエラー
          console.log('MSW: Simulating validation error');
          return HttpResponse.json(
            { error: 'Invalid image format or size' },
            { status: 422 }
          );
        }
      }

      // API仕様に準拠したレスポンス
      const response = {
        report_id: reportId,
        image_status: {
          before:
            kind === 'before'
              ? true
              : reportIdParam
                ? Math.random() > 0.3
                : false,
          after:
            kind === 'after'
              ? true
              : reportIdParam
                ? Math.random() > 0.3
                : false,
        },
      };

      console.log('MSW: API response (SUCCESS) -', response);

      // リアルなAPI感のための遅延
      await new Promise(resolve =>
        setTimeout(resolve, 300 + Math.random() * 700)
      );

      return HttpResponse.json(response, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('MSW: Error processing request -', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // 画像処理ステータス取得（追加機能）
  http.get('/api/plan/report/status/:reportId', ({ params }) => {
    const reportId = params.reportId;

    console.log('MSW: Report status request for ID:', reportId);

    return HttpResponse.json({
      report_id: parseInt(reportId as string),
      status: 'completed',
      image_status: {
        before: true,
        after: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),
];

export const handlers = [
  ...authHandlers,
  ...programHandlers,
  ...planHandlers,
  ...cameraHandlers,
];
