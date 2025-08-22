/**
 * Report Domain Types
 * レポート関連のドメイン型とバリデーション
 */

// =============================================================================
// Base Types
// =============================================================================

export interface ReportImage {
  kind: 'before' | 'after';
  imageData: string; // base64 data URL
  points?: FacePoints;
}

export interface FacePoints {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseTip: { x: number; y: number };
}

export interface ReportCreateRequest {
  programId: string;
  image: ReportImage;
  reportId?: number; // 更新の場合
}

export interface ReportCreateResponse {
  report_id: number;
  message: string;
}

export interface ReportError extends Error {
  code: string;
  status?: number;
}

// =============================================================================
// Validation
// =============================================================================

export function validateReportImage(image: ReportImage): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!image.imageData) {
    errors.push('画像データが必要です');
  }

  if (!image.kind || !['before', 'after'].includes(image.kind)) {
    errors.push('画像の種類（before/after）が必要です');
  }

  // base64形式のチェック
  if (image.imageData && !image.imageData.startsWith('data:image/')) {
    errors.push('無効な画像形式です');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFacePoints(points: FacePoints): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const requiredPoints = ['leftEye', 'rightEye', 'noseTip'];

  for (const pointName of requiredPoints) {
    const point = points[pointName as keyof FacePoints];
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
      errors.push(`${pointName}の座標が無効です`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
