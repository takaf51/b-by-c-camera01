/**
 * Before参照情報取得API
 * After撮影時にBefore情報をサーバーから取得するためのAPI呼び出し
 */

import type { ReferenceData } from './PoseReference';
import type { HttpClient } from './http';

export interface BeforeInfoResponse {
  success: boolean;
  data?: {
    pose: {
      roll: number;
      pitch: number;
      yaw: number;
    };
    image: string; // base64 encoded image
    landmarks: any[] | null;
    timestamp: string; // ISO date string
    correctionResult?: any;
  };
  error?: string;
}

// 実際のAPI形式
export interface ActualAPIResponse {
  points: string; // 実際のレスポンス形式
}

/**
 * 新しいAPI仕様でBefore情報を取得（HttpClient使用版）
 */
export async function fetchBeforePointsWithHttpClient(
  planCode: string,
  httpClient: HttpClient
): Promise<ReferenceData | null> {
  try {
    const result: ActualAPIResponse = await httpClient.get('/plan/report/getPoints', {
      headers: {
        'X-Plan-Code': planCode,
      },
    });

    if (!result.points) {
      return null;
    }

    // points文字列をパースしてReferenceDataに変換
    const parsedData = parsePointsString(result.points);
    return parsedData;

  } catch (error) {
    return null;
  }
}

/**
 * 新しいAPI仕様でBefore情報を取得（旧fetch版 - 互換性のため）
 */
export async function fetchBeforePoints(
  planCode: string,
  apiEndpoint?: string
): Promise<ReferenceData | null> {
  try {
    // APIエンドポイントの決定（環境変数を優先）
    const endpoint = apiEndpoint || 
      (window as any).CameraSettings?.API_ENDPOINT || 
      import.meta.env.VITE_API_BASE_URL || 
      '';

    const url = `${endpoint}/plan/report/getPoints`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Plan-Code': planCode,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ActualAPIResponse = await response.json();
    
    if (!result.points) {
      return null;
    }

    // points文字列をパースしてReferenceDataに変換
    const parsedData = parsePointsString(result.points);
    return parsedData;

  } catch (error) {
    return null;
  }
}

/**
 * points文字列をパースしてReferenceDataに変換
 * 実際の形式に応じて実装を調整する必要があります
 */
function parsePointsString(pointsString: string): ReferenceData | null {
  try {
    // パターン1: JSON文字列の場合
    try {
      const jsonData = JSON.parse(pointsString);
      if (jsonData.pose && jsonData.image) {
        return {
          pose: jsonData.pose,
          image: jsonData.image,
          landmarks: jsonData.landmarks || null,
          timestamp: jsonData.timestamp ? new Date(jsonData.timestamp) : new Date(),
          correctionResult: jsonData.correctionResult
        };
      }
    } catch (jsonError) {
      // 次のパターンを試行
    }

    // パターン2: Base64エンコードされたJSON
    try {
      const decodedString = atob(pointsString);
      const jsonData = JSON.parse(decodedString);
      if (jsonData.pose && jsonData.image) {
        return {
          pose: jsonData.pose,
          image: jsonData.image,
          landmarks: jsonData.landmarks || null,
          timestamp: jsonData.timestamp ? new Date(jsonData.timestamp) : new Date(),
          correctionResult: jsonData.correctionResult
        };
      }
    } catch (base64Error) {
      // 次のパターンを試行
    }

    // パターン3: 送信データと同じ形式のJSON文字列（最も可能性が高い）
    try {
      // 直接JSON.parseを再試行（エラーハンドリングを分けるため）
      const data = JSON.parse(pointsString);
      
      // Before撮影時の送信形式に基づく変換
      if (data.pose && (data.pose.roll !== undefined || data.pose.pitch !== undefined || data.pose.yaw !== undefined)) {
        return {
          pose: {
            roll: data.pose.roll || 0,
            pitch: data.pose.pitch || 0,
            yaw: data.pose.yaw || 0
          },
          image: data.image || '',
          landmarks: data.landmarks || null,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          correctionResult: data.correctionResult
        };
      }
    } catch (directJsonError) {
      // 最後のパターンへ
    }

    // パターン4: カスタム区切り形式
    // TODO: 実際のpoints文字列の形式が判明したら実装
    return null;

  } catch (error) {
    return null;
  }
}

/**
 * planReportIdに基づいてBefore情報を取得（旧API - 互換性のため残す）
 */
export async function fetchBeforeInfo(
  planReportId: string | number,
  apiEndpoint?: string,
  apiToken?: string
): Promise<ReferenceData | null> {
  try {
    // APIエンドポイントの決定（環境変数を優先）
    const endpoint = apiEndpoint || 
      (window as any).CameraSettings?.API_ENDPOINT || 
      import.meta.env.VITE_API_BASE_URL || 
      '';
    
    // APIトークンの決定
    const token = apiToken || 
      (window as any).CameraSettings?.API_TOKEN || 
      'development-test-token';

    const url = `${endpoint}/api/plan-reports/${planReportId}/before-reference`;
    


    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // 404の場合はBefore撮影がまだ完了していない
      if (response.status === 404) {
        return null;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: BeforeInfoResponse = await response.json();
    
    if (!result.success || !result.data) {
      return null;
    }

    // API形式からReferenceData形式に変換
    return {
      pose: result.data.pose,
      image: result.data.image,
      landmarks: result.data.landmarks,
      timestamp: new Date(result.data.timestamp),
      correctionResult: result.data.correctionResult
    };

  } catch (error) {
    // ネットワークエラーやその他のエラーの場合はnullを返す
    // After撮影は可能だが、参照なしでの撮影になる
    return null;
  }
}

/**
 * Before情報の保存（Before撮影完了時に呼び出される想定）
 */
export async function saveBeforeInfo(
  planReportId: string | number,
  beforeData: {
    pose: { roll: number; pitch: number; yaw: number };
    image: string;
    landmarks: any[] | null;
    correctionResult?: any;
  },
  apiEndpoint?: string,
  apiToken?: string
): Promise<boolean> {
  try {
    // APIエンドポイントの決定（環境変数を優先）
    const endpoint = apiEndpoint || 
      (window as any).CameraSettings?.API_ENDPOINT || 
      import.meta.env.VITE_API_BASE_URL || 
      '';
    
    const token = apiToken || 
      (window as any).CameraSettings?.API_TOKEN || 
      'development-test-token';

    const url = `${endpoint}/api/plan-reports/${planReportId}/before-reference`;
    
    const requestBody = {
      pose: beforeData.pose,
      image: beforeData.image,
      landmarks: beforeData.landmarks,
      correctionResult: beforeData.correctionResult,
      timestamp: new Date().toISOString()
    };



    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return true;
    } else {
      return false;
    }

  } catch (error) {
    return false;
  }
}


