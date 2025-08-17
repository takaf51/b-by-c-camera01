/**
 * Event Repository
 * イベント関連のAPI通信を抽象化
 */

import type { Event, EventDetail, EventListRequest, EventListResponse, EventError } from '../domain/event';
import { createHttpClient } from '../lib/http';

// =============================================================================
// Repository Interface
// =============================================================================

export interface EventRepository {
  /**
   * イベント一覧を取得
   */
  getEventList(request?: EventListRequest): Promise<EventListResponse>;
  
  /**
   * イベント詳細を取得
   */
  getEventDetail(id: number): Promise<EventDetail>;
}

// =============================================================================
// HTTP Implementation
// =============================================================================

export class HttpEventRepository implements EventRepository {
  private httpClient = createHttpClient();

  async getEventList(request: EventListRequest = {}): Promise<EventListResponse> {
    try {
      const params = new URLSearchParams();
      
      if (request.page) params.append('page', request.page.toString());
      if (request.limit) params.append('limit', request.limit.toString());
      if (request.status) params.append('status', request.status);
      
      const queryString = params.toString();
      const url = `/api/event/list${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.httpClient.get(url);

      return this.transformEventListResponse(response);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  async getEventDetail(id: number): Promise<EventDetail> {
    try {
      const response = await this.httpClient.get(`/api/event/detail/${id}`);

      return this.transformEventDetailResponse(response);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private transformEventListResponse(response: any): EventListResponse {
    return {
      events: response.events?.map((event: any) => this.transformEventResponse(event)) || [],
      totalCount: response.totalCount || 0,
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1,
    };
  }

  private transformEventResponse(event: any): Event {
    return {
      id: event.id,
      title: event.title || '',
      description: event.description || '',
      status: event.status || 'upcoming',
      startDate: event.startDate || event.start_date || '',
      endDate: event.endDate || event.end_date || '',
      maxParticipants: event.maxParticipants || event.max_participants,
      currentParticipants: event.currentParticipants || event.current_participants || 0,
      imageUrl: event.imageUrl || event.image_url,
      eventCode: event.eventCode || event.event_code || '',
    };
  }

  private transformEventDetailResponse(event: any): EventDetail {
    return {
      ...this.transformEventResponse(event),
      longDescription: event.longDescription || event.long_description,
      location: event.location,
      requirements: event.requirements || [],
      benefits: event.benefits || [],
      organizer: event.organizer ? {
        name: event.organizer.name || '',
        contact: event.organizer.contact,
      } : undefined,
      schedule: event.schedule?.map((item: any) => ({
        time: item.time || '',
        title: item.title || '',
        description: item.description,
      })) || [],
      images: event.images || [],
    };
  }

  private normalizeError(error: unknown): EventError {
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

export function createEventRepository(): EventRepository {
  return new HttpEventRepository();
}
