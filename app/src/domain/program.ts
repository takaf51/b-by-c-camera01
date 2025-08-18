/**
 * Program Domain Types
 * プログラム関連のドメイン型とバリデーション
 */

// =============================================================================
// Base Types
// =============================================================================

export interface Program {
  id: number;
  title: string;
  description: string;
  status: ProgramStatus;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  maxParticipants?: number;
  currentParticipants: number;
  imageUrl?: string;
  programCode: string; // X-Program-Code header用
}

export interface ProgramDetail extends Program {
  longDescription?: string;
  location?: string;
  requirements?: string[];
  benefits?: string[];
  organizer?: {
    name: string;
    contact?: string;
  };
  schedule?: ProgramScheduleItem[];
  images?: string[];
}

export interface ProgramScheduleItem {
  time: string;
  title: string;
  description?: string;
}

export type ProgramStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface ProgramListRequest {
  page?: number;
  limit?: number;
  status?: ProgramStatus;
}

export interface ProgramListResponse {
  programs: Program[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

// =============================================================================
// Error Types
// =============================================================================

export interface ProgramError {
  type: 'validation' | 'network' | 'server' | 'unknown';
  message: string;
  field?: string;
}

// =============================================================================
// Validation Functions
// =============================================================================

export function isValidProgramStatus(status: string): status is ProgramStatus {
  return ['upcoming', 'active', 'completed', 'cancelled'].includes(status);
}

export function validateProgramListRequest(request: ProgramListRequest): ProgramError | null {
  if (request.page !== undefined && request.page < 1) {
    return {
      type: 'validation',
      message: 'Page must be greater than 0',
      field: 'page'
    };
  }

  if (request.limit !== undefined && (request.limit < 1 || request.limit > 100)) {
    return {
      type: 'validation',
      message: 'Limit must be between 1 and 100',
      field: 'limit'
    };
  }

  if (request.status && !isValidProgramStatus(request.status)) {
    return {
      type: 'validation',
      message: 'Invalid program status',
      field: 'status'
    };
  }

  return null;
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isProgramActive(program: Program): boolean {
  const now = new Date();
  const startDate = new Date(program.startDate);
  const endDate = new Date(program.endDate);
  
  return program.status === 'active' && now >= startDate && now <= endDate;
}

export function isProgramUpcoming(program: Program): boolean {
  const now = new Date();
  const startDate = new Date(program.startDate);
  
  return program.status === 'upcoming' && now < startDate;
}

export function canParticipateInProgram(program: Program): boolean {
  if (!isProgramActive(program) && !isProgramUpcoming(program)) {
    return false;
  }

  if (program.maxParticipants && program.currentParticipants >= program.maxParticipants) {
    return false;
  }

  return true;
}

export function getProgramStatusLabel(status: ProgramStatus): string {
  const labels: Record<ProgramStatus, string> = {
    upcoming: '開催予定',
    active: '開催中',
    completed: '終了',
    cancelled: 'キャンセル'
  };
  
  return labels[status];
}

// =============================================================================
// Program Detail Utility Functions
// =============================================================================

export function formatProgramDateTime(program: Program): {
  dateRange: string;
  timeRange: string;
  duration: string;
} {
  const startDate = new Date(program.startDate);
  const endDate = new Date(program.endDate);
  
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  
  const dateRange = isSameDay
    ? startDate.toLocaleDateString('ja-JP', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      })
    : `${startDate.toLocaleDateString('ja-JP', { 
        month: 'long', 
        day: 'numeric'
      })} - ${endDate.toLocaleDateString('ja-JP', { 
        month: 'long', 
        day: 'numeric' 
      })}`;
  
  const timeRange = `${startDate.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })} - ${endDate.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`;
  
  const durationMs = endDate.getTime() - startDate.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  const duration = hours > 0 
    ? `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`
    : `${minutes}分`;
  
  return { dateRange, timeRange, duration };
}

export function getParticipationRate(program: Program): number {
  if (!program.maxParticipants) return 0;
  return Math.round((program.currentParticipants / program.maxParticipants) * 100);
}

export function getRemainingSlots(program: Program): number | null {
  if (!program.maxParticipants) return null;
  return Math.max(0, program.maxParticipants - program.currentParticipants);
}
