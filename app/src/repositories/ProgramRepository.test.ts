/**
 * ProgramRepository Tests
 * プログラム関連のHTTP通信とデータ変換のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpProgramRepository } from './ProgramRepository';
import { HttpClient } from '../lib/http';
import type { ProgramListRequest } from '../domain/program';

// createHttpClient をモック
vi.mock('../lib/http', () => ({
  createHttpClient: () => mockHttpClient,
}));

// =============================================================================
// Mock HTTP Client
// =============================================================================

const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// =============================================================================
// Test Data
// =============================================================================

const mockProgramResponse = {
  id: 1,
  title: 'Test Program',
  description: 'Test Description',
  status: 'active',
  startDate: '2024-01-01T10:00:00Z',
  endDate: '2024-01-01T18:00:00Z',
  maxParticipants: 20,
  currentParticipants: 10,
  imageUrl: 'https://example.com/image.jpg',
  programCode: 'TEST001'
};

const mockProgramDetailResponse = {
  ...mockProgramResponse,
  longDescription: 'Detailed description',
  location: 'Test Location',
  requirements: ['Requirement 1', 'Requirement 2'],
  benefits: ['Benefit 1', 'Benefit 2'],
  organizer: {
    name: 'Test Organizer',
    contact: 'test@example.com'
  },
  schedule: [
    {
      time: '10:00',
      title: 'Opening',
      description: 'Program opening'
    }
  ],
  images: ['image1.jpg', 'image2.jpg']
};

const mockListResponse = {
  programs: [mockProgramResponse],
  totalCount: 1,
  currentPage: 1,
  totalPages: 1
};

// Snake case レスポンス（API仕様）
const mockApiProgramResponse = {
  id: 1,
  title: 'Test Program',
  description: 'Test Description',
  status: 'active',
  start_date: '2024-01-01T10:00:00Z',
  end_date: '2024-01-01T18:00:00Z',
  max_participants: 20,
  current_participants: 10,
  image_url: 'https://example.com/image.jpg',
  program_code: 'TEST001'
};

const mockApiDetailResponse = {
  ...mockApiProgramResponse,
  long_description: 'Detailed description',
  location: 'Test Location',
  requirements: ['Requirement 1', 'Requirement 2'],
  benefits: ['Benefit 1', 'Benefit 2'],
  organizer: {
    name: 'Test Organizer',
    contact: 'test@example.com'
  },
  schedule: [
    {
      time: '10:00',
      title: 'Opening',
      description: 'Program opening'
    }
  ],
  images: ['image1.jpg', 'image2.jpg']
};

// =============================================================================
// Tests
// =============================================================================

describe('HttpProgramRepository', () => {
  let repository: HttpProgramRepository;

  beforeEach(() => {
    repository = new HttpProgramRepository();
    vi.clearAllMocks();
  });

  describe('getProgramList', () => {
    it('デフォルトパラメータでプログラム一覧を取得する', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockListResponse);

      const result = await repository.getProgramList();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/plan/list');
      expect(result).toEqual(mockListResponse);
    });

    it('ページングパラメータでプログラム一覧を取得する', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockListResponse);

      const request: ProgramListRequest = {
        page: 2,
        limit: 10
      };

      await repository.getProgramList(request);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/plan/list?page=2&limit=10');
    });

    it('ステータスフィルターでプログラム一覧を取得する', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockListResponse);

      const request: ProgramListRequest = {
        status: 'active'
      };

      await repository.getProgramList(request);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/plan/list?status=active');
    });

    it('全パラメータでプログラム一覧を取得する', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockListResponse);

      const request: ProgramListRequest = {
        page: 3,
        limit: 5,
        status: 'upcoming'
      };

      await repository.getProgramList(request);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/plan/list?page=3&limit=5&status=upcoming');
    });

    it('APIレスポンスを正しい形式に変換する', async () => {
      const apiResponse = {
        programs: [mockApiProgramResponse],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1
      };
      
      vi.mocked(mockHttpClient.get).mockResolvedValue(apiResponse);

      const result = await repository.getProgramList();

      expect(result.programs[0]).toEqual({
        id: 1,
        title: 'Test Program',
        description: 'Test Description',
        status: 'active',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T18:00:00Z',
        maxParticipants: 20,
        currentParticipants: 10,
        imageUrl: 'https://example.com/image.jpg',
        programCode: 'TEST001'
      });
    });

    it('プログラムが空の場合も正しく処理する', async () => {
      const emptyResponse = {
        programs: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      
      vi.mocked(mockHttpClient.get).mockResolvedValue(emptyResponse);

      const result = await repository.getProgramList();

      expect(result.programs).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('不完全なAPIレスポンスも処理する', async () => {
      const incompleteResponse = {
        programs: [{ id: 1 }] // 最小限のフィールドのみ
      };
      
      vi.mocked(mockHttpClient.get).mockResolvedValue(incompleteResponse);

      const result = await repository.getProgramList();

      expect(result.programs[0]).toEqual({
        id: 1,
        title: '',
        description: '',
        status: 'upcoming',
        startDate: '',
        endDate: '',
        maxParticipants: undefined,
        currentParticipants: 0,
        imageUrl: undefined,
        programCode: ''
      });
    });

    it('HTTPエラーを正規化して投げる', async () => {
      const networkError = new Error('fetch failed');
      vi.mocked(mockHttpClient.get).mockRejectedValue(networkError);

      await expect(repository.getProgramList()).rejects.toMatchObject({
        type: 'network',
        message: 'ネットワークエラーが発生しました'
      });
    });

    it('予期しないエラーを処理する', async () => {
      vi.mocked(mockHttpClient.get).mockRejectedValue('unexpected error');

      await expect(repository.getProgramList()).rejects.toMatchObject({
        type: 'unknown',
        message: '予期しないエラーが発生しました'
      });
    });
  });

  describe('getProgramDetail', () => {
    it('プログラム詳細を取得する', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProgramDetailResponse);

      const result = await repository.getProgramDetail(1);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/plan/detail/1');
      expect(result).toEqual(mockProgramDetailResponse);
    });

    it('APIレスポンス（snake_case）を正しい形式に変換する', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockApiDetailResponse);

      const result = await repository.getProgramDetail(1);

      expect(result).toEqual({
        id: 1,
        title: 'Test Program',
        description: 'Test Description',
        status: 'active',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T18:00:00Z',
        maxParticipants: 20,
        currentParticipants: 10,
        imageUrl: 'https://example.com/image.jpg',
        programCode: 'TEST001',
        longDescription: 'Detailed description',
        location: 'Test Location',
        requirements: ['Requirement 1', 'Requirement 2'],
        benefits: ['Benefit 1', 'Benefit 2'],
        organizer: {
          name: 'Test Organizer',
          contact: 'test@example.com'
        },
        schedule: [
          {
            time: '10:00',
            title: 'Opening',
            description: 'Program opening'
          }
        ],
        images: ['image1.jpg', 'image2.jpg']
      });
    });

    it('organizerが存在しない場合はundefinedを設定する', async () => {
      const responseWithoutOrganizer = {
        ...mockApiDetailResponse,
        organizer: null
      };
      
      vi.mocked(mockHttpClient.get).mockResolvedValue(responseWithoutOrganizer);

      const result = await repository.getProgramDetail(1);

      expect(result.organizer).toBeUndefined();
    });

    it('配列フィールドが存在しない場合は空配列を設定する', async () => {
      const responseWithoutArrays = {
        ...mockApiDetailResponse,
        requirements: undefined,
        benefits: undefined,
        schedule: undefined,
        images: undefined
      };
      
      vi.mocked(mockHttpClient.get).mockResolvedValue(responseWithoutArrays);

      const result = await repository.getProgramDetail(1);

      expect(result.requirements).toEqual([]);
      expect(result.benefits).toEqual([]);
      expect(result.schedule).toEqual([]);
      expect(result.images).toEqual([]);
    });

    it('HTTPエラーを正規化して投げる', async () => {
      const serverError = new Error('Server error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(serverError);

      await expect(repository.getProgramDetail(1)).rejects.toMatchObject({
        type: 'server',
        message: 'Server error'
      });
    });
  });

  describe('エラー正規化', () => {
    it('fetchエラーをネットワークエラーとして処理する', async () => {
      const fetchError = new Error('Failed to fetch');
      vi.mocked(mockHttpClient.get).mockRejectedValue(fetchError);

      await expect(repository.getProgramList()).rejects.toMatchObject({
        type: 'network',
        message: 'ネットワークエラーが発生しました'
      });
    });

    it('Errorオブジェクトをサーバーエラーとして処理する', async () => {
      const serverError = new Error('Internal server error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(serverError);

      await expect(repository.getProgramList()).rejects.toMatchObject({
        type: 'server',
        message: 'Internal server error'
      });
    });

    it('非Errorオブジェクトを未知のエラーとして処理する', async () => {
      vi.mocked(mockHttpClient.get).mockRejectedValue({ code: 500 });

      await expect(repository.getProgramList()).rejects.toMatchObject({
        type: 'unknown',
        message: '予期しないエラーが発生しました'
      });
    });
  });
});
