/**
 * Event UseCase
 * イベント関連のビジネスロジックを管理
 */

import type { 
  Event, 
  EventListRequest, 
  EventListResponse, 
  EventError 
} from '../domain/event';
import { validateEventListRequest } from '../domain/event';
import type { EventRepository } from '../repositories/EventRepository';

// =============================================================================
// UseCase Interface
// =============================================================================

export interface EventUseCase {
  /**
   * イベント一覧を取得（バリデーション付き）
   */
  getEventList(request?: EventListRequest): Promise<EventListResponse>;
  
  /**
   * イベント詳細を取得
   */
  getEventDetail(id: number): Promise<Event>;
}

// =============================================================================
// Implementation
// =============================================================================

export class EventUseCaseImpl implements EventUseCase {
  constructor(private eventRepository: EventRepository) {}

  async getEventList(request: EventListRequest = {}): Promise<EventListResponse> {
    // バリデーション
    const validationError = validateEventListRequest(request);
    if (validationError) {
      throw validationError;
    }

    // デフォルト値の設定
    const normalizedRequest: EventListRequest = {
      page: request.page || 1,
      limit: request.limit || 20,
      status: request.status,
    };

    try {
      const response = await this.eventRepository.getEventList(normalizedRequest);
      
      // ビジネスロジック: イベントの並び順を調整
      const sortedEvents = this.sortEventsByPriority(response.events);
      
      return {
        ...response,
        events: sortedEvents,
      };
    } catch (error) {
      throw this.handleRepositoryError(error);
    }
  }

  async getEventDetail(id: number): Promise<Event> {
    if (id <= 0) {
      throw {
        type: 'validation',
        message: 'Invalid event ID',
        field: 'id'
      } as EventError;
    }

    try {
      return await this.eventRepository.getEventDetail(id);
    } catch (error) {
      throw this.handleRepositoryError(error);
    }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * イベントを優先度順にソート
   * ビジネスルール: active > upcoming > completed > cancelled
   */
  private sortEventsByPriority(events: Event[]): Event[] {
    const priorityOrder = { active: 1, upcoming: 2, completed: 3, cancelled: 4 };
    
    return events.sort((a, b) => {
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
  private handleRepositoryError(error: unknown): EventError {
    if (this.isEventError(error)) {
      return error;
    }

    return {
      type: 'unknown',
      message: '予期しないエラーが発生しました'
    };
  }

  private isEventError(error: unknown): error is EventError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error
    );
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createEventUseCase(eventRepository: EventRepository): EventUseCase {
  return new EventUseCaseImpl(eventRepository);
}
