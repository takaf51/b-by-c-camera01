/**
 * HTTP Client Tests
 * HTTPクライアントのビジネスロジックテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HttpClient, createHttpClient, type HttpConfig } from './http';
import { AuthError, NetworkError } from '../domain/auth';

// =============================================================================
// Mock Setup
// =============================================================================

// fetch をモック
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  writable: true,
  value: mockFetch,
});

// =============================================================================
// Helper Functions
// =============================================================================

const createMockResponse = (
  data: any,
  status = 200,
  contentType = 'application/json'
): Response => {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: vi.fn((name: string) => {
        if (name === 'content-type') return contentType;
        return null;
      }),
    },
    json: vi.fn().mockResolvedValue(data),
    text: vi
      .fn()
      .mockResolvedValue(
        typeof data === 'string' ? data : JSON.stringify(data)
      ),
  } as any;

  return response;
};

const createMockConfig = (overrides: Partial<HttpConfig> = {}): HttpConfig => ({
  baseUrl: 'https://api.example.com',
  getToken: vi.fn(() => 'test-token'),
  getProgramCode: vi.fn(() => 'PROGRAM123'),
  getPlanCode: vi.fn(() => 'PLAN456'),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mockConfig: HttpConfig;

  beforeEach(() => {
    mockConfig = createMockConfig();
    httpClient = new HttpClient(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('request method', () => {
    it('正常なレスポンスでJSONを返す', async () => {
      const mockData = { message: 'success', data: { id: 1 } };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await httpClient.request('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            Authorization: 'Bearer test-token',
            'X-Program-Code': 'PROGRAM123',
            'X-Plan-Code': 'PLAN456',
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it('テキストレスポンスを正しく処理する', async () => {
      const mockText = 'Plain text response';
      mockFetch.mockResolvedValue(
        createMockResponse(mockText, 200, 'text/plain')
      );

      const result = await httpClient.request('/test');

      expect(result).toBe(mockText);
    });

    it('HTTPエラーレスポンスでAuthErrorをスローする', async () => {
      const errorResponse = { message: 'Bad Request Error' };
      mockFetch.mockResolvedValue(createMockResponse(errorResponse, 400));

      await expect(httpClient.request('/test')).rejects.toBeInstanceOf(
        AuthError
      );
    });

    it('ネットワークエラーでNetworkErrorをスローする', async () => {
      mockFetch.mockRejectedValue(new Error('Network failed'));

      await expect(httpClient.request('/test')).rejects.toBeInstanceOf(
        NetworkError
      );
    });

    it('カスタムヘッダーを適用する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      await httpClient.request('/test', {
        headers: { 'Custom-Header': 'custom-value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Custom-Header': 'custom-value',
            Accept: 'application/json',
          }),
        })
      );
    });
  });

  describe('ヘッダー構築', () => {
    it('トークンが設定されている場合、Authorizationヘッダーを追加する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      await httpClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('トークンが未設定の場合、Authorizationヘッダーを追加しない', async () => {
      const configWithoutToken = createMockConfig({ getToken: () => null });
      const clientWithoutToken = new HttpClient(configWithoutToken);
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      await clientWithoutToken.get('/test');

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders).not.toHaveProperty('Authorization');
    });

    it('プログラムコードが設定されている場合、X-Program-Codeヘッダーを追加する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      await httpClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Program-Code': 'PROGRAM123',
          }),
        })
      );
    });

    it('プランコードが設定されている場合、X-Plan-Codeヘッダーを追加する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      await httpClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Plan-Code': 'PLAN456',
          }),
        })
      );
    });
  });

  describe('HTTPメソッド', () => {
    describe('GET', () => {
      it('GETリクエストを正しく送信する', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ data: 'test' }));

        await httpClient.get('/test');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.objectContaining({
            method: 'GET',
          })
        );
      });
    });

    describe('POST', () => {
      it('JSONボディでPOSTリクエストを送信する', async () => {
        const requestBody = { name: 'test', value: 123 };
        mockFetch.mockResolvedValue(createMockResponse({ success: true }));

        await httpClient.post('/test', requestBody);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(requestBody),
          })
        );
      });

      it('FormDataでPOSTリクエストを送信する', async () => {
        const formData = new FormData();
        formData.append('file', new Blob(['test'], { type: 'text/plain' }));
        mockFetch.mockResolvedValue(createMockResponse({ success: true }));

        await httpClient.post('/upload', formData);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/upload',
          expect.objectContaining({
            method: 'POST',
            body: formData,
          })
        );

        // FormDataの場合、Content-Typeヘッダーは設定しない（ブラウザが自動設定）
        const calledOptions = mockFetch.mock.calls[0][1];
        expect(calledOptions.headers).not.toHaveProperty('Content-Type');
      });

      it('ボディなしでPOSTリクエストを送信する', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ success: true }));

        await httpClient.post('/test');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    describe('PUT', () => {
      it('PUTリクエストを正しく送信する', async () => {
        const requestBody = { id: 1, name: 'updated' };
        mockFetch.mockResolvedValue(createMockResponse({ success: true }));

        await httpClient.put('/test/1', requestBody);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test/1',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify(requestBody),
          })
        );
      });
    });

    describe('DELETE', () => {
      it('DELETEリクエストを正しく送信する', async () => {
        mockFetch.mockResolvedValue(createMockResponse({ success: true }));

        await httpClient.delete('/test/1');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test/1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('400 Bad Requestエラーを正しく処理する', async () => {
      const errorData = { message: 'Invalid request' };
      mockFetch.mockResolvedValue(createMockResponse(errorData, 400));

      await expect(httpClient.get('/test')).rejects.toMatchObject({
        message: 'Invalid request',
        code: 'BAD_REQUEST',
        statusCode: 400,
      });
    });

    it('401 Unauthorizedエラーを正しく処理する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, 401));

      await expect(httpClient.get('/test')).rejects.toMatchObject({
        message: '認証に失敗しました',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    });

    it('403 Forbiddenエラーを正しく処理する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, 403));

      await expect(httpClient.get('/test')).rejects.toMatchObject({
        message: 'アクセス権限がありません',
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('404 Not Foundエラーを正しく処理する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, 404));

      await expect(httpClient.get('/test')).rejects.toMatchObject({
        message: 'リソースが見つかりません',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });

    it('422 Validation Errorエラーを正しく処理する', async () => {
      const errorData = { message: 'Validation failed' };
      mockFetch.mockResolvedValue(createMockResponse(errorData, 422));

      await expect(httpClient.get('/test')).rejects.toMatchObject({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
      });
    });

    it('500 Server Errorエラーを正しく処理する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, 500));

      await expect(httpClient.get('/test')).rejects.toMatchObject({
        message: 'サーバーで問題が発生しました',
        code: 'SERVER_ERROR',
        statusCode: 500,
      });
    });

    it('その他のHTTPエラーをNetworkErrorとして処理する', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, 503));

      await expect(httpClient.get('/test')).rejects.toBeInstanceOf(
        NetworkError
      );
    });

    it('JSONパースエラーの場合デフォルトメッセージを使用する', async () => {
      const response = createMockResponse('', 400, 'text/plain');
      response.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));
      mockFetch.mockResolvedValue(response);

      await expect(httpClient.get('/test')).rejects.toMatchObject({
        message: 'サーバーエラーが発生しました',
        code: 'BAD_REQUEST',
      });
    });
  });
});

describe('createHttpClient', () => {
  beforeEach(() => {
    // 環境変数をモック
    vi.stubEnv('VITE_API_BASE_URL', 'https://test-api.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('環境変数からベースURLを設定する', () => {
    const client = createHttpClient();

    // プライベートプロパティのテストは難しいため、実際のリクエストで確認
    mockFetch.mockResolvedValue(createMockResponse({ success: true }));

    client.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-api.example.com/test',
      expect.any(Object)
    );
  });

  it('カスタム関数を設定する', () => {
    const getToken = vi.fn(() => 'custom-token');
    const getProgramCode = vi.fn(() => 'CUSTOM-PROGRAM');
    const getPlanCode = vi.fn(() => 'CUSTOM-PLAN');

    const client = createHttpClient(getToken, getProgramCode, getPlanCode);
    mockFetch.mockResolvedValue(createMockResponse({ success: true }));

    client.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer custom-token',
          'X-Program-Code': 'CUSTOM-PROGRAM',
          'X-Plan-Code': 'CUSTOM-PLAN',
        }),
      })
    );
  });

  it('環境変数が未設定の場合は空文字列を使用する', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    const client = createHttpClient();
    mockFetch.mockResolvedValue(createMockResponse({ success: true }));

    client.get('/test');

    expect(mockFetch).toHaveBeenCalledWith('/test', expect.any(Object));
  });
});
