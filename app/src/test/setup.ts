/**
 * Vitest テストセットアップファイル
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// MediaPipe関連のグローバルモック
(globalThis as any).MediaStream = class MockMediaStream {
  getTracks() {
    return [{ stop: vi.fn() }];
  }
} as any;

// Navigator APIのモック
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue(new (globalThis as any).MediaStream()),
  },
});

// Canvas APIのモック
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
});

HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue(
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8H'
);

// Video要素のモック
Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  get: () => 640,
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  get: () => 480,
});

Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
  get: () => 4, // HAVE_ENOUGH_DATA
});

// Image要素のモック
(globalThis as any).Image = class MockImage {
  width = 640;
  height = 480;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  set src(value: string) {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

// Console output suppression for cleaner test output
const originalConsole = console;
(globalThis as any).console = {
  ...originalConsole,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
