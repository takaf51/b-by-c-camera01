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
  correctionResult?: any;
}

export class PoseReference {
  private referencePose: { roll: number; pitch: number; yaw: number } | null = null;
  private referenceImage: string | null = null;
  private referenceLandmarks: any[] | null = null;
  private captureTimestamp: Date | null = null;
  private isSet: boolean = false;
  private correctionResult: any = null;

  /**
   * Before画像の参照情報を設定
   */
  setReference(pose: { roll: number; pitch: number; yaw: number }, imageData: string, landmarks: any[] | null = null): boolean {
    this.referencePose = { ...pose };
    this.referenceImage = imageData;
    this.referenceLandmarks = landmarks;
    this.captureTimestamp = new Date();
    this.isSet = true;
    this.correctionResult = null; // 補正結果をリセット

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
      correctionResult: this.correctionResult
    };
  }

  /**
   * 補正結果を保存
   */
  setCorrectionResult(correctionResult: any): void {
    this.correctionResult = correctionResult;
    console.log('💫 Before補正結果を保存:', correctionResult?.correctionInfo);
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
    this.correctionResult = null;
    console.log('🗑️ Before参照姿勢をクリア');
  }

  /**
   * 参照情報が設定されているかチェック
   */
  hasReference(): boolean {
    return this.isSet && this.referencePose !== null;
  }

  /**
   * 表示用の姿勢データを取得（補正後があれば補正後、なければ元の値）
   */
  getDisplayPose(): { roll: number; pitch: number; yaw: number } | null {
    const reference = this.getReference();
    if (!reference) return null;

    // 補正結果がある場合は補正後の値を返す
    return reference.correctionResult?.estimatedCorrectedPose || reference.pose;
  }
}
