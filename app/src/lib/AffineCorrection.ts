/**
 * 2Dアフィン変換による姿勢補正クラス
 * affine_convert.html の AffineCorrection クラスを Svelte/TypeScript 用に移植
 */

export interface CorrectionParams {
  scaleX: number;
  skewX: number;
  skewY: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  centerX: number;
  centerY: number;
  rollCorrection: number;
  pitchCorrection: number;
  yawCorrection: number;
}

export interface PoseData {
  roll: number;
  pitch: number;
  yaw: number;
}

export interface CorrectionResult {
  correctedImageUrl: string;
  correctionInfo: CorrectionParams;
  originalPose: PoseData;
  estimatedCorrectedPose: PoseData;
}

export class AffineCorrection {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
  }

  /**
   * 姿勢データに基づいて画像を補正
   * @param imageDataUrl - 元画像のデータURL
   * @param pose - 姿勢データ {roll, pitch, yaw}
   * @param landmarks - 顔のランドマーク（468点）
   * @returns {Promise<CorrectionResult>} - 補正結果
   */
  async correctImage(
    imageDataUrl: string,
    pose: PoseData,
    landmarks?: any[]
  ): Promise<CorrectionResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // キャンバスサイズを画像に合わせる
          this.canvas.width = img.width;
          this.canvas.height = img.height;

          // 補正パラメータの計算
          const correctionParams = this.calculateCorrectionParams(
            pose,
            landmarks,
            img.width,
            img.height
          );

          // アフィン変換の適用
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.setTransform(
            correctionParams.scaleX,
            correctionParams.skewX,
            correctionParams.skewY,
            correctionParams.scaleY,
            correctionParams.translateX,
            correctionParams.translateY
          );

          // 画像を描画
          this.ctx.drawImage(img, 0, 0);

          // 結果の取得
          const correctedImageUrl = this.canvas.toDataURL('image/jpeg', 0.95);

          resolve({
            correctedImageUrl,
            correctionInfo: correctionParams,
            originalPose: pose,
            estimatedCorrectedPose: this.estimateCorrectedPose(pose, correctionParams),
          });
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }

  /**
   * 補正パラメータの計算
   */
  private calculateCorrectionParams(
    pose: PoseData,
    landmarks: any[] | undefined,
    width: number,
    height: number
  ): CorrectionParams {
    // 鼻の位置を基準点とする
    const nose = landmarks && landmarks[1] ? landmarks[1] : null;
    const centerX = nose ? nose.x * width : width / 2;
    const centerY = nose ? nose.y * height : height / 2;

    // 回転角度の計算（度をラジアンに変換）
    const rollRad = (-pose.roll * Math.PI) / 180;
    const pitchRad = (-pose.pitch * Math.PI) / 180;
    const yawRad = (-pose.yaw * Math.PI) / 180;

    // ロール回転の補正（Z軸回転）
    const cosRoll = Math.cos(rollRad);
    const sinRoll = Math.sin(rollRad);

    // ピッチ補正（Y軸のスケーリング効果として近似）
    const pitchScale = Math.cos(pitchRad);

    // ヨー補正（X軸のスケーリングと歪みとして近似）
    const yawScale = Math.cos(yawRad);
    const yawSkew = Math.sin(yawRad) * 0.3; // 歪み係数

    // アフィン変換行列の要素
    const scaleX = cosRoll * yawScale;
    const skewX = -sinRoll;
    const skewY = sinRoll * pitchScale + yawSkew;
    const scaleY = cosRoll * pitchScale;

    // 変換後の中心が元の中心位置になるよう平行移動を調整
    const translateX = centerX - (centerX * scaleX + centerY * skewY);
    const translateY = centerY - (centerX * skewX + centerY * scaleY);

    return {
      scaleX,
      skewX,
      skewY,
      scaleY,
      translateX,
      translateY,
      centerX,
      centerY,
      rollCorrection: pose.roll,
      pitchCorrection: pose.pitch,
      yawCorrection: pose.yaw,
    };
  }

  /**
   * 補正後の推定姿勢を計算
   */
  private estimateCorrectedPose(originalPose: PoseData, correctionParams: CorrectionParams): PoseData {
    // 補正により姿勢角度がどの程度改善されたかを推定
    const rollImprovement = Math.min(Math.abs(originalPose.roll) * 0.8, Math.abs(originalPose.roll));
    const pitchImprovement = Math.min(Math.abs(originalPose.pitch) * 0.6, Math.abs(originalPose.pitch));
    const yawImprovement = Math.min(Math.abs(originalPose.yaw) * 0.7, Math.abs(originalPose.yaw));

    return {
      roll: originalPose.roll > 0 ? originalPose.roll - rollImprovement : originalPose.roll + rollImprovement,
      pitch: originalPose.pitch > 0 ? originalPose.pitch - pitchImprovement : originalPose.pitch + pitchImprovement,
      yaw: originalPose.yaw > 0 ? originalPose.yaw - yawImprovement : originalPose.yaw + yawImprovement,
    };
  }
}
