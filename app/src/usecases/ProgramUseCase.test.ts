/**
 * ProgramUseCase Tests
 * 重要なビジネスロジックのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgramUseCaseImpl } from './ProgramUseCase';
import type { ProgramRepository } from '../repositories/ProgramRepository';
import type {
  Program,
  ProgramListRequest,
  ProgramListResponse,
  ProgramError,
} from '../domain/program';

// =============================================================================
// Mock Repository
// =============================================================================

const createMockRepository = (): ProgramRepository => ({
  getProgramList: vi.fn(),
  getProgramDetail: vi.fn(),
});

// =============================================================================
// Test Data
// =============================================================================

const mockPrograms: Program[] = [
  {
    id: 1,
    title: 'Test Program 1',
    description: 'Description 1',
    status: 'completed',
    startDate: '2024-01-01T10:00:00Z',
    endDate: '2024-01-01T18:00:00Z',
    currentParticipants: 10,
    programCode: 'PROGRAM001',
  },
  {
    id: 2,
    title: 'Test Program 2',
    description: 'Description 2',
    status: 'active',
    startDate: '2024-01-02T10:00:00Z',
    endDate: '2024-01-02T18:00:00Z',
    currentParticipants: 5,
    programCode: 'PROGRAM002',
  },
  {
    id: 3,
    title: 'Test Program 3',
    description: 'Description 3',
    status: 'upcoming',
    startDate: '2024-01-03T10:00:00Z',
    endDate: '2024-01-03T18:00:00Z',
    currentParticipants: 0,
    programCode: 'PROGRAM003',
  },
];

const mockListResponse: ProgramListResponse = {
  programs: mockPrograms,
  totalCount: 3,
  currentPage: 1,
  totalPages: 1,
};

// =============================================================================
// Tests
// =============================================================================

describe('ProgramUseCase', () => {
  let useCase: ProgramUseCaseImpl;
  let mockRepository: ProgramRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new ProgramUseCaseImpl(mockRepository);
  });

  describe('getProgramList', () => {
    it('デフォルト値を設定してリポジトリを呼び出す', async () => {
      vi.mocked(mockRepository.getProgramList).mockResolvedValue(
        mockListResponse
      );

      await useCase.getProgramList();

      expect(mockRepository.getProgramList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
      });
    });

    it('リクエストパラメータを正しく渡す', async () => {
      vi.mocked(mockRepository.getProgramList).mockResolvedValue(
        mockListResponse
      );

      const request: ProgramListRequest = {
        page: 2,
        limit: 10,
        status: 'active',
      };

      await useCase.getProgramList(request);

      expect(mockRepository.getProgramList).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'active',
      });
    });

    it('プログラムを優先度順にソートする (active > upcoming > completed)', async () => {
      vi.mocked(mockRepository.getProgramList).mockResolvedValue(
        mockListResponse
      );

      const result = await useCase.getProgramList();

      // 優先度順: active(id:2) > upcoming(id:3) > completed(id:1)
      expect(result.programs[0].status).toBe('active');
      expect(result.programs[0].id).toBe(2);
      expect(result.programs[1].status).toBe('upcoming');
      expect(result.programs[1].id).toBe(3);
      expect(result.programs[2].status).toBe('completed');
      expect(result.programs[2].id).toBe(1);
    });

    it('同じステータスの場合は開始日でソートする', async () => {
      const programsWithSameStatus: Program[] = [
        {
          ...mockPrograms[0],
          status: 'active',
          startDate: '2024-01-03T10:00:00Z',
        },
        {
          ...mockPrograms[1],
          status: 'active',
          startDate: '2024-01-01T10:00:00Z',
        },
        {
          ...mockPrograms[2],
          status: 'active',
          startDate: '2024-01-02T10:00:00Z',
        },
      ];

      const responseWithSameStatus = {
        ...mockListResponse,
        programs: programsWithSameStatus,
      };

      vi.mocked(mockRepository.getProgramList).mockResolvedValue(
        responseWithSameStatus
      );

      const result = await useCase.getProgramList();

      // 開始日順 (早い順)
      expect(result.programs[0].startDate).toBe('2024-01-01T10:00:00Z');
      expect(result.programs[1].startDate).toBe('2024-01-02T10:00:00Z');
      expect(result.programs[2].startDate).toBe('2024-01-03T10:00:00Z');
    });

    describe('バリデーション', () => {
      it('無効なpageでエラーをスローする', async () => {
        const request = { page: 0 };

        await expect(useCase.getProgramList(request)).rejects.toMatchObject({
          type: 'validation',
          field: 'page',
        });
      });

      it('無効なlimitでエラーをスローする', async () => {
        const request = { limit: 101 };

        await expect(useCase.getProgramList(request)).rejects.toMatchObject({
          type: 'validation',
          field: 'limit',
        });
      });

      it('無効なstatusでエラーをスローする', async () => {
        const request = { status: 'invalid' as any };

        await expect(useCase.getProgramList(request)).rejects.toMatchObject({
          type: 'validation',
          field: 'status',
        });
      });
    });

    it('リポジトリエラーを適切に処理する', async () => {
      const repositoryError: ProgramError = {
        type: 'network',
        message: 'Network error',
      };

      vi.mocked(mockRepository.getProgramList).mockRejectedValue(
        repositoryError
      );

      await expect(useCase.getProgramList()).rejects.toEqual(repositoryError);
    });
  });

  describe('getProgramDetail', () => {
    it('有効なIDでプログラム詳細を取得する', async () => {
      const mockProgram = mockPrograms[0];
      vi.mocked(mockRepository.getProgramDetail).mockResolvedValue(mockProgram);

      const result = await useCase.getProgramDetail(1);

      expect(result).toEqual(mockProgram);
      expect(mockRepository.getProgramDetail).toHaveBeenCalledWith(1);
    });

    it('無効なIDでエラーをスローする', async () => {
      await expect(useCase.getProgramDetail(0)).rejects.toMatchObject({
        type: 'validation',
        field: 'id',
      });

      await expect(useCase.getProgramDetail(-1)).rejects.toMatchObject({
        type: 'validation',
        field: 'id',
      });
    });

    it('リポジトリエラーを適切に処理する', async () => {
      const repositoryError: ProgramError = {
        type: 'server',
        message: 'Server error',
      };

      vi.mocked(mockRepository.getProgramDetail).mockRejectedValue(
        repositoryError
      );

      await expect(useCase.getProgramDetail(1)).rejects.toEqual(
        repositoryError
      );
    });
  });
});
