<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    reportStore,
    type CameraReportImage,
    type CameraFacePoints,
  } from '../../../stores/report';

  const dispatch = createEventDispatcher();

  // Props
  export let canvasElement: HTMLCanvasElement | undefined = undefined;
  export let programId: string = '';

  /**
   * キャンバスから画像をキャプチャしてBase64データを取得
   */
  export function captureImageFromCanvas(): string | null {
    if (!canvasElement) {
      return null;
    }

    try {
      // キャンバスの内容をBase64画像データとして取得
      const imageDataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
      return imageDataUrl;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store経由で画像を送信する関数
   * @param imageDataUrl - キャンバスから取得したbase64画像データ
   * @param kind - 'before' または 'after'
   * @param faceLandmarks - MediaPipeの顔座標データ
   */
  export async function sendImageToAPI(
    imageDataUrl: string,
    kind: 'before' | 'after',
    faceLandmarks: any = null
  ) {
    try {
      dispatch('uploadStart', { kind });

      // 顔の座標情報を抽出
      let points: CameraFacePoints | undefined = undefined;
      if (faceLandmarks) {
        const extractedPoints = extractFacePoints(faceLandmarks);
        points = extractedPoints || undefined;
      }

      // レポート画像データを作成
      const reportImage: CameraReportImage = {
        kind,
        imageData: imageDataUrl,
        points,
      };

      // Store経由でレポート送信
      await reportStore.submitReport(programId, reportImage);

      const message = `📸 ${kind === 'before' ? 'ビフォー' : 'アフター'}画像撮影・送信完了`;
      dispatch('uploadSuccess', { kind, message });
    } catch (error) {
      const message = `送信エラー: ${error instanceof Error ? error.message : 'unknown error'}`;
      dispatch('uploadError', { kind, message, error });
      throw error;
    }
  }

  /**
   * MediaPipeの顔座標からAPI用の座標情報を抽出
   * @param landmarks - MediaPipeの顔座標データ
   */
  function extractFacePoints(landmarks: any): CameraFacePoints | null {
    if (!canvasElement) {
      return null;
    }

    try {
      // MediaPipeの特定のランドマークポイントを使用
      const leftEye = landmarks[33]; // 左目
      const rightEye = landmarks[263]; // 右目
      const noseTip = landmarks[1]; // 鼻先

      // 画像座標に変換（0-1の正規化座標から実際のピクセル座標へ）
      const imageWidth = canvasElement.width;
      const imageHeight = canvasElement.height;

      return {
        leftEye: {
          x: Math.round(leftEye.x * imageWidth),
          y: Math.round(leftEye.y * imageHeight),
        },
        rightEye: {
          x: Math.round(rightEye.x * imageWidth),
          y: Math.round(rightEye.y * imageHeight),
        },
        noseTip: {
          x: Math.round(noseTip.x * imageWidth),
          y: Math.round(noseTip.y * imageHeight),
        },
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 撮影された画像を配列に追加
   * @param imageDataUrl - 撮影画像のbase64データ
   * @param capturedImages - 既存の撮影画像配列
   */
  export function addCapturedImage(
    imageDataUrl: string,
    capturedImages: string[]
  ): string[] {
    const newImages = [...capturedImages, imageDataUrl];
    dispatch('imageAdded', {
      imageDataUrl,
      totalCount: newImages.length,
    });
    return newImages;
  }

  /**
   * 撮影画像配列をクリア
   */
  export function clearCapturedImages(): string[] {
    dispatch('imagesCleared');
    return [];
  }
</script>

<!-- This component doesn't render anything directly -->
<!-- It only handles image capture and upload logic -->
