/**
 * 表情分析クラス
 * iwa_b-by-c_js/ver2のExpressionAnalyzerをTypeScriptに移植
 */

export interface ExpressionData {
  mouthSmile: number;
  eyebrowRaise: number;
  eyeTension: number;
  overallScore: number;
  isCalibrated: boolean;
  calibrationProgress?: number;
  rawData?: any;
  baseline?: any;
}

export interface ExpressionSettings {
  smileThreshold: number;
  eyebrowThreshold: number;
  eyeTensionThreshold: number;
}

interface BaselineData {
  mouthHeight: number;
  eyebrowHeight: number;
  eyeOpenness: number;
  faceHeight: number;
}

interface CurrentMeasurements {
  mouthHeight: number;
  eyebrowHeight: number;
  eyeOpenness: number;
  faceHeight: number;
}

export class ExpressionAnalyzer {
  private baselineData: BaselineData | null = null;
  private calibrationFrames: any[] = [];
  private calibrationComplete = false;

  // 固定設定値（ver2のREADME.mdの推奨値）
  private readonly settings: ExpressionSettings = {
    smileThreshold: 0.3,      // 正規化後30相当
    eyebrowThreshold: 0.25,   // 正規化後25相当
    eyeTensionThreshold: 0.3  // 正規化後30相当
  };

  // MediaPipe 顔ランドマークのインデックス定義（ver2からの移植）
  private readonly landmarkIndices = {
    // 口関連ランドマーク
    leftMouthCorner: 61,     // 左口角
    rightMouthCorner: 291,   // 右口角
    upperLipTop: 13,         // 上唇中央上
    upperLipBottom: 12,      // 上唇中央下
    lowerLipTop: 15,         // 下唇中央上
    lowerLipBottom: 17,      // 下唇中央下
    mouthCenter: 18,         // 口中央（顎側）
    
    // 眉毛関連ランドマーク
    leftEyebrowInner: 70,    // 左眉内側
    leftEyebrowMid1: 63,     // 左眉中央1
    leftEyebrowMid2: 105,    // 左眉中央2
    leftEyebrowOuter: 66,    // 左眉外側
    rightEyebrowInner: 300,  // 右眉内側
    rightEyebrowMid1: 293,   // 右眉中央1
    rightEyebrowMid2: 334,   // 右眉中央2
    rightEyebrowOuter: 296,  // 右眉外側
    
    // 目関連ランドマーク
    leftEyeTop: 159,         // 左目上
    leftEyeBottom: 145,      // 左目下
    leftEyeInner: 133,       // 左目内側
    leftEyeOuter: 33,        // 左目外側
    leftEyeTopInner: 158,    // 左目上内側
    leftEyeTopOuter: 157,    // 左目上外側
    leftEyeBottomInner: 173, // 左目下内側
    leftEyeBottomOuter: 144, // 左目下外側
    
    rightEyeTop: 386,        // 右目上
    rightEyeBottom: 374,     // 右目下
    rightEyeInner: 362,      // 右目内側
    rightEyeOuter: 263,      // 右目外側
    rightEyeTopInner: 385,   // 右目上内側
    rightEyeTopOuter: 384,   // 右目上外側
    rightEyeBottomInner: 398,// 右目下内側
    rightEyeBottomOuter: 373,// 右目下外側
    
    // 基準点
    noseTip: 1,              // 鼻先
    noseTop: 6,              // 鼻根
    foreheadCenter: 9,       // 額中央
    chinCenter: 175,         // 顎中央
  };

  constructor() {}

  /**
   * 表情を分析
   */
  analyzeExpression(landmarks: any[]): ExpressionData {
    if (!landmarks || landmarks.length < 468) {
      return this.getDefaultAnalysis();
    }

    // ベースラインがない場合は最初の数フレームでキャリブレーション
    if (!this.baselineData) {
      return this.performCalibration(landmarks);
    }

    const current: CurrentMeasurements = {
      mouthHeight: this.calculateMouthHeight(landmarks),
      eyebrowHeight: this.calculateEyebrowHeight(landmarks),
      eyeOpenness: this.calculateEyeOpenness(landmarks),
      faceHeight: this.calculateFaceHeight(landmarks)
    };

    // 正規化（顔の大きさの違いを考慮）
    const faceScale = current.faceHeight / this.baselineData.faceHeight;

    // 口角の上がり具合を計算
    const mouthSmile = this.calculateSmileIntensity(current, this.baselineData, faceScale);

    // 眉の上がり具合を計算
    const eyebrowRaise = this.calculateEyebrowRaise(current, this.baselineData, faceScale);

    // 目の力み具合を計算
    const eyeTension = this.calculateEyeTension(current, this.baselineData, faceScale);

    // 総合スコアを計算
    const overallScore = this.calculateOverallScore(mouthSmile, eyebrowRaise, eyeTension);

    return {
      mouthSmile: Math.max(0, mouthSmile / 10),  // 1/10に正規化
      eyebrowRaise: Math.max(0, eyebrowRaise / 10),  // 1/10に正規化
      eyeTension: Math.max(0, eyeTension * 40),  // 40倍に正規化
      overallScore: Math.round(overallScore),
      isCalibrated: true,
      rawData: current,
      baseline: this.baselineData
    };
  }

  /**
   * 表情が受け入れ可能かチェック
   */
  isExpressionAcceptable(expression: ExpressionData): boolean {
    if (!expression.isCalibrated) return true;

    return expression.mouthSmile < this.settings.smileThreshold &&
           expression.eyebrowRaise < this.settings.eyebrowThreshold &&
           expression.eyeTension < this.settings.eyeTensionThreshold;
  }

  /**
   * キャリブレーション実行（60フレーム分のデータを収集）
   */
  private performCalibration(landmarks: any[]): ExpressionData {
    this.calibrationFrames.push(landmarks);

    // 60フレーム分のデータを収集（より安定したベースライン）
    if (this.calibrationFrames.length >= 60) {
      this.calculateAverageBaseline();
      this.calibrationComplete = true;
      return this.analyzeExpression(landmarks);
    }

    return {
      mouthSmile: 0,
      eyebrowRaise: 0,
      eyeTension: 0,
      overallScore: 100,
      isCalibrated: false,
      calibrationProgress: (this.calibrationFrames.length / 60) * 100
    };
  }

  /**
   * 平均ベースラインを計算（中央値ベース）
   */
  private calculateAverageBaseline(): void {
    // 外れ値を除外するため、中央値ベースの計算を使用
    const mouthHeights: number[] = [];
    const eyebrowHeights: number[] = [];
    const eyeOpennesses: number[] = [];
    const faceHeights: number[] = [];

    this.calibrationFrames.forEach(landmarks => {
      mouthHeights.push(this.calculateMouthHeight(landmarks));
      eyebrowHeights.push(this.calculateEyebrowHeight(landmarks));
      eyeOpennesses.push(this.calculateEyeOpenness(landmarks));
      faceHeights.push(this.calculateFaceHeight(landmarks));
    });

    // ソートして中央値を取得（外れ値の影響を軽減）
    const median = (arr: number[]): number => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    this.baselineData = {
      mouthHeight: median(mouthHeights),
      eyebrowHeight: median(eyebrowHeights),
      eyeOpenness: median(eyeOpennesses),
      faceHeight: median(faceHeights)
    };
  }

  /**
   * 口の高さを計算（改良版）
   */
  private calculateMouthHeight(landmarks: any[]): number {
    const leftCorner = landmarks[this.landmarkIndices.leftMouthCorner];
    const rightCorner = landmarks[this.landmarkIndices.rightMouthCorner];
    const upperLip = landmarks[this.landmarkIndices.upperLipTop];
    const lowerLip = landmarks[this.landmarkIndices.lowerLipBottom];
    const noseTip = landmarks[this.landmarkIndices.noseTip];

    if (!leftCorner || !rightCorner || !upperLip || !lowerLip || !noseTip) return 0;

    // 口角の平均Y座標
    const cornerAvgY = (leftCorner.y + rightCorner.y) / 2;

    // 唇の中点Y座標
    const lipCenterY = (upperLip.y + lowerLip.y) / 2;

    // 鼻を基準とした相対位置で計算（より安定）
    const mouthRelativeToNose = cornerAvgY - noseTip.y;
    const lipCenterRelativeToNose = lipCenterY - noseTip.y;

    // 口角が唇中心より上にあるほど大きな値
    const smileValue = (lipCenterRelativeToNose - mouthRelativeToNose) * 1000; // スケール調整

    return Math.max(0, smileValue);
  }

  /**
   * 眉毛の高さを計算（改良版）
   */
  private calculateEyebrowHeight(landmarks: any[]): number {
    // より多くの眉毛ポイントを使用
    const leftEyebrowPoints = [
      landmarks[this.landmarkIndices.leftEyebrowInner],
      landmarks[this.landmarkIndices.leftEyebrowMid1],
      landmarks[this.landmarkIndices.leftEyebrowMid2],
      landmarks[this.landmarkIndices.leftEyebrowOuter]
    ].filter(p => p); // nullチェック

    const rightEyebrowPoints = [
      landmarks[this.landmarkIndices.rightEyebrowInner],
      landmarks[this.landmarkIndices.rightEyebrowMid1],
      landmarks[this.landmarkIndices.rightEyebrowMid2],
      landmarks[this.landmarkIndices.rightEyebrowOuter]
    ].filter(p => p);

    const leftEyeTop = landmarks[this.landmarkIndices.leftEyeTop];
    const rightEyeTop = landmarks[this.landmarkIndices.rightEyeTop];
    const noseTop = landmarks[this.landmarkIndices.noseTop];

    if (leftEyebrowPoints.length === 0 || rightEyebrowPoints.length === 0 || !leftEyeTop || !rightEyeTop || !noseTop) return 0;

    // 眉毛の平均高さ
    const leftBrowAvgY = leftEyebrowPoints.reduce((sum, p) => sum + p.y, 0) / leftEyebrowPoints.length;
    const rightBrowAvgY = rightEyebrowPoints.reduce((sum, p) => sum + p.y, 0) / rightEyebrowPoints.length;
    const avgBrowY = (leftBrowAvgY + rightBrowAvgY) / 2;

    // 目の平均高さ
    const avgEyeTopY = (leftEyeTop.y + rightEyeTop.y) / 2;

    // 鼻を基準とした相対計算（顔の大きさに影響されにくい）
    const browRelativeToNose = avgBrowY - noseTop.y;
    const eyeRelativeToNose = avgEyeTopY - noseTop.y;

    // 眉毛が目より上にあるほど大きな値
    const eyebrowRaise = (eyeRelativeToNose - browRelativeToNose) * 2000; // スケール調整

    return Math.max(0, eyebrowRaise);
  }

  /**
   * 目の開き具合を計算（改良版）
   */
  private calculateEyeOpenness(landmarks: any[]): number {
    // より多くの目のポイントを使用
    const leftEyePoints = {
      top: landmarks[this.landmarkIndices.leftEyeTop],
      topInner: landmarks[this.landmarkIndices.leftEyeTopInner],
      topOuter: landmarks[this.landmarkIndices.leftEyeTopOuter],
      bottom: landmarks[this.landmarkIndices.leftEyeBottom],
      bottomInner: landmarks[this.landmarkIndices.leftEyeBottomInner],
      bottomOuter: landmarks[this.landmarkIndices.leftEyeBottomOuter]
    };

    const rightEyePoints = {
      top: landmarks[this.landmarkIndices.rightEyeTop],
      topInner: landmarks[this.landmarkIndices.rightEyeTopInner],
      topOuter: landmarks[this.landmarkIndices.rightEyeTopOuter],
      bottom: landmarks[this.landmarkIndices.rightEyeBottom],
      bottomInner: landmarks[this.landmarkIndices.rightEyeBottomInner],
      bottomOuter: landmarks[this.landmarkIndices.rightEyeBottomOuter]
    };

    // 各点が存在するかチェック
    const hasLeftEye = Object.values(leftEyePoints).every(p => p);
    const hasRightEye = Object.values(rightEyePoints).every(p => p);

    if (!hasLeftEye || !hasRightEye) return 0;

    // 左目の開き具合（複数点の平均）
    const leftEyeHeight1 = Math.abs(leftEyePoints.top.y - leftEyePoints.bottom.y);
    const leftEyeHeight2 = Math.abs(leftEyePoints.topInner.y - leftEyePoints.bottomInner.y);
    const leftEyeHeight3 = Math.abs(leftEyePoints.topOuter.y - leftEyePoints.bottomOuter.y);
    const leftEyeOpenness = (leftEyeHeight1 + leftEyeHeight2 + leftEyeHeight3) / 3;

    // 右目の開き具合（複数点の平均）
    const rightEyeHeight1 = Math.abs(rightEyePoints.top.y - rightEyePoints.bottom.y);
    const rightEyeHeight2 = Math.abs(rightEyePoints.topInner.y - rightEyePoints.bottomInner.y);
    const rightEyeHeight3 = Math.abs(rightEyePoints.topOuter.y - rightEyePoints.bottomOuter.y);
    const rightEyeOpenness = (rightEyeHeight1 + rightEyeHeight2 + rightEyeHeight3) / 3;

    return (leftEyeOpenness + rightEyeOpenness) / 2;
  }

  /**
   * 顔の高さを計算（正規化用）
   */
  private calculateFaceHeight(landmarks: any[]): number {
    const forehead = landmarks[this.landmarkIndices.foreheadCenter];
    const chin = landmarks[this.landmarkIndices.chinCenter];

    if (!forehead || !chin) return 1;

    return Math.abs(forehead.y - chin.y);
  }

  /**
   * 笑顔の強さを計算（改良版）
   */
  private calculateSmileIntensity(current: CurrentMeasurements, baseline: BaselineData, faceScale: number): number {
    const normalizedCurrent = current.mouthHeight / faceScale;
    const normalizedBaseline = baseline.mouthHeight / faceScale;
    const difference = normalizedCurrent - normalizedBaseline;

    // より敏感なスケーリングを適用
    const sensitivity = 50; // 感度を大幅に向上
    return Math.max(0, difference * sensitivity);
  }

  /**
   * 眉の上がり具合を計算（改良版）
   */
  private calculateEyebrowRaise(current: CurrentMeasurements, baseline: BaselineData, faceScale: number): number {
    const normalizedCurrent = current.eyebrowHeight / faceScale;
    const normalizedBaseline = baseline.eyebrowHeight / faceScale;
    const difference = normalizedCurrent - normalizedBaseline;

    // より敏感なスケーリングを適用
    const sensitivity = 25; // 感度を向上
    return Math.max(0, difference * sensitivity);
  }

  /**
   * 目の力み具合を計算（改良版）
   */
  private calculateEyeTension(current: CurrentMeasurements, baseline: BaselineData, faceScale: number): number {
    const normalizedCurrent = current.eyeOpenness / faceScale;
    const normalizedBaseline = baseline.eyeOpenness / faceScale;
    const difference = normalizedBaseline - normalizedCurrent;

    // ベースラインより目が細くなっている場合を力みとして検出
    const sensitivity = 100; // 感度を大幅に向上
    return Math.max(0, difference * sensitivity);
  }

  /**
   * 総合スコアを計算
   */
  private calculateOverallScore(mouthSmile: number, eyebrowRaise: number, eyeTension: number): number {
    // 各要素の重み付け（合計100点から減点方式）
    const smilePenalty = Math.min(mouthSmile * 20, 30);
    const eyebrowPenalty = Math.min(eyebrowRaise * 25, 35);
    const eyeTensionPenalty = Math.min(eyeTension * 15, 25);

    const totalPenalty = smilePenalty + eyebrowPenalty + eyeTensionPenalty;
    return Math.max(0, 100 - totalPenalty);
  }

  /**
   * デフォルト分析結果を返す
   */
  private getDefaultAnalysis(): ExpressionData {
    return {
      mouthSmile: 0,
      eyebrowRaise: 0,
      eyeTension: 0,
      overallScore: 100,
      isCalibrated: false
    };
  }

  /**
   * キャリブレーションをリセット
   */
  resetCalibration(): void {
    this.baselineData = null;
    this.calibrationFrames = [];
    this.calibrationComplete = false;
  }

  /**
   * 設定値を取得
   */
  getSettings(): ExpressionSettings {
    return { ...this.settings };
  }
}
