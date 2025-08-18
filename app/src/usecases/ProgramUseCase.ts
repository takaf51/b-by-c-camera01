/**
 * Program UseCase
 * プログラム関連のビジネスロジックを管理
 */

import type { 
  Program, 
  ProgramDetail,
  ProgramListRequest, 
  ProgramListResponse, 
  ProgramError 
} from '../domain/program';
import { validateProgramListRequest } from '../domain/program';
import type { ProgramRepository } from '../repositories/ProgramRepository';

// =============================================================================
// UseCase Interface
// =============================================================================

export interface ProgramUseCase {
  /**
   * プログラム一覧を取得（バリデーション付き）
   */
  getProgramList(request?: ProgramListRequest): Promise<ProgramListResponse>;
  
  /**
   * プログラム詳細を取得
   */
  getProgramDetail(id: number): Promise<ProgramDetail>;
}

// =============================================================================
// Implementation
// =============================================================================

export class ProgramUseCaseImpl implements ProgramUseCase {
  constructor(private programRepository: ProgramRepository) {}

  async getProgramList(request: ProgramListRequest = {}): Promise<ProgramListResponse> {
    // バリデーション
    const validationError = validateProgramListRequest(request);
    if (validationError) {
      throw validationError;
    }

    // デフォルト値の設定
    const normalizedRequest: ProgramListRequest = {
      page: request.page || 1,
      limit: request.limit || 20,
      status: request.status,
    };

    try {
      const response = await this.programRepository.getProgramList(normalizedRequest);
      
      // ビジネスロジック: プログラムの並び順を調整
      const sortedPrograms = this.sortProgramsByPriority(response.programs);
      
      return {
        ...response,
        programs: sortedPrograms,
      };
    } catch (error) {
      throw this.handleRepositoryError(error);
    }
  }

  async getProgramDetail(id: number): Promise<ProgramDetail> {
    if (id <= 0) {
      throw {
        type: 'validation',
        message: 'Invalid program ID',
        field: 'id'
      } as ProgramError;
    }

    try {
      const programDetail = await this.programRepository.getProgramDetail(id);
      
      // ビジネスロジック: 詳細情報の整理・加工
      return this.enhanceProgramDetail(programDetail);
    } catch (error) {
      throw this.handleRepositoryError(error);
    }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * プログラムを優先度順にソート
   * ビジネスルール: active > upcoming > completed > cancelled
   */
  private sortProgramsByPriority(programs: Program[]): Program[] {
    const priorityOrder = { active: 1, upcoming: 2, completed: 3, cancelled: 4 };
    
    return programs.sort((a, b) => {
      // ステータス優先度でソート
      const aPriority = priorityOrder[a.status];
      const bPriority = priorityOrder[b.status];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // 同じステータスの場合は開始日でソート
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }

  /**
   * Repository エラーをUseCase エラーに変換
   */
  private handleRepositoryError(error: unknown): ProgramError {
    if (this.isProgramError(error)) {
      return error;
    }

    return {
      type: 'unknown',
      message: '予期しないエラーが発生しました'
    };
  }

  private isProgramError(error: unknown): error is ProgramError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error
    );
  }

  /**
   * プログラム詳細の情報を整理・加工
   */
  private enhanceProgramDetail(programDetail: ProgramDetail): ProgramDetail {
    return {
      ...programDetail,
      // ビジネスロジック: スケジュールを時間順でソート
      schedule: programDetail.schedule?.sort((a, b) => {
        return a.time.localeCompare(b.time);
      }),
      // ビジネスロジック: 空の配列をundefinedに統一
      requirements: programDetail.requirements?.length ? programDetail.requirements : undefined,
      benefits: programDetail.benefits?.length ? programDetail.benefits : undefined,
      images: programDetail.images?.length ? programDetail.images : undefined,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createProgramUseCase(programRepository: ProgramRepository): ProgramUseCase {
  return new ProgramUseCaseImpl(programRepository);
}
