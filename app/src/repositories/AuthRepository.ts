// 認証関連のRepository
import type { HttpClient } from '../lib/http';
import type {
  LoginEmailRequest,
  LoginDigitRequest,
  LoginResponse,
  RegisterRequest,
} from '../domain/auth';

export interface AuthRepository {
  sendLoginMail(request: LoginEmailRequest): Promise<{ message: string }>;
  sendRegisterMail(request: RegisterRequest): Promise<{ message: string }>;
  verifyDigit(request: LoginDigitRequest): Promise<LoginResponse>;
  checkAuth(): Promise<{ auth: boolean }>;
  logout(): Promise<void>;
}

export class HttpAuthRepository implements AuthRepository {
  constructor(private httpClient: HttpClient) {}

  async sendLoginMail(
    request: LoginEmailRequest
  ): Promise<{ message: string }> {
    return this.httpClient.post<{ message: string }>('/login/mail', request);
  }

  async sendRegisterMail(
    request: RegisterRequest
  ): Promise<{ message: string }> {
    return this.httpClient.post<{ message: string }>('/register/mail', request);
  }

  async verifyDigit(request: LoginDigitRequest): Promise<LoginResponse> {
    // 将来的に追加予定のエンドポイント（JSONレスポンス版）
    // または既存の /login/digit に Accept: application/json ヘッダ付きでリクエスト
    const headers = { Accept: 'application/json' };
    return this.httpClient.post<LoginResponse>('/login/digit', request, {
      headers,
    });
  }

  async checkAuth(): Promise<{ auth: boolean }> {
    return this.httpClient.get<{ auth: boolean }>('/api/auth/check');
  }

  async logout(): Promise<void> {
    await this.httpClient.delete<void>('/api/auth/logout');
  }
}

// トークンストレージの抽象化
export interface TokenStorage {
  save(token: string): Promise<void>;
  get(): Promise<string | null>;
  remove(): Promise<void>;
}

export class LocalStorageTokenStorage implements TokenStorage {
  private readonly key = 'auth_token';

  async save(token: string): Promise<void> {
    localStorage.setItem(this.key, token);
  }

  async get(): Promise<string | null> {
    return localStorage.getItem(this.key);
  }

  async remove(): Promise<void> {
    localStorage.removeItem(this.key);
  }
}

// セキュリティ重視のメモリベーストークンストレージ
export class MemoryTokenStorage implements TokenStorage {
  private token: string | null = null;

  async save(token: string): Promise<void> {
    this.token = token;
  }

  async get(): Promise<string | null> {
    return this.token;
  }

  async remove(): Promise<void> {
    this.token = null;
  }
}

// より安全なCookieベースのストレージ（将来の選択肢）
export class CookieTokenStorage implements TokenStorage {
  private readonly key = 'auth_token';
  private readonly maxAge = 7 * 24 * 60 * 60; // 7日

  async save(token: string): Promise<void> {
    document.cookie = `${this.key}=${token}; max-age=${this.maxAge}; path=/; samesite=strict; secure`;
  }

  async get(): Promise<string | null> {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.key) {
        return value;
      }
    }
    return null;
  }

  async remove(): Promise<void> {
    document.cookie = `${this.key}=; max-age=0; path=/; samesite=strict; secure`;
  }
}
