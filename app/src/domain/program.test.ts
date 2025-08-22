/**
 * Program Domain Tests
 * プログラム関連のビジネスロジックとバリデーションのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isValidProgramStatus,
  validateProgramListRequest,
  isProgramActive,
  isProgramUpcoming,
  canParticipateInProgram,
  getProgramStatusLabel,
  formatProgramDateTime,
  getParticipationRate,
  getRemainingSlots,
  type Program,
  type ProgramListRequest,
  type ProgramStatus,
} from './program';

// =============================================================================
// Test Data
// =============================================================================

const createMockProgram = (overrides: Partial<Program> = {}): Program => ({
  id: 1,
  title: 'Test Program',
  description: 'Test Description',
  status: 'active',
  startDate: '2024-01-01T10:00:00Z',
  endDate: '2024-01-01T18:00:00Z',
  maxParticipants: 20,
  currentParticipants: 10,
  programCode: 'TEST001',
  ...overrides,
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('Program Domain Validation', () => {
  describe('isValidProgramStatus', () => {
    it('有効なステータスをtrueとする', () => {
      const validStatuses: ProgramStatus[] = [
        'upcoming',
        'active',
        'completed',
        'cancelled',
      ];

      validStatuses.forEach(status => {
        expect(isValidProgramStatus(status)).toBe(true);
      });
    });

    it('無効なステータスをfalseとする', () => {
      const invalidStatuses = ['invalid', 'pending', 'draft', '', 'ACTIVE'];

      invalidStatuses.forEach(status => {
        expect(isValidProgramStatus(status)).toBe(false);
      });
    });
  });

  describe('validateProgramListRequest', () => {
    it('有効なリクエストではnullを返す', () => {
      const validRequests: ProgramListRequest[] = [
        {},
        { page: 1 },
        { limit: 20 },
        { status: 'active' },
        { page: 5, limit: 50, status: 'upcoming' },
      ];

      validRequests.forEach(request => {
        expect(validateProgramListRequest(request)).toBeNull();
      });
    });

    describe('pageバリデーション', () => {
      it('pageが0以下の場合エラーを返す', () => {
        const requests = [{ page: 0 }, { page: -1 }, { page: -100 }];

        requests.forEach(request => {
          const error = validateProgramListRequest(request);
          expect(error).not.toBeNull();
          expect(error!.type).toBe('validation');
          expect(error!.field).toBe('page');
          expect(error!.message).toContain('greater than 0');
        });
      });

      it('pageが1以上の場合は有効', () => {
        const requests = [{ page: 1 }, { page: 10 }, { page: 1000 }];

        requests.forEach(request => {
          expect(validateProgramListRequest(request)).toBeNull();
        });
      });
    });

    describe('limitバリデーション', () => {
      it('limitが1未満または100を超える場合エラーを返す', () => {
        const requests = [
          { limit: 0 },
          { limit: -1 },
          { limit: 101 },
          { limit: 1000 },
        ];

        requests.forEach(request => {
          const error = validateProgramListRequest(request);
          expect(error).not.toBeNull();
          expect(error!.type).toBe('validation');
          expect(error!.field).toBe('limit');
          expect(error!.message).toContain('between 1 and 100');
        });
      });

      it('limitが1-100の範囲の場合は有効', () => {
        const requests = [{ limit: 1 }, { limit: 50 }, { limit: 100 }];

        requests.forEach(request => {
          expect(validateProgramListRequest(request)).toBeNull();
        });
      });
    });

    describe('statusバリデーション', () => {
      it('無効なstatusの場合エラーを返す', () => {
        const requests = [
          { status: 'invalid' as any },
          { status: 'ACTIVE' as any },
          { status: 'pending' as any },
        ];

        requests.forEach(request => {
          const error = validateProgramListRequest(request);
          expect(error).not.toBeNull();
          expect(error!.type).toBe('validation');
          expect(error!.field).toBe('status');
          expect(error!.message).toContain('Invalid program status');
        });
      });
    });
  });
});

// =============================================================================
// Business Logic Tests
// =============================================================================

describe('Program Business Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isProgramActive', () => {
    it('activeステータスで期間内の場合trueを返す', () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z')); // プログラム期間内

      const program = createMockProgram({
        status: 'active',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T18:00:00Z',
      });

      expect(isProgramActive(program)).toBe(true);
    });

    it('activeステータスでも期間外の場合falseを返す', () => {
      vi.setSystemTime(new Date('2024-01-02T12:00:00Z')); // プログラム終了後

      const program = createMockProgram({
        status: 'active',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T18:00:00Z',
      });

      expect(isProgramActive(program)).toBe(false);
    });

    it('期間内でもactiveステータス以外の場合falseを返す', () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const statuses: ProgramStatus[] = ['upcoming', 'completed', 'cancelled'];

      statuses.forEach(status => {
        const program = createMockProgram({ status });
        expect(isProgramActive(program)).toBe(false);
      });
    });

    it('開始時刻ちょうどの場合trueを返す', () => {
      vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));

      const program = createMockProgram({
        status: 'active',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T18:00:00Z',
      });

      expect(isProgramActive(program)).toBe(true);
    });

    it('終了時刻ちょうどの場合trueを返す', () => {
      vi.setSystemTime(new Date('2024-01-01T18:00:00Z'));

      const program = createMockProgram({
        status: 'active',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T18:00:00Z',
      });

      expect(isProgramActive(program)).toBe(true);
    });
  });

  describe('isProgramUpcoming', () => {
    it('upcomingステータスで開始前の場合trueを返す', () => {
      vi.setSystemTime(new Date('2023-12-31T12:00:00Z')); // プログラム開始前

      const program = createMockProgram({
        status: 'upcoming',
        startDate: '2024-01-01T10:00:00Z',
      });

      expect(isProgramUpcoming(program)).toBe(true);
    });

    it('upcomingステータスでも開始後の場合falseを返す', () => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z')); // プログラム開始後

      const program = createMockProgram({
        status: 'upcoming',
        startDate: '2024-01-01T10:00:00Z',
      });

      expect(isProgramUpcoming(program)).toBe(false);
    });

    it('開始前でもupcomingステータス以外の場合falseを返す', () => {
      vi.setSystemTime(new Date('2023-12-31T12:00:00Z'));

      const statuses: ProgramStatus[] = ['active', 'completed', 'cancelled'];

      statuses.forEach(status => {
        const program = createMockProgram({ status });
        expect(isProgramUpcoming(program)).toBe(false);
      });
    });
  });

  describe('canParticipateInProgram', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z')); // アクティブな時間
    });

    it('アクティブなプログラムで定員に空きがある場合trueを返す', () => {
      const program = createMockProgram({
        status: 'active',
        maxParticipants: 20,
        currentParticipants: 10,
      });

      expect(canParticipateInProgram(program)).toBe(true);
    });

    it('upcomingなプログラムで定員に空きがある場合trueを返す', () => {
      vi.setSystemTime(new Date('2023-12-31T12:00:00Z')); // 開始前

      const program = createMockProgram({
        status: 'upcoming',
        maxParticipants: 20,
        currentParticipants: 10,
      });

      expect(canParticipateInProgram(program)).toBe(true);
    });

    it('定員満了の場合falseを返す', () => {
      const program = createMockProgram({
        status: 'active',
        maxParticipants: 20,
        currentParticipants: 20,
      });

      expect(canParticipateInProgram(program)).toBe(false);
    });

    it('定員超過の場合falseを返す', () => {
      const program = createMockProgram({
        status: 'active',
        maxParticipants: 20,
        currentParticipants: 25,
      });

      expect(canParticipateInProgram(program)).toBe(false);
    });

    it('定員未設定の場合trueを返す', () => {
      const program = createMockProgram({
        status: 'active',
        maxParticipants: undefined,
        currentParticipants: 100,
      });

      expect(canParticipateInProgram(program)).toBe(true);
    });

    it('completedプログラムの場合falseを返す', () => {
      const program = createMockProgram({
        status: 'completed',
        maxParticipants: 20,
        currentParticipants: 10,
      });

      expect(canParticipateInProgram(program)).toBe(false);
    });

    it('cancelledプログラムの場合falseを返す', () => {
      const program = createMockProgram({
        status: 'cancelled',
        maxParticipants: 20,
        currentParticipants: 10,
      });

      expect(canParticipateInProgram(program)).toBe(false);
    });
  });

  describe('getProgramStatusLabel', () => {
    it('各ステータスに対応する日本語ラベルを返す', () => {
      const expectedLabels: Record<ProgramStatus, string> = {
        upcoming: '開催予定',
        active: '開催中',
        completed: '終了',
        cancelled: 'キャンセル',
      };

      Object.entries(expectedLabels).forEach(([status, label]) => {
        expect(getProgramStatusLabel(status as ProgramStatus)).toBe(label);
      });
    });
  });
});

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe('Program Utility Functions', () => {
  describe('formatProgramDateTime', () => {
    it('同日のプログラムの場合、適切にフォーマットする', () => {
      const program = createMockProgram({
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T18:00:00Z',
      });

      const result = formatProgramDateTime(program);

      expect(result.timeRange).toBe('19:00 - 03:00'); // JST変換
      expect(result.duration).toBe('8時間');
    });

    it('複数日にわたるプログラムの場合、適切にフォーマットする', () => {
      const program = createMockProgram({
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-02T18:00:00Z',
      });

      const result = formatProgramDateTime(program);

      expect(result.duration).toBe('32時間');
    });

    it('1時間未満のプログラムの場合、分単位で表示する', () => {
      const program = createMockProgram({
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T10:30:00Z',
      });

      const result = formatProgramDateTime(program);

      expect(result.duration).toBe('30分');
    });
  });

  describe('getParticipationRate', () => {
    it('参加率を正しく計算する', () => {
      const testCases = [
        { maxParticipants: 20, currentParticipants: 10, expected: 50 },
        { maxParticipants: 100, currentParticipants: 75, expected: 75 },
        { maxParticipants: 3, currentParticipants: 1, expected: 33 },
        { maxParticipants: 3, currentParticipants: 2, expected: 67 },
        { maxParticipants: 10, currentParticipants: 0, expected: 0 },
        { maxParticipants: 10, currentParticipants: 10, expected: 100 },
      ];

      testCases.forEach(
        ({ maxParticipants, currentParticipants, expected }) => {
          const program = createMockProgram({
            maxParticipants,
            currentParticipants,
          });
          expect(getParticipationRate(program)).toBe(expected);
        }
      );
    });

    it('定員未設定の場合0を返す', () => {
      const program = createMockProgram({
        maxParticipants: undefined,
        currentParticipants: 50,
      });

      expect(getParticipationRate(program)).toBe(0);
    });

    it('超過参加の場合100%を超える値を返す', () => {
      const program = createMockProgram({
        maxParticipants: 10,
        currentParticipants: 15,
      });

      expect(getParticipationRate(program)).toBe(150);
    });
  });

  describe('getRemainingSlots', () => {
    it('残り枠数を正しく計算する', () => {
      const testCases = [
        { maxParticipants: 20, currentParticipants: 10, expected: 10 },
        { maxParticipants: 100, currentParticipants: 75, expected: 25 },
        { maxParticipants: 10, currentParticipants: 0, expected: 10 },
        { maxParticipants: 10, currentParticipants: 10, expected: 0 },
      ];

      testCases.forEach(
        ({ maxParticipants, currentParticipants, expected }) => {
          const program = createMockProgram({
            maxParticipants,
            currentParticipants,
          });
          expect(getRemainingSlots(program)).toBe(expected);
        }
      );
    });

    it('定員未設定の場合nullを返す', () => {
      const program = createMockProgram({
        maxParticipants: undefined,
        currentParticipants: 50,
      });

      expect(getRemainingSlots(program)).toBeNull();
    });

    it('超過参加の場合0を返す', () => {
      const program = createMockProgram({
        maxParticipants: 10,
        currentParticipants: 15,
      });

      expect(getRemainingSlots(program)).toBe(0);
    });
  });
});
