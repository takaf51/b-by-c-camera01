/**
 * PoseComparator - Before/After姿勢の比較分析
 * After撮影時にBefore姿勢との差異を計算し、ガイダンスを提供
 */

export interface PoseTolerances {
  roll: number;
  pitch: number;
  yaw: number;
}

export interface PoseDifferences {
  roll: number;
  pitch: number;
  yaw: number;
}

export interface PoseDeviations {
  roll: number;
  pitch: number;
  yaw: number;
}

export interface ToleranceCheck {
  roll: boolean;
  pitch: boolean;
  yaw: boolean;
}

export interface PoseAdjustment {
  axis: 'roll' | 'pitch' | 'yaw';
  direction: 'left' | 'right' | 'up' | 'down';
  amount: number;
}

export interface PoseComparison {
  differences: PoseDifferences;
  deviations: PoseDeviations;
  withinTolerance: ToleranceCheck;
  overallMatch: boolean;
  adjustments: PoseAdjustment[];
  matchPercentage: number;
}

export interface GuidanceMessage {
  message: string;
  type: 'success' | 'warning' | 'reference';
}

export class PoseComparator {
  private tolerances: PoseTolerances;

  constructor(tolerances: Partial<PoseTolerances> = {}) {
    this.tolerances = {
      roll: 2.0,   // ±2度
      pitch: 4.0,  // ±4度
      yaw: 1.5,    // ±1.5度
      ...tolerances
    };
  }

  /**
   * 許容値を設定
   */
  setTolerances(tolerances: Partial<PoseTolerances>): void {
    this.tolerances = { ...this.tolerances, ...tolerances };
  }

  /**
   * 現在の許容値を取得
   */
  getTolerances(): PoseTolerances {
    return { ...this.tolerances };
  }

  /**
   * 2つの姿勢を比較し、詳細な分析結果を返す
   */
  comparePoses(referencePose: { roll: number; pitch: number; yaw: number }, currentPose: { roll: number; pitch: number; yaw: number }): PoseComparison {
    // 差分計算
    const differences: PoseDifferences = {
      roll: currentPose.roll - referencePose.roll,
      pitch: currentPose.pitch - referencePose.pitch,
      yaw: currentPose.yaw - referencePose.yaw
    };

    // 絶対値での偏差
    const deviations: PoseDeviations = {
      roll: Math.abs(differences.roll),
      pitch: Math.abs(differences.pitch),
      yaw: Math.abs(differences.yaw)
    };

    // 許容範囲内かチェック
    const withinTolerance: ToleranceCheck = {
      roll: deviations.roll <= this.tolerances.roll,
      pitch: deviations.pitch <= this.tolerances.pitch,
      yaw: deviations.yaw <= this.tolerances.yaw
    };

    const overallMatch = withinTolerance.roll && withinTolerance.pitch && withinTolerance.yaw;

    // 調整方向の決定
    const adjustments: PoseAdjustment[] = [];
    
    if (!withinTolerance.roll) {
      adjustments.push({
        axis: 'roll',
        direction: differences.roll > 0 ? 'left' : 'right',
        amount: deviations.roll
      });
    }

    if (!withinTolerance.pitch) {
      adjustments.push({
        axis: 'pitch',
        direction: differences.pitch > 0 ? 'down' : 'up',
        amount: deviations.pitch
      });
    }

    if (!withinTolerance.yaw) {
      adjustments.push({
        axis: 'yaw',
        direction: differences.yaw > 0 ? 'left' : 'right',
        amount: deviations.yaw
      });
    }

    return {
      differences,
      deviations,
      withinTolerance,
      overallMatch,
      adjustments,
      matchPercentage: this.calculateMatchPercentage(deviations)
    };
  }

  /**
   * マッチ度を百分率で計算
   */
  private calculateMatchPercentage(deviations: PoseDeviations): number {
    const rollScore = Math.max(0, 1 - (deviations.roll / (this.tolerances.roll * 2)));
    const pitchScore = Math.max(0, 1 - (deviations.pitch / (this.tolerances.pitch * 2)));
    const yawScore = Math.max(0, 1 - (deviations.yaw / (this.tolerances.yaw * 2)));

    return Math.round((rollScore + pitchScore + yawScore) / 3 * 100);
  }

  /**
   * 比較結果からガイダンスメッセージを生成
   */
  generateGuidanceMessage(comparison: PoseComparison): GuidanceMessage {
    if (comparison.overallMatch) {
      return {
        message: "完璧！Before姿勢とマッチしています",
        type: "success"
      };
    }

    if (comparison.adjustments.length === 0) {
      return {
        message: "姿勢を調整してください",
        type: "warning"
      };
    }

    // 最も大きな偏差を優先
    const primaryAdjustment = comparison.adjustments.reduce((max, current) => 
      current.amount > max.amount ? current : max
    );

    const messages: Record<string, string> = {
      'roll-left': '顔を左に傾けてください',
      'roll-right': '顔を右に傾けてください',
      'pitch-up': '顔を少し上に向けてください',
      'pitch-down': '顔を少し下に向けてください',
      'yaw-left': '顔を左に向けてください',
      'yaw-right': '顔を右に向けてください'
    };

    const messageKey = `${primaryAdjustment.axis}-${primaryAdjustment.direction}`;
    const message = messages[messageKey] || '姿勢を調整してください';

    return {
      message: `${message} (差分: ${primaryAdjustment.amount.toFixed(1)}°)`,
      type: "reference"
    };
  }

  /**
   * デバッグ用：比較結果の詳細情報を文字列で返す
   */
  getComparisonSummary(comparison: PoseComparison): string {
    const { differences, deviations, matchPercentage } = comparison;
    
    return [
      `マッチ度: ${matchPercentage}%`,
      `ロール差分: ${differences.roll.toFixed(2)}° (偏差: ${deviations.roll.toFixed(2)}°)`,
      `ピッチ差分: ${differences.pitch.toFixed(2)}° (偏差: ${deviations.pitch.toFixed(2)}°)`,
      `ヨー差分: ${differences.yaw.toFixed(2)}° (偏差: ${deviations.yaw.toFixed(2)}°)`
    ].join('\n');
  }
}
