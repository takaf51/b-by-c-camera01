/**
 * MediaPipe Configuration
 * MediaPipeのCDN URLなどの設定を一元管理
 */

// MediaPipeのCDN Base URL
// 変更する場合はここだけを修正すればOK

// CloudFrontを使用（開発環境はプロキシ経由でCORS回避）
export const MEDIAPIPE_CDN_BASE_URL = import.meta.env.DEV 
  ? '/cloudfront-proxy'  // 開発環境: プロキシ経由
  : 'https://d2a697hridziqi.cloudfront.net/assets/mediapipe';  // 本番環境: CloudFront直接
/**
 * MediaPipeファイルのCDN URLを取得
 */
export function getMediaPipeCdnUrl(filename: string): string {
  return `${MEDIAPIPE_CDN_BASE_URL}/${filename}`;
}

/**
 * CDN URLかどうかを判定
 */
export function isMediaPipeCdnUrl(url: string): boolean {
  return url.includes('cdn.jsdelivr.net/npm/@mediapipe/') || 
         url.includes('d2a697hridziqi.cloudfront.net/assets/mediapipe');
}
