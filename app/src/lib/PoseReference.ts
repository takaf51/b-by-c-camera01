/**
 * PoseReference - Before姿勢の保存と管理
 * After撮影時にBefore情報を参照するためのクラス
 */

export interface ReferenceData {
  pose: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  image: string; // base64 image data
  landmarks: any[] | null;
  timestamp: Date;
}

export class PoseReference {
  private referencePose: { roll: number; pitch: number; yaw: number } | null = null;
  private referenceImage: string | null = null;
  private referenceLandmarks: any[] | null = null;
  private captureTimestamp: Date | null = null;
  private isSet: boolean = false;

  /**
   * Before画像の参照情報を設定
   */
  setReference(pose: { roll: number; pitch: number; yaw: number }, imageData: string, landmarks: any[] | null = null): boolean {
    this.referencePose = { ...pose };
    this.referenceImage = imageData;
    this.referenceLandmarks = landmarks;
    this.captureTimestamp = new Date();
    this.isSet = true;

    console.log('📋 Before参照姿勢を設定:', this.referencePose);
    return true;
  }

  /**
   * 保存されたBefore情報を取得
   */
  getReference(): ReferenceData | null {
    if (!this.isSet || !this.referencePose || !this.referenceImage || !this.captureTimestamp) {
      return null;
    }

    return {
      pose: { ...this.referencePose },
      image: this.referenceImage,
      landmarks: this.referenceLandmarks,
      timestamp: this.captureTimestamp,
    };
  }


  /**
   * 参照情報をクリア
   */
  clearReference(): void {
    this.referencePose = null;
    this.referenceImage = null;
    this.referenceLandmarks = null;
    this.captureTimestamp = null;
    this.isSet = false;
    console.log('🗑️ Before参照姿勢をクリア');
  }

  /**
   * 参照情報が設定されているかチェック
   */
  hasReference(): boolean {
    return this.isSet && this.referencePose !== null;
  }

}
