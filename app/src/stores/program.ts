/**
 * Program Store
 * プログラム関連の状態管理
 */

import { writable, derived } from 'svelte/store';
import type { Program, ProgramDetail, ProgramListRequest, ProgramError } from '../domain/program';
import { createProgramUseCase } from '../usecases/ProgramUseCase';
import { createProgramRepository } from '../repositories/ProgramRepository';

// =============================================================================
// Store Types (コンポーネント層用)
// =============================================================================

export interface StoreProgram {
  id: number;
  title: string;
  description: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  maxParticipants?: number;
  currentParticipants: number;
  imageUrl?: string;
  programCode: string;
}

export interface StoreProgramDetail extends StoreProgram {
  longDescription?: string;
  location?: string;
  requirements?: string[];
  benefits?: string[];
  organizer?: {
    name: string;
    contact?: string;
  };
  schedule?: {
    time: string;
    title: string;
    description?: string;
  }[];
  images?: string[];
}

// =============================================================================
// State Interface
// =============================================================================

interface ProgramState {
  programs: StoreProgram[];
  isLoading: boolean;
  error: ProgramError | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

interface ProgramDetailState {
  programDetail: StoreProgramDetail | null;
  isLoading: boolean;
  error: ProgramError | null;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: ProgramState = {
  programs: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
};

const initialDetailState: ProgramDetailState = {
  programDetail: null,
  isLoading: false,
  error: null,
};

// =============================================================================
// Helper Functions
// =============================================================================

function convertToStoreProgram(domainProgram: Program): StoreProgram {
  return {
    id: domainProgram.id,
    title: domainProgram.title,
    description: domainProgram.description,
    status: domainProgram.status,
    startDate: domainProgram.startDate,
    endDate: domainProgram.endDate,
    maxParticipants: domainProgram.maxParticipants,
    currentParticipants: domainProgram.currentParticipants,
    imageUrl: domainProgram.imageUrl,
    programCode: domainProgram.programCode,
  };
}

function convertToStoreProgramDetail(domainProgramDetail: ProgramDetail): StoreProgramDetail {
  return {
    ...convertToStoreProgram(domainProgramDetail),
    longDescription: domainProgramDetail.longDescription,
    location: domainProgramDetail.location,
    requirements: domainProgramDetail.requirements,
    benefits: domainProgramDetail.benefits,
    organizer: domainProgramDetail.organizer,
    schedule: domainProgramDetail.schedule,
    images: domainProgramDetail.images,
  };
}

// =============================================================================
// Store Creation
// =============================================================================

function createProgramStore() {
  const { subscribe, set, update } = writable<ProgramState>(initialState);

  // UseCase インスタンス
  const repository = createProgramRepository();
  const useCase = createProgramUseCase(repository);

  return {
    subscribe,
    
    /**
     * プログラム一覧を取得
     */
    async loadPrograms(request?: ProgramListRequest) {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        const response = await useCase.getProgramList(request);
        
        update(state => ({
          ...state,
          programs: response.programs.map(convertToStoreProgram),
          currentPage: response.currentPage,
          totalPages: response.totalPages,
          totalCount: response.totalCount,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error as ProgramError,
        }));
      }
    },

    /**
     * プログラム一覧をリセット
     */
    reset() {
      set(initialState);
    },

    /**
     * エラーをクリア
     */
    clearError() {
      update(state => ({ ...state, error: null }));
    },
  };
}

function createProgramDetailStore() {
  const { subscribe, set, update } = writable<ProgramDetailState>(initialDetailState);

  // UseCase インスタンス
  const repository = createProgramRepository();
  const useCase = createProgramUseCase(repository);

  return {
    subscribe,
    
    /**
     * プログラム詳細を取得
     */
    async loadProgramDetail(id: number) {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        const programDetail = await useCase.getProgramDetail(id);
        
        update(state => ({
          ...state,
          programDetail: convertToStoreProgramDetail(programDetail),
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error as ProgramError,
        }));
      }
    },

    /**
     * プログラム詳細をリセット
     */
    reset() {
      set(initialDetailState);
    },

    /**
     * エラーをクリア
     */
    clearError() {
      update(state => ({ ...state, error: null }));
    },
  };
}

// =============================================================================
// Store Instances
// =============================================================================

export const programStore = createProgramStore();
export const programDetailStore = createProgramDetailStore();

// =============================================================================
// Derived Stores
// =============================================================================

export const programs = derived(programStore, $store => $store.programs);
export const isProgramLoading = derived(programStore, $store => $store.isLoading);
export const programError = derived(programStore, $store => $store.error);
export const programPagination = derived(programStore, $store => ({
  currentPage: $store.currentPage,
  totalPages: $store.totalPages,
  totalCount: $store.totalCount,
}));

export const isProgramDetailLoading = derived(programDetailStore, $store => $store.isLoading);
export const programDetailError = derived(programDetailStore, $store => $store.error);
export const currentProgramDetail = derived(programDetailStore, $store => $store.programDetail);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * プログラム一覧を初期化（ページロード時用）
 */
export async function initializePrograms() {
  try {
    await programStore.loadPrograms();
  } catch (error) {
    console.error('Failed to initialize programs:', error);
  }
}

/**
 * 特定のプログラムを検索
 */
export function findProgramById(programs: Program[], id: number): Program | undefined {
  return programs.find(program => program.id === id);
}

/**
 * アクティブなプログラムのみをフィルタリング
 */
export function getActivePrograms(programs: Program[]): Program[] {
  return programs.filter(program => program.status === 'active');
}

/**
 * 参加可能なプログラムのみをフィルタリング
 */
export function getAvailablePrograms(programs: Program[]): Program[] {
  const now = new Date();
  return programs.filter(program => {
    const startDate = new Date(program.startDate);
    const endDate = new Date(program.endDate);
    
    // 期間内 かつ 定員に空きがある
    return (
      (program.status === 'active' || program.status === 'upcoming') &&
      now >= startDate &&
      now <= endDate &&
      (!program.maxParticipants || program.currentParticipants < program.maxParticipants)
    );
  });
}
