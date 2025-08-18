// 共通HTTPクライアント
import { AuthError, NetworkError } from '../domain/auth';

export interface HttpConfig {
  baseUrl: string;
  getToken?: () => string | null;
  getProgramCode?: () => string | null;
  getPlanCode?: () => string | null;
}

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export class HttpClient {
  constructor(private config: HttpConfig) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = this.buildHeaders(options.headers || {});

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw await this.handleHttpError(response);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }

      return (await response.text()) as T;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      // ネットワークエラーや予期しないエラー
      throw new NetworkError(
        'ネットワークエラーが発生しました。接続を確認してください。',
        0
      );
    }
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const requestOptions: RequestOptions = {
      ...options,
      method: 'POST',
    };

    if (body instanceof FormData) {
      // FormDataの場合はContent-Typeを自動設定させる
      requestOptions.body = body;
    } else if (body) {
      // JSONの場合
      requestOptions.headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      requestOptions.body = JSON.stringify(body);
    }

    return this.request<T>(path, requestOptions);
  }

  async put<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  private buildHeaders(customHeaders: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...customHeaders,
    };

    // トークンの付与
    const token = this.config.getToken?.();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // プログラムコードの付与
    const programCode = this.config.getProgramCode?.();
    if (programCode) {
      headers['X-Program-Code'] = programCode;
    }

    // プランコードの付与
    const planCode = this.config.getPlanCode?.();
    if (planCode) {
      headers['X-Plan-Code'] = planCode;
    }

    return headers;
  }

  private async handleHttpError(response: Response): Promise<AuthError> {
    let errorMessage = 'サーバーエラーが発生しました';

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // JSONパースに失敗した場合はデフォルトメッセージを使用
    }

    // ステータスコード別のエラーハンドリング
    switch (response.status) {
      case 400:
        return new AuthError(errorMessage, 'BAD_REQUEST', response.status);
      case 401:
        return new AuthError(
          '認証に失敗しました',
          'UNAUTHORIZED',
          response.status
        );
      case 403:
        return new AuthError(
          'アクセス権限がありません',
          'FORBIDDEN',
          response.status
        );
      case 404:
        return new AuthError(
          'リソースが見つかりません',
          'NOT_FOUND',
          response.status
        );
      case 422:
        return new AuthError(errorMessage, 'VALIDATION_ERROR', response.status);
      case 500:
        return new AuthError(
          'サーバーで問題が発生しました',
          'SERVER_ERROR',
          response.status
        );
      default:
        return new NetworkError(errorMessage, response.status);
    }
  }
}

// 環境変数からHTTPクライアントを作成
export function createHttpClient(
  getToken?: () => string | null,
  getProgramCode?: () => string | null,
  getPlanCode?: () => string | null
): HttpClient {
  const config: HttpConfig = {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '',
    getToken,
    getProgramCode,
    getPlanCode,
  };

  return new HttpClient(config);
}
