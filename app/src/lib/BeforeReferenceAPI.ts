/**
 * Before参照情報取得API
 * After撮影時にBefore情報をサーバーから取得するためのAPI呼び出し
 */

import type { ReferenceData } from './PoseReference';

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
 * 新しいAPI仕様でBefore情報を取得
 */
export async function fetchBeforePoints(
  planCode: string,
  apiEndpoint?: string
): Promise<ReferenceData | null> {
  try {
    // APIエンドポイントの決定
    const endpoint = apiEndpoint || 
      (window as any).CameraSettings?.API_ENDPOINT || 
      'https://dev-api.face-matrix.com';

    const url = `${endpoint}/plan/report/getPoints`;
    
    console.log('📡 Before Points取得API呼び出し:', {
      url,
      planCode,
      endpoint
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Plan-Code': planCode,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Before Points取得失敗: ${response.status} ${response.statusText}`);
      
      if (response.status === 404) {
        console.log('📝 Before撮影が未完了または見つかりません');
        return null;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ActualAPIResponse = await response.json();
    
    if (!result.points) {
      console.warn('⚠️ Points データが空です:', result);
      return null;
    }

    console.log('✅ Before Points取得成功:', {
      pointsLength: result.points.length,
      pointsPreview: result.points.substring(0, 100) + '...'
    });

    // points文字列をパースしてReferenceDataに変換
    const parsedData = parsePointsString(result.points);
    return parsedData;

  } catch (error) {
    console.error('❌ Before Points取得エラー:', error);
    return null;
  }
}

/**
 * points文字列をパースしてReferenceDataに変換
 * 実際の形式に応じて実装を調整する必要があります
 */
function parsePointsString(pointsString: string): ReferenceData | null {
  try {
    console.log('🔍 Points文字列をパース中:', {
      length: pointsString.length,
      preview: pointsString.substring(0, 200)
    });

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
      console.log('📝 JSON形式ではありません、他の形式を試行');
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
      console.log('📝 Base64 JSON形式でもありません');
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
      console.log('📝 直接JSON形式でもありません');
    }

    // パターン4: カスタム区切り形式
    // TODO: 実際のpoints文字列の形式が判明したら実装
    console.warn('⚠️ 未対応のpoints形式です:', pointsString.substring(0, 100));
    return null;

  } catch (error) {
    console.error('❌ Points文字列パースエラー:', error);
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
    // APIエンドポイントの決定（優先順位: 引数 > window設定 > デフォルト）
    const endpoint = apiEndpoint || 
      (window as any).CameraSettings?.API_ENDPOINT || 
      'https://dev-api.face-matrix.com';
    
    // APIトークンの決定
    const token = apiToken || 
      (window as any).CameraSettings?.API_TOKEN || 
      'development-test-token';

    const url = `${endpoint}/api/plan-reports/${planReportId}/before-reference`;
    
    console.log('📡 Before情報取得API呼び出し:', {
      url,
      planReportId,
      endpoint
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Before情報取得失敗: ${response.status} ${response.statusText}`);
      
      // 404の場合はBefore撮影がまだ完了していない
      if (response.status === 404) {
        console.log('📝 Before撮影が未完了または見つかりません');
        return null;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: BeforeInfoResponse = await response.json();
    
    if (!result.success || !result.data) {
      console.warn('⚠️ Before情報取得レスポンスが無効:', result);
      return null;
    }

    console.log('✅ Before情報取得成功:', {
      timestamp: result.data.timestamp,
      hasPose: !!result.data.pose,
      hasImage: !!result.data.image,
      hasLandmarks: !!result.data.landmarks
    });

    // API形式からReferenceData形式に変換
    return {
      pose: result.data.pose,
      image: result.data.image,
      landmarks: result.data.landmarks,
      timestamp: new Date(result.data.timestamp),
      correctionResult: result.data.correctionResult
    };

  } catch (error) {
    console.error('❌ Before情報取得エラー:', error);
    
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
    const endpoint = apiEndpoint || 
      (window as any).CameraSettings?.API_ENDPOINT || 
      'https://dev-api.face-matrix.com';
    
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

    console.log('💾 Before情報保存API呼び出し:', {
      url,
      planReportId,
      requestBody: {
        pose: beforeData.pose,
        poseType: typeof beforeData.pose,
        poseKeys: beforeData.pose ? Object.keys(beforeData.pose) : null,
        hasImage: !!beforeData.image,
        imageLength: beforeData.image?.length || 0,
        landmarksCount: beforeData.landmarks?.length || 0,
        hasCorrectionResult: !!beforeData.correctionResult,
        timestamp: requestBody.timestamp
      }
    });

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
      console.log('✅ Before情報保存成功');
      return true;
    } else {
      console.warn('⚠️ Before情報保存失敗:', result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Before情報保存エラー:', error);
    return false;
  }
}

/**
 * デバッグ用: APIレスポンスの形式を確認
 */
export async function debugGetPoints(
  planCode: string = '2025-07-29-trial',
  apiEndpoint?: string
): Promise<void> {
  try {
    const endpoint = apiEndpoint || 
      (window as any).CameraSettings?.API_ENDPOINT || 
      'https://dev-api.face-matrix.com';

    const url = `${endpoint}/plan/report/getPoints`;
    
    console.log('🐛 DEBUG: API呼び出し開始:', {
      url,
      planCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Plan-Code': planCode,
        'Accept': 'application/json',
      }
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Plan-Code': planCode,
        'Accept': 'application/json',
      },
    });

    console.log('🐛 DEBUG: レスポンス情報:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🐛 DEBUG: エラーレスポンス:', errorText);
      return;
    }

    const result = await response.json();
    
    console.log('🐛 DEBUG: レスポンスデータ:', {
      fullResponse: result,
      pointsType: typeof result.points,
      pointsLength: result.points?.length,
      pointsPreview: result.points?.substring(0, 200),
      isValidJSON: (() => {
        try {
          JSON.parse(result.points);
          return true;
        } catch {
          return false;
        }
      })(),
      isBase64: (() => {
        try {
          atob(result.points);
          return true;
        } catch {
          return false;
        }
      })()
    });

    // パース試行
    const parsedData = parsePointsString(result.points);
    console.log('🐛 DEBUG: パース結果:', parsedData);

  } catch (error) {
    console.error('🐛 DEBUG: エラー:', error);
  }
}

// デバッグ用にwindowオブジェクトに関数を追加
if (typeof window !== 'undefined') {
  (window as any).debugGetPoints = debugGetPoints;
}
