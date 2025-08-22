/**
 * AuthUseCase Tests
 * 認証フローの重要なビジネスロジックのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthUseCase } from './AuthUseCase';
import type {
  AuthRepository,
  TokenStorage,
} from '../repositories/AuthRepository';
import { ValidationError, AuthError, NetworkError } from '../domain/auth';

// =============================================================================
// Mock Repository & Storage
// =============================================================================

const createMockAuthRepository = (): AuthRepository => ({
  sendLoginMail: vi.fn(),
  sendRegisterMail: vi.fn(),
  verifyDigit: vi.fn(),
  checkAuth: vi.fn(),
  logout: vi.fn(),
});

const createMockTokenStorage = (): TokenStorage => ({
  save: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
});

// =============================================================================
// Test Data
// =============================================================================

const validEmail = 'test@example.com';
const invalidEmail = 'invalid-email';
const validName = 'Test User';
const validDigit = '1234';
const invalidDigit = '12';
const mockToken = 'mock-token-12345';

const mockUser = {
  id: 1,
  email: validEmail,
  name: validName,
  role: 'user' as const,
};

const mockVerifyResponse = {
  token: mockToken,
  name: validName,
  role: 'user' as const,
};

// =============================================================================
// Tests
// =============================================================================

describe('AuthUseCase', () => {
  let useCase: AuthUseCase;
  let mockAuthRepository: AuthRepository;
  let mockTokenStorage: TokenStorage;

  beforeEach(() => {
    mockAuthRepository = createMockAuthRepository();
    mockTokenStorage = createMockTokenStorage();
    useCase = new AuthUseCase(mockAuthRepository, mockTokenStorage);
  });

  describe('sendLoginMail', () => {
    it('有効なメールアドレスでログインメールを送信する', async () => {
      vi.mocked(mockAuthRepository.sendLoginMail).mockResolvedValue({
        message: 'メール送信成功',
      });

      const result = await useCase.sendLoginMail(validEmail);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(mockAuthRepository.sendLoginMail).toHaveBeenCalledWith({
        email: validEmail,
      });
    });

    it('無効なメールアドレスでバリデーションエラーを返す', async () => {
      const result = await useCase.sendLoginMail(invalidEmail);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('正しいメールアドレス');
      expect(mockAuthRepository.sendLoginMail).not.toHaveBeenCalled();
    });

    it('空のメールアドレスでバリデーションエラーを返す', async () => {
      const result = await useCase.sendLoginMail('');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(mockAuthRepository.sendLoginMail).not.toHaveBeenCalled();
    });

    it('ネットワークエラーを適切に処理する', async () => {
      vi.mocked(mockAuthRepository.sendLoginMail).mockRejectedValue(
        new NetworkError('Network failed')
      );

      const result = await useCase.sendLoginMail(validEmail);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('ネットワークエラー');
    });
  });

  describe('sendRegisterMail', () => {
    it('有効なメールアドレスと名前で登録メールを送信する', async () => {
      vi.mocked(mockAuthRepository.sendRegisterMail).mockResolvedValue({
        message: 'メール送信成功',
      });

      const result = await useCase.sendRegisterMail(validEmail, validName);

      expect(result.success).toBe(true);
      expect(mockAuthRepository.sendRegisterMail).toHaveBeenCalledWith({
        email: validEmail,
        name: validName,
      });
    });

    it('無効なメールアドレスでバリデーションエラーを返す', async () => {
      const result = await useCase.sendRegisterMail(invalidEmail, validName);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(mockAuthRepository.sendRegisterMail).not.toHaveBeenCalled();
    });

    it('空の名前でバリデーションエラーを返す', async () => {
      const result = await useCase.sendRegisterMail(validEmail, '');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(mockAuthRepository.sendRegisterMail).not.toHaveBeenCalled();
    });

    it('複数のバリデーションエラーをまとめて返す', async () => {
      const result = await useCase.sendRegisterMail(invalidEmail, '');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(1);
    });
  });

  describe('verifyDigit', () => {
    it('有効なメールアドレスと認証コードで認証する', async () => {
      vi.mocked(mockAuthRepository.verifyDigit).mockResolvedValue(
        mockVerifyResponse
      );
      vi.mocked(mockTokenStorage.save).mockResolvedValue(undefined);

      const result = await useCase.verifyDigit(validEmail, validDigit);

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 0, // 仮値
        email: validEmail,
        name: validName,
        role: 'user',
      });
      expect(result.token).toBe(mockToken);
      expect(mockTokenStorage.save).toHaveBeenCalledWith(mockToken);
    });

    it('無効な認証コードでバリデーションエラーを返す', async () => {
      const result = await useCase.verifyDigit(validEmail, invalidDigit);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(mockAuthRepository.verifyDigit).not.toHaveBeenCalled();
    });

    it('期限切れの認証コードエラーを適切に処理する', async () => {
      vi.mocked(mockAuthRepository.verifyDigit).mockRejectedValue(
        new AuthError('認証コードが期限切れです', 'EXPIRED_DIGIT')
      );

      const result = await useCase.verifyDigit(validEmail, validDigit);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('有効期限が切れています');
    });

    it('間違った認証コードエラーを適切に処理する', async () => {
      vi.mocked(mockAuthRepository.verifyDigit).mockRejectedValue(
        new AuthError('認証コードが間違っています', 'INVALID_DIGIT')
      );

      const result = await useCase.verifyDigit(validEmail, validDigit);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('認証コードが間違っています');
    });
  });

  describe('restoreSession', () => {
    it('有効なトークンでセッションを復元する', async () => {
      vi.mocked(mockTokenStorage.get).mockResolvedValue(mockToken);
      vi.mocked(mockAuthRepository.checkAuth).mockResolvedValue({ auth: true });

      const result = await useCase.restoreSession();

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
    });

    it('トークンが存在しない場合は失敗を返す', async () => {
      vi.mocked(mockTokenStorage.get).mockResolvedValue(null);

      const result = await useCase.restoreSession();

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('トークンが見つかりません');
    });

    it('無効なトークンの場合は削除して失敗を返す', async () => {
      vi.mocked(mockTokenStorage.get).mockResolvedValue(mockToken);
      vi.mocked(mockAuthRepository.checkAuth).mockResolvedValue({
        auth: false,
      });
      vi.mocked(mockTokenStorage.remove).mockResolvedValue(undefined);

      const result = await useCase.restoreSession();

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('セッションが無効です');
      expect(mockTokenStorage.remove).toHaveBeenCalled();
    });

    it('認証チェック中のエラーでトークンを削除する', async () => {
      vi.mocked(mockTokenStorage.get).mockResolvedValue(mockToken);
      vi.mocked(mockAuthRepository.checkAuth).mockRejectedValue(
        new Error('Network error')
      );
      vi.mocked(mockTokenStorage.remove).mockResolvedValue(undefined);

      const result = await useCase.restoreSession();

      expect(result.success).toBe(false);
      expect(mockTokenStorage.remove).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('正常にログアウトする', async () => {
      vi.mocked(mockAuthRepository.logout).mockResolvedValue(undefined);
      vi.mocked(mockTokenStorage.remove).mockResolvedValue(undefined);

      const result = await useCase.logout();

      expect(result.success).toBe(true);
      expect(mockAuthRepository.logout).toHaveBeenCalled();
      expect(mockTokenStorage.remove).toHaveBeenCalled();
    });

    it('ログアウトAPIが失敗してもトークンを削除する', async () => {
      vi.mocked(mockAuthRepository.logout).mockRejectedValue(
        new Error('Logout API failed')
      );
      vi.mocked(mockTokenStorage.remove).mockResolvedValue(undefined);

      const result = await useCase.logout();

      expect(result.success).toBe(true);
      expect(mockTokenStorage.remove).toHaveBeenCalled();
    });
  });

  describe('getCurrentToken', () => {
    it('現在のトークンを取得する', async () => {
      vi.mocked(mockTokenStorage.get).mockResolvedValue(mockToken);

      const token = await useCase.getCurrentToken();

      expect(token).toBe(mockToken);
    });

    it('トークンが存在しない場合はnullを返す', async () => {
      vi.mocked(mockTokenStorage.get).mockResolvedValue(null);

      const token = await useCase.getCurrentToken();

      expect(token).toBeNull();
    });
  });

  describe('バリデーションヘルパー', () => {
    it('メールアドレスのバリデーションを行う', () => {
      const validResult = useCase.validateEmailInput(validEmail);
      expect(validResult.isValid).toBe(true);

      const invalidResult = useCase.validateEmailInput(invalidEmail);
      expect(invalidResult.isValid).toBe(false);
    });

    it('認証コードのバリデーションを行う', () => {
      const validResult = useCase.validateDigitInput(validDigit);
      expect(validResult.isValid).toBe(true);

      const invalidResult = useCase.validateDigitInput(invalidDigit);
      expect(invalidResult.isValid).toBe(false);
    });

    it('名前のバリデーションを行う', () => {
      const validResult = useCase.validateNameInput(validName);
      expect(validResult.isValid).toBe(true);

      const invalidResult = useCase.validateNameInput('');
      expect(invalidResult.isValid).toBe(false);
    });
  });
});
