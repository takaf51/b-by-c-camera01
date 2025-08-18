/**
 * EventUseCase Tests
 * 重要なビジネスロジックのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventUseCaseImpl } from './EventUseCase';
import type { EventRepository } from '../repositories/EventRepository';
import type { Event, EventListRequest, EventListResponse, EventError } from '../domain/event';

// =============================================================================
// Mock Repository
// =============================================================================

const createMockRepository = (): EventRepository => ({
  getEventList: vi.fn(),
  getEventDetail: vi.fn(),
});

// =============================================================================
// Test Data
// =============================================================================

const mockEvents: Event[] = [
  {
    id: 1,
    title: 'Test Event 1',
    description: 'Description 1',
    status: 'completed',
    startDate: '2024-01-01T10:00:00Z',
    endDate: '2024-01-01T18:00:00Z',
    currentParticipants: 10,
    eventCode: 'EVENT001'
  },
  {
    id: 2,
    title: 'Test Event 2',
    description: 'Description 2',
    status: 'active',
    startDate: '2024-01-02T10:00:00Z',
    endDate: '2024-01-02T18:00:00Z',
    currentParticipants: 5,
    eventCode: 'EVENT002'
  },
  {
    id: 3,
    title: 'Test Event 3',
    description: 'Description 3',
    status: 'upcoming',
    startDate: '2024-01-03T10:00:00Z',
    endDate: '2024-01-03T18:00:00Z',
    currentParticipants: 0,
    eventCode: 'EVENT003'
  }
];

const mockListResponse: EventListResponse = {
  events: mockEvents,
  totalCount: 3,
  currentPage: 1,
  totalPages: 1
};

// =============================================================================
// Tests
// =============================================================================

describe('EventUseCase', () => {
  let useCase: EventUseCaseImpl;
  let mockRepository: EventRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    useCase = new EventUseCaseImpl(mockRepository);
  });

  describe('getEventList', () => {
    it('デフォルト値を設定してリポジトリを呼び出す', async () => {
      vi.mocked(mockRepository.getEventList).mockResolvedValue(mockListResponse);

      await useCase.getEventList();

      expect(mockRepository.getEventList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined
      });
    });

    it('リクエストパラメータを正しく渡す', async () => {
      vi.mocked(mockRepository.getEventList).mockResolvedValue(mockListResponse);
      
      const request: EventListRequest = {
        page: 2,
        limit: 10,
        status: 'active'
      };

      await useCase.getEventList(request);

      expect(mockRepository.getEventList).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'active'
      });
    });

    it('イベントを優先度順にソートする (active > upcoming > completed)', async () => {
      vi.mocked(mockRepository.getEventList).mockResolvedValue(mockListResponse);

      const result = await useCase.getEventList();

      // 優先度順: active(id:2) > upcoming(id:3) > completed(id:1)
      expect(result.events[0].status).toBe('active');
      expect(result.events[0].id).toBe(2);
      expect(result.events[1].status).toBe('upcoming');
      expect(result.events[1].id).toBe(3);
      expect(result.events[2].status).toBe('completed');
      expect(result.events[2].id).toBe(1);
    });

    it('同じステータスの場合は開始日でソートする', async () => {
      const eventsWithSameStatus: Event[] = [
        { ...mockEvents[0], status: 'active', startDate: '2024-01-03T10:00:00Z' },
        { ...mockEvents[1], status: 'active', startDate: '2024-01-01T10:00:00Z' },
        { ...mockEvents[2], status: 'active', startDate: '2024-01-02T10:00:00Z' }
      ];

      const responseWithSameStatus = {
        ...mockListResponse,
        events: eventsWithSameStatus
      };

      vi.mocked(mockRepository.getEventList).mockResolvedValue(responseWithSameStatus);

      const result = await useCase.getEventList();

      // 開始日順 (早い順)
      expect(result.events[0].startDate).toBe('2024-01-01T10:00:00Z');
      expect(result.events[1].startDate).toBe('2024-01-02T10:00:00Z');
      expect(result.events[2].startDate).toBe('2024-01-03T10:00:00Z');
    });

    describe('バリデーション', () => {
      it('無効なpageでエラーをスローする', async () => {
        const request = { page: 0 };

        await expect(useCase.getEventList(request)).rejects.toMatchObject({
          type: 'validation',
          field: 'page'
        });
      });

      it('無効なlimitでエラーをスローする', async () => {
        const request = { limit: 101 };

        await expect(useCase.getEventList(request)).rejects.toMatchObject({
          type: 'validation',
          field: 'limit'
        });
      });

      it('無効なstatusでエラーをスローする', async () => {
        const request = { status: 'invalid' as any };

        await expect(useCase.getEventList(request)).rejects.toMatchObject({
          type: 'validation',
          field: 'status'
        });
      });
    });

    it('リポジトリエラーを適切に処理する', async () => {
      const repositoryError: EventError = {
        type: 'network',
        message: 'Network error'
      };

      vi.mocked(mockRepository.getEventList).mockRejectedValue(repositoryError);

      await expect(useCase.getEventList()).rejects.toEqual(repositoryError);
    });
  });

  describe('getEventDetail', () => {
    it('有効なIDでイベント詳細を取得する', async () => {
      const mockEvent = mockEvents[0];
      vi.mocked(mockRepository.getEventDetail).mockResolvedValue(mockEvent);

      const result = await useCase.getEventDetail(1);

      expect(result).toEqual(mockEvent);
      expect(mockRepository.getEventDetail).toHaveBeenCalledWith(1);
    });

    it('無効なIDでエラーをスローする', async () => {
      await expect(useCase.getEventDetail(0)).rejects.toMatchObject({
        type: 'validation',
        field: 'id'
      });

      await expect(useCase.getEventDetail(-1)).rejects.toMatchObject({
        type: 'validation',
        field: 'id'
      });
    });

    it('リポジトリエラーを適切に処理する', async () => {
      const repositoryError: EventError = {
        type: 'server',
        message: 'Server error'
      };

      vi.mocked(mockRepository.getEventDetail).mockRejectedValue(repositoryError);

      await expect(useCase.getEventDetail(1)).rejects.toEqual(repositoryError);
    });
  });
});
