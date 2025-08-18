/**
 * Program Repository
 * プログラム関連のAPI通信を抽象化
 */

import type { Program, ProgramDetail, ProgramListRequest, ProgramListResponse, ProgramError } from '../domain/program';
import { createHttpClient } from '../lib/http';

// =============================================================================
// Repository Interface
// =============================================================================

export interface ProgramRepository {
  /**
   * プログラム一覧を取得
   */
  getProgramList(request?: ProgramListRequest): Promise<ProgramListResponse>;
  
  /**
   * プログラム詳細を取得
   */
  getProgramDetail(id: number): Promise<ProgramDetail>;
}

// =============================================================================
// HTTP Implementation
// =============================================================================

export class HttpProgramRepository implements ProgramRepository {
  private httpClient = createHttpClient();

  async getProgramList(request: ProgramListRequest = {}): Promise<ProgramListResponse> {
    try {
      const params = new URLSearchParams();
      
      if (request.page) params.append('page', request.page.toString());
      if (request.limit) params.append('limit', request.limit.toString());
      if (request.status) params.append('status', request.status);
      
      const queryString = params.toString();
      const url = `/api/program/list${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.httpClient.get(url);

      return this.transformProgramListResponse(response);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getProgramDetail(id: number): Promise<ProgramDetail> {
    try {
      const response = await this.httpClient.get(`/api/program/detail/${id}`);

      return this.transformProgramDetailResponse(response);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private transformProgramListResponse(response: any): ProgramListResponse {
    return {
      programs: response.programs?.map((program: any) => this.transformProgramResponse(program)) || [],
      totalCount: response.totalCount || 0,
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1,
    };
  }

  private transformProgramResponse(program: any): Program {
    return {
      id: program.id,
      title: program.title || '',
      description: program.description || '',
      status: program.status || 'upcoming',
      startDate: program.startDate || program.start_date || '',
      endDate: program.endDate || program.end_date || '',
      maxParticipants: program.maxParticipants || program.max_participants,
      currentParticipants: program.currentParticipants || program.current_participants || 0,
      imageUrl: program.imageUrl || program.image_url,
      programCode: program.programCode || program.program_code || '',
    };
  }

  private transformProgramDetailResponse(program: any): ProgramDetail {
    return {
      ...this.transformProgramResponse(program),
      longDescription: program.longDescription || program.long_description,
      location: program.location,
      requirements: program.requirements || [],
      benefits: program.benefits || [],
      organizer: program.organizer ? {
        name: program.organizer.name || '',
        contact: program.organizer.contact,
      } : undefined,
      schedule: program.schedule?.map((item: any) => ({
        time: item.time || '',
        title: item.title || '',
        description: item.description,
      })) || [],
      images: program.images || [],
    };
  }

  private normalizeError(error: unknown): ProgramError {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return {
          type: 'network',
          message: 'ネットワークエラーが発生しました'
        };
      }
      
      return {
        type: 'server',
        message: error.message
      };
    }

    return {
      type: 'unknown',
      message: '予期しないエラーが発生しました'
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createProgramRepository(): ProgramRepository {
  return new HttpProgramRepository();
}
