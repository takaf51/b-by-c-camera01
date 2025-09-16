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
  points?: UnifiedCaptureData;
}

// キーポイント座標（位置合わせ用）
export interface KeyPoints {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseTip: { x: number; y: number };
}

// Before/After共通のデータ構造（README.md仕様に準拠）
export interface UnifiedCaptureData {
  pose: { 
    roll: number; 
    pitch: number; 
    yaw: number; 
    distance?: number; 
    quality?: number; 
    faceSize?: number; 
  };
  landmarks: Array<{x: number; y: number; z?: number}>; // 468個の座標点
  keyPoints: KeyPoints; // 主要3点の座標
}

// 後方互換性のため既存型を維持
export interface FacePoints {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseTip: { x: number; y: number };
}

export interface BeforeCaptureData {
  pose: { 
    roll: number; 
    pitch: number; 
    yaw: number; 
    distance?: number; 
    quality?: number; 
    faceSize?: number; 
  };
  landmarks: Array<{x: number; y: number; z?: number}>; // 468個の座標点
}

export interface ReportCreateRequest {
  programId: string;
  image: ReportImage;
  reportId?: number; // 更新の場合
}

export interface ReportCreateResponse {
  report_id: number;
  kind: 'before' | 'after';
  new_subscription: boolean;
  last_image_uploaded: boolean;
  score_fix_immediately: boolean;
  day: number;
  return_base_url: string;
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

export function validateUnifiedCaptureData(data: UnifiedCaptureData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // pose validation
  if (!data.pose) {
    errors.push('pose データが必要です');
  } else {
    if (typeof data.pose.roll !== 'number') errors.push('pose.roll が無効です');
    if (typeof data.pose.pitch !== 'number') errors.push('pose.pitch が無効です');
    if (typeof data.pose.yaw !== 'number') errors.push('pose.yaw が無効です');
  }

  // landmarks validation
  if (!Array.isArray(data.landmarks)) {
    errors.push('landmarks は配列である必要があります');
  } else if (data.landmarks.length === 0) {
    errors.push('landmarks データが空です');
  }

  // keyPoints validation
  if (!data.keyPoints) {
    errors.push('keyPoints データが必要です');
  } else {
    const requiredPoints = ['leftEye', 'rightEye', 'noseTip'];
    for (const pointName of requiredPoints) {
      const point = data.keyPoints[pointName as keyof KeyPoints];
      if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
        errors.push(`keyPoints.${pointName}の座標が無効です`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateBeforeCaptureData(data: BeforeCaptureData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // pose validation
  if (!data.pose) {
    errors.push('pose データが必要です');
  } else {
    if (typeof data.pose.roll !== 'number') errors.push('pose.roll が無効です');
    if (typeof data.pose.pitch !== 'number') errors.push('pose.pitch が無効です');
    if (typeof data.pose.yaw !== 'number') errors.push('pose.yaw が無効です');
  }

  // landmarks validation
  if (!Array.isArray(data.landmarks)) {
    errors.push('landmarks は配列である必要があります');
  } else if (data.landmarks.length === 0) {
    errors.push('landmarks データが空です');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
