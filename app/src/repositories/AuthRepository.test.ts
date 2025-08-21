/**
 * AuthRepository Tests
 * HTTP通信とトークンストレージのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HttpAuthRepository, LocalStorageTokenStorage, MemoryTokenStorage, CookieTokenStorage } from './AuthRepository';
import { HttpClient } from '../lib/http';

// =============================================================================
// Mock HTTP Client
// =============================================================================

const createMockHttpClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});

// =============================================================================
// Test Data
// =============================================================================

const mockLoginRequest = {
  email: 'test@example.com'
};

const mockRegisterRequest = {
  email: 'test@example.com',
  name: 'Test User'
};

const mockDigitRequest = {
  email: 'test@example.com',
  digit: '1234'
};

const mockLoginResponse = {
  token: 'mock-token-12345',
  name: 'Test User',
  role: 'user'
};

const mockMessageResponse = {
  message: 'メール送信完了'
};

// =============================================================================
// AuthRepository Tests
// =============================================================================

describe('HttpAuthRepository', () => {
  let repository: HttpAuthRepository;
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    repository = new HttpAuthRepository(mockHttpClient as any);
  });

  describe('sendLoginMail', () => {
    it('ログインメール送信リクエストを正しく送信する', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockMessageResponse);

      const result = await repository.sendLoginMail(mockLoginRequest);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/login/mail', mockLoginRequest);
      expect(result).toEqual(mockMessageResponse);
    });

    it('HTTPエラーを適切に伝播する', async () => {
      const error = new Error('Network error');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(repository.sendLoginMail(mockLoginRequest)).rejects.toThrow('Network error');
    });
  });

  describe('sendRegisterMail', () => {
    it('登録メール送信リクエストを正しく送信する', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockMessageResponse);

      const result = await repository.sendRegisterMail(mockRegisterRequest);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/register/mail', mockRegisterRequest);
      expect(result).toEqual(mockMessageResponse);
    });

    it('HTTPエラーを適切に伝播する', async () => {
      const error = new Error('Server error');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(repository.sendRegisterMail(mockRegisterRequest)).rejects.toThrow('Server error');
    });
  });

  describe('verifyDigit', () => {
    it('認証コード検証リクエストを正しく送信する', async () => {
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockLoginResponse);

      const result = await repository.verifyDigit(mockDigitRequest);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/login/digit', mockDigitRequest, {
        headers: { Accept: 'application/json' }
      });
      expect(result).toEqual(mockLoginResponse);
    });

    it('認証失敗エラーを適切に伝播する', async () => {
      const error = new Error('Invalid digit');
      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(repository.verifyDigit(mockDigitRequest)).rejects.toThrow('Invalid digit');
    });
  });

  describe('checkAuth', () => {
    it('認証状態チェックリクエストを正しく送信する', async () => {
      const mockAuthResponse = { auth: true };
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAuthResponse);

      const result = await repository.checkAuth();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/auth/check');
      expect(result).toEqual(mockAuthResponse);
    });

    it('未認証状態を正しく返す', async () => {
      const mockAuthResponse = { auth: false };
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAuthResponse);

      const result = await repository.checkAuth();

      expect(result.auth).toBe(false);
    });
  });

  describe('logout', () => {
    it('ログアウトリクエストを正しく送信する', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await repository.logout();

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/api/auth/logout');
    });

    it('ログアウトエラーを適切に伝播する', async () => {
      const error = new Error('Logout failed');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(repository.logout()).rejects.toThrow('Logout failed');
    });
  });
});

// =============================================================================
// TokenStorage Tests
// =============================================================================

describe('LocalStorageTokenStorage', () => {
  let storage: LocalStorageTokenStorage;
  const mockToken = 'test-token-12345';

  beforeEach(() => {
    storage = new LocalStorageTokenStorage();
    // localStorage をモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('トークンをローカルストレージに保存する', async () => {
      await storage.save(mockToken);

      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
    });
  });

  describe('get', () => {
    it('ローカルストレージからトークンを取得する', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(mockToken);

      const result = await storage.get();

      expect(localStorage.getItem).toHaveBeenCalledWith('auth_token');
      expect(result).toBe(mockToken);
    });

    it('トークンが存在しない場合はnullを返す', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const result = await storage.get();

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('ローカルストレージからトークンを削除する', async () => {
      await storage.remove();

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});

describe('MemoryTokenStorage', () => {
  let storage: MemoryTokenStorage;
  const mockToken = 'test-token-12345';

  beforeEach(() => {
    storage = new MemoryTokenStorage();
  });

  describe('save', () => {
    it('トークンをメモリに保存する', async () => {
      await storage.save(mockToken);

      const result = await storage.get();
      expect(result).toBe(mockToken);
    });
  });

  describe('get', () => {
    it('保存されたトークンを取得する', async () => {
      await storage.save(mockToken);

      const result = await storage.get();

      expect(result).toBe(mockToken);
    });

    it('トークンが保存されていない場合はnullを返す', async () => {
      const result = await storage.get();

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('メモリからトークンを削除する', async () => {
      await storage.save(mockToken);
      await storage.remove();

      const result = await storage.get();
      expect(result).toBeNull();
    });
  });

  describe('複数のインスタンス', () => {
    it('異なるインスタンス間でトークンが共有されない', async () => {
      const storage2 = new MemoryTokenStorage();

      await storage.save(mockToken);

      const result1 = await storage.get();
      const result2 = await storage2.get();

      expect(result1).toBe(mockToken);
      expect(result2).toBeNull();
    });
  });
});

describe('CookieTokenStorage', () => {
  let storage: CookieTokenStorage;
  const mockToken = 'test-token-12345';

  beforeEach(() => {
    storage = new CookieTokenStorage();
    // document.cookie をモック
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  describe('save', () => {
    it('トークンをCookieに保存する', async () => {
      await storage.save(mockToken);

      expect(document.cookie).toContain(`auth_token=${mockToken}`);
      expect(document.cookie).toContain('max-age=604800'); // 7日
      expect(document.cookie).toContain('path=/');
      expect(document.cookie).toContain('samesite=strict');
      expect(document.cookie).toContain('secure');
    });
  });

  describe('get', () => {
    it('Cookieからトークンを取得する', async () => {
      document.cookie = `auth_token=${mockToken}; path=/`;

      const result = await storage.get();

      expect(result).toBe(mockToken);
    });

    it('複数のCookieがある場合も正しくトークンを取得する', async () => {
      document.cookie = `other_cookie=value1; auth_token=${mockToken}; another_cookie=value2`;

      const result = await storage.get();

      expect(result).toBe(mockToken);
    });

    it('Cookieが存在しない場合はnullを返す', async () => {
      document.cookie = 'other_cookie=value';

      const result = await storage.get();

      expect(result).toBeNull();
    });

    it('Cookieが空の場合はnullを返す', async () => {
      document.cookie = '';

      const result = await storage.get();

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('Cookieを削除する', async () => {
      await storage.remove();

      expect(document.cookie).toContain('auth_token=');
      expect(document.cookie).toContain('max-age=0');
    });
  });
});
