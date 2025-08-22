/**
 * Report Repository
 * レポート関連のデータアクセス層
 */

import type { HttpClient } from '../lib/http';
import type {
  ReportCreateRequest,
  ReportCreateResponse,
  ReportError,
} from '../domain/report';

// =============================================================================
// Repository Interface
// =============================================================================

export interface ReportRepository {
  /**
   * レポート画像を送信
   */
  createReport(request: ReportCreateRequest): Promise<ReportCreateResponse>;
}

// =============================================================================
// HTTP Implementation
// =============================================================================

export class HttpReportRepository implements ReportRepository {
  constructor(private httpClient: HttpClient) {}

  async createReport(
    request: ReportCreateRequest
  ): Promise<ReportCreateResponse> {
    try {
      // Base64データをBlobに変換
      const response = await fetch(request.image.imageData);
      const blob = await response.blob();

      // FormDataを作成
      const formData = new FormData();
      formData.append('kind', request.image.kind);
      formData.append('image', blob, `${request.image.kind}_${Date.now()}.jpg`);

      // report_idがある場合は追加（更新の場合）
      if (request.reportId) {
        formData.append('report_id', request.reportId.toString());
      }

      // 顔の座標情報を追加（利用可能な場合）
      if (request.image.points) {
        formData.append('points', JSON.stringify(request.image.points));
      }

      // HTTPクライアント経由でAPI呼び出し
      const result = await this.httpClient.post<ReportCreateResponse>(
        '/api/plan/report/send',
        formData,
        {
          headers: {
            // FormDataの場合、Content-Typeは自動設定される
          },
        }
      );

      return result;
    } catch (error) {
      const reportError: ReportError = new Error(
        error instanceof Error ? error.message : 'レポート送信に失敗しました'
      ) as ReportError;
      reportError.code = 'REPORT_SEND_FAILED';
      reportError.status =
        error instanceof Error && 'status' in error
          ? (error as any).status
          : undefined;
      throw reportError;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createReportRepository(
  httpClient: HttpClient
): ReportRepository {
  return new HttpReportRepository(httpClient);
}
