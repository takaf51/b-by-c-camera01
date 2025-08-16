/**
 * Event Store
 * イベント関連の状態管理
 */

import { writable, derived } from 'svelte/store';
import type { Event, EventListRequest, EventError } from '../domain/event';
import { createEventUseCase } from '../usecases/EventUseCase';
import { createEventRepository } from '../repositories/EventRepository';

// =============================================================================
// State Interface
// =============================================================================

interface EventState {
  events: Event[];
  isLoading: boolean;
  error: EventError | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: EventState = {
  events: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
};

// =============================================================================
// Store Creation
// =============================================================================

function createEventStore() {
  const { subscribe, set, update } = writable<EventState>(initialState);

  // Initialize dependencies
  const eventRepository = createEventRepository();
  const eventUseCase = createEventUseCase(eventRepository);

  return {
    subscribe,

    // ==========================================================================
    // Actions
    // ==========================================================================

    /**
     * イベント一覧を取得
     */
    async loadEventList(request?: EventListRequest) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const response = await eventUseCase.getEventList(request);
        
        update(state => ({
          ...state,
          events: response.events,
          currentPage: response.currentPage,
          totalPages: response.totalPages,
          totalCount: response.totalCount,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        const eventError = error as EventError;
        update(state => ({
          ...state,
          isLoading: false,
          error: eventError,
        }));
      }
    },

    /**
     * 次のページを読み込み
     */
    async loadNextPage() {
      const currentState = this.getCurrentState();
      if (currentState.currentPage >= currentState.totalPages || currentState.isLoading) {
        return;
      }

      await this.loadEventList({ page: currentState.currentPage + 1 });
    },

    /**
     * 前のページを読み込み
     */
    async loadPrevPage() {
      const currentState = this.getCurrentState();
      if (currentState.currentPage <= 1 || currentState.isLoading) {
        return;
      }

      await this.loadEventList({ page: currentState.currentPage - 1 });
    },

    /**
     * 特定のステータスでフィルタ
     */
    async filterByStatus(status?: Event['status']) {
      await this.loadEventList({ 
        page: 1,
        status 
      });
    },

    /**
     * エラーをクリア
     */
    clearError() {
      update(state => ({ ...state, error: null }));
    },

    /**
     * ストアをリセット
     */
    reset() {
      set(initialState);
    },

    // ==========================================================================
    // Helper Methods
    // ==========================================================================

    /**
     * 現在の状態を同期的に取得（内部使用）
     */
    getCurrentState(): EventState {
      let currentState: EventState = initialState;
      subscribe(state => { currentState = state; })();
      return currentState;
    }
  };
}

// =============================================================================
// Store Instance
// =============================================================================

export const eventStore = createEventStore();

// =============================================================================
// Derived Stores
// =============================================================================

/**
 * アクティブなイベントのみ
 */
export const activeEvents = derived(
  eventStore,
  $eventStore => $eventStore.events.filter(event => event.status === 'active')
);

/**
 * 今後開催予定のイベント
 */
export const upcomingEvents = derived(
  eventStore,
  $eventStore => $eventStore.events.filter(event => event.status === 'upcoming')
);

/**
 * 読み込み状態
 */
export const isEventsLoading = derived(
  eventStore,
  $eventStore => $eventStore.isLoading
);

/**
 * エラー状態
 */
export const eventsError = derived(
  eventStore,
  $eventStore => $eventStore.error
);

/**
 * ページネーション情報
 */
export const eventsPagination = derived(
  eventStore,
  $eventStore => ({
    currentPage: $eventStore.currentPage,
    totalPages: $eventStore.totalPages,
    totalCount: $eventStore.totalCount,
    hasNextPage: $eventStore.currentPage < $eventStore.totalPages,
    hasPrevPage: $eventStore.currentPage > 1,
  })
);
