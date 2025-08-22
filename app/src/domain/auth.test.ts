/**
 * Auth Domain Tests
 * 認証関連のビジネスロジックとバリデーションのテスト
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateDigit,
  validateName,
  validateLoginInput,
  AuthError,
  ValidationError,
  NetworkError,
  ExpiredDigitError,
  InvalidDigitError,
} from './auth';

// =============================================================================
// Validation Tests
// =============================================================================

describe('Auth Domain Validation', () => {
  describe('validateEmail', () => {
    describe('有効なメールアドレス', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.jp',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.co',
        'very.long.email.address@very.long.domain.example.com',
      ];

      validEmails.forEach(email => {
        it(`"${email}" を有効とする`, () => {
          const result = validateEmail(email);

          expect(result.isValid).toBe(true);
          expect(result.errors).toEqual([]);
        });
      });
    });

    describe('無効なメールアドレス', () => {
      const invalidEmails = [
        { email: '', expectedError: 'メールアドレスを入力してください' },
        {
          email: 'invalid',
          expectedError: '正しいメールアドレスを入力してください',
        },
        {
          email: 'invalid@',
          expectedError: '正しいメールアドレスを入力してください',
        },
        {
          email: '@domain.com',
          expectedError: '正しいメールアドレスを入力してください',
        },
        {
          email: 'user@',
          expectedError: '正しいメールアドレスを入力してください',
        },
        {
          email: 'user@domain',
          expectedError: '正しいメールアドレスを入力してください',
        },
        {
          email: 'user name@domain.com',
          expectedError: '正しいメールアドレスを入力してください',
        },
        {
          email: 'user@domain .com',
          expectedError: '正しいメールアドレスを入力してください',
        },
      ];

      invalidEmails.forEach(({ email, expectedError }) => {
        it(`"${email}" を無効とし、適切なエラーメッセージを返す`, () => {
          const result = validateEmail(email);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(expectedError);
        });
      });
    });
  });

  describe('validateDigit', () => {
    describe('有効な認証コード', () => {
      const validDigits = ['0000', '1234', '9999', '0123'];

      validDigits.forEach(digit => {
        it(`"${digit}" を有効とする`, () => {
          const result = validateDigit(digit);

          expect(result.isValid).toBe(true);
          expect(result.errors).toEqual([]);
        });
      });
    });

    describe('無効な認証コード', () => {
      const invalidDigits = [
        { digit: '', expectedError: '認証コードを入力してください' },
        {
          digit: '123',
          expectedError: '認証コードは4桁の数字で入力してください',
        },
        {
          digit: '12345',
          expectedError: '認証コードは4桁の数字で入力してください',
        },
        {
          digit: 'abcd',
          expectedError: '認証コードは4桁の数字で入力してください',
        },
        {
          digit: '12a4',
          expectedError: '認証コードは4桁の数字で入力してください',
        },
        {
          digit: '12 4',
          expectedError: '認証コードは4桁の数字で入力してください',
        },
        {
          digit: '12-4',
          expectedError: '認証コードは4桁の数字で入力してください',
        },
      ];

      invalidDigits.forEach(({ digit, expectedError }) => {
        it(`"${digit}" を無効とし、適切なエラーメッセージを返す`, () => {
          const result = validateDigit(digit);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(expectedError);
        });
      });
    });
  });

  describe('validateName', () => {
    describe('有効な名前', () => {
      const validNames = [
        'A', // 1文字
        '田中太郎',
        'John Doe',
        'Test User 123',
        'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん', // 50文字
      ];

      validNames.forEach(name => {
        it(`"${name}" (${name.length}文字) を有効とする`, () => {
          const result = validateName(name);

          expect(result.isValid).toBe(true);
          expect(result.errors).toEqual([]);
        });
      });
    });

    describe('無効な名前', () => {
      const invalidNames = [
        { name: '', expectedError: '名前を入力してください' },
        {
          name: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんあいうえお', // 51文字
          expectedError: '名前は1文字以上50文字以下で入力してください',
        },
      ];

      invalidNames.forEach(({ name, expectedError }) => {
        it(`"${name}" (${name.length}文字) を無効とし、適切なエラーメッセージを返す`, () => {
          const result = validateName(name);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain(expectedError);
        });
      });
    });
  });

  describe('validateLoginInput', () => {
    it('有効なメールアドレスと認証コードで成功する', () => {
      const result = validateLoginInput('test@example.com', '1234');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('メールアドレスが無効な場合、エラーを含む', () => {
      const result = validateLoginInput('invalid-email', '1234');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('正しいメールアドレスを入力してください');
    });

    it('認証コードが無効な場合、エラーを含む', () => {
      const result = validateLoginInput('test@example.com', '123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '認証コードは4桁の数字で入力してください'
      );
    });

    it('両方が無効な場合、両方のエラーを含む', () => {
      const result = validateLoginInput('invalid-email', '123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('正しいメールアドレスを入力してください');
      expect(result.errors).toContain(
        '認証コードは4桁の数字で入力してください'
      );
    });

    it('空の値の場合、適切なエラーメッセージを返す', () => {
      const result = validateLoginInput('', '');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('メールアドレスを入力してください');
      expect(result.errors).toContain('認証コードを入力してください');
    });
  });
});

// =============================================================================
// Error Classes Tests
// =============================================================================

describe('Auth Error Classes', () => {
  describe('AuthError', () => {
    it('基本的なエラー情報を正しく設定する', () => {
      const error = new AuthError('Test error', 'TEST_CODE', 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AuthError');
      expect(error).toBeInstanceOf(Error);
    });

    it('statusCodeが省略可能である', () => {
      const error = new AuthError('Test error', 'TEST_CODE');

      expect(error.statusCode).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('ValidationErrorの特性を持つ', () => {
      const error = new ValidationError('Validation failed');

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('AuthError');
      expect(error).toBeInstanceOf(AuthError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('NetworkError', () => {
    it('NetworkErrorの特性を持つ', () => {
      const error = new NetworkError('Network failed', 500);

      expect(error.message).toBe('Network failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error).toBeInstanceOf(AuthError);
      expect(error).toBeInstanceOf(NetworkError);
    });

    it('statusCodeが省略可能である', () => {
      const error = new NetworkError('Network failed');

      expect(error.statusCode).toBeUndefined();
    });
  });

  describe('ExpiredDigitError', () => {
    it('期限切れエラーの特性を持つ', () => {
      const error = new ExpiredDigitError();

      expect(error.message).toBe('認証コードの有効期限が切れています');
      expect(error.code).toBe('EXPIRED_DIGIT');
      expect(error).toBeInstanceOf(AuthError);
    });
  });

  describe('InvalidDigitError', () => {
    it('無効な認証コードエラーの特性を持つ', () => {
      const error = new InvalidDigitError();

      expect(error.message).toBe('認証コードが間違っています');
      expect(error.code).toBe('INVALID_DIGIT');
      expect(error).toBeInstanceOf(AuthError);
    });
  });

  describe('エラーの継承関係', () => {
    it('すべてのカスタムエラーがAuthErrorを継承している', () => {
      const errors = [
        new ValidationError('test'),
        new NetworkError('test'),
        new ExpiredDigitError(),
        new InvalidDigitError(),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(AuthError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('instanceof演算子で正しく判定できる', () => {
      const authError = new AuthError('test', 'TEST');
      const validationError = new ValidationError('test');
      const networkError = new NetworkError('test');

      expect(authError instanceof AuthError).toBe(true);
      expect(authError instanceof ValidationError).toBe(false);

      expect(validationError instanceof AuthError).toBe(true);
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof NetworkError).toBe(false);

      expect(networkError instanceof AuthError).toBe(true);
      expect(networkError instanceof NetworkError).toBe(true);
      expect(networkError instanceof ValidationError).toBe(false);
    });
  });
});
