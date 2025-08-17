/**
 * Event Domain Types
 * イベント関連のドメイン型とバリデーション
 */

// =============================================================================
// Base Types
// =============================================================================

export interface Event {
  id: number;
  title: string;
  description: string;
  status: EventStatus;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  maxParticipants?: number;
  currentParticipants: number;
  imageUrl?: string;
  eventCode: string; // X-Event-Code header用
}

export interface EventDetail extends Event {
  longDescription?: string;
  location?: string;
  requirements?: string[];
  benefits?: string[];
  organizer?: {
    name: string;
    contact?: string;
  };
  schedule?: EventScheduleItem[];
  images?: string[];
}

export interface EventScheduleItem {
  time: string;
  title: string;
  description?: string;
}

export type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface EventListRequest {
  page?: number;
  limit?: number;
  status?: EventStatus;
}

export interface EventListResponse {
  events: Event[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

// =============================================================================
// Error Types
// =============================================================================

export interface EventError {
  type: 'validation' | 'network' | 'server' | 'unknown';
  message: string;
  field?: string;
}

// =============================================================================
// Validation Functions
// =============================================================================

export function isValidEventStatus(status: string): status is EventStatus {
  return ['upcoming', 'active', 'completed', 'cancelled'].includes(status);
}

export function validateEventListRequest(request: EventListRequest): EventError | null {
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

  if (request.status && !isValidEventStatus(request.status)) {
    return {
      type: 'validation',
      message: 'Invalid event status',
      field: 'status'
    };
  }

  return null;
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isEventActive(event: Event): boolean {
  const now = new Date();
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  
  return event.status === 'active' && now >= startDate && now <= endDate;
}

export function isEventUpcoming(event: Event): boolean {
  const now = new Date();
  const startDate = new Date(event.startDate);
  
  return event.status === 'upcoming' && now < startDate;
}

export function canParticipateInEvent(event: Event): boolean {
  if (!isEventActive(event) && !isEventUpcoming(event)) {
    return false;
  }

  if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
    return false;
  }

  return true;
}

export function getEventStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    upcoming: '開催予定',
    active: '開催中',
    completed: '終了',
    cancelled: 'キャンセル'
  };
  
  return labels[status];
}

// =============================================================================
// Event Detail Utility Functions
// =============================================================================

export function formatEventDateTime(event: Event): {
  dateRange: string;
  timeRange: string;
  duration: string;
} {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  
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

export function getParticipationRate(event: Event): number {
  if (!event.maxParticipants) return 0;
  return Math.round((event.currentParticipants / event.maxParticipants) * 100);
}

export function getRemainingSlots(event: Event): number | null {
  if (!event.maxParticipants) return null;
  return Math.max(0, event.maxParticipants - event.currentParticipants);
}
