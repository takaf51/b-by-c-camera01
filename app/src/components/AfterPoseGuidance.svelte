<!--
  AfterPoseGuidance - After撮影時のBefore参照型姿勢ガイダンスUI
-->
<script lang="ts">
  import type { ReferenceData } from '../lib/PoseReference';
  import type { PoseComparison } from '../lib/PoseComparator';
  import { PoseGuidanceDirection, PoseGuidanceType } from '../types/camera';

  // Props
  export let pose: any = null;
  export const landmarks: any = null;
  export let beforeReference: ReferenceData | null = null;
  export let currentComparison: PoseComparison | null = null;
  export let onPoseCompare:
    | ((pose: {
        roll: number;
        pitch: number;
        yaw: number;
      }) => PoseComparison | null)
    | undefined = undefined;

  // Pose guidance state
  let showPoseGuidance = false;
  let poseGuidanceMessage = '';
  let poseGuidanceType = '';
  let guidanceDirection: PoseGuidanceDirection | null = null;

  // Generate guidance for After mode based on Before reference comparison
  function generateReferenceGuidance(comparison: PoseComparison) {
    if (!comparison.overallMatch) {
      const adjustments = comparison.adjustments || [];
      if (adjustments.length > 0) {
        const primaryAdjustment = adjustments[0];
        return {
          message: `Before姿勢に合わせて${primaryAdjustment.direction === 'left' ? '左' : primaryAdjustment.direction === 'right' ? '右' : primaryAdjustment.direction === 'up' ? '上' : '下'}に調整 (差分: ${primaryAdjustment.amount.toFixed(1)}°)`,
          type: PoseGuidanceType.WARNING,
          direction: getDirectionFromAdjustment(primaryAdjustment),
        };
      }
    }
    return null;
  }

  function getDirectionFromAdjustment(
    adjustment: any
  ): PoseGuidanceDirection | null {
    switch (adjustment.direction) {
      case 'left':
        return PoseGuidanceDirection.TURN_LEFT;
      case 'right':
        return PoseGuidanceDirection.TURN_RIGHT;
      case 'up':
        return PoseGuidanceDirection.LOOK_UP;
      case 'down':
        return PoseGuidanceDirection.LOOK_DOWN;
      default:
        return null;
    }
  }

  // After mode: compare with Before reference
  $: if (pose && onPoseCompare) {
    const comparison = onPoseCompare(pose);
    if (comparison) {
      currentComparison = comparison;
      // Override guidance with reference-based guidance if available
      const comparatorGuidance = generateReferenceGuidance(comparison);
      if (comparatorGuidance) {
        showPoseGuidance = true;
        poseGuidanceMessage = comparatorGuidance.message;
        poseGuidanceType = comparatorGuidance.type;
        guidanceDirection = comparatorGuidance.direction;
      }
    }
  }
</script>

<!-- Before参照情報表示（After撮影時のみ） -->
<div class="before-reference-info">
  {#if beforeReference}
    <div class="reference-status has-reference">
      <div class="reference-icon">📋</div>
      <div class="reference-text">
        <div class="reference-title">Before姿勢参照中</div>
        {#if currentComparison}
          <div class="match-percentage">
            マッチ度: {currentComparison.matchPercentage}%
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="reference-status no-reference">
      <div class="reference-icon">⚠️</div>
      <div class="reference-text">
        <div class="reference-title">Before参照なし</div>
        <div class="reference-subtitle">通常モードで撮影中</div>
      </div>
    </div>
  {/if}
</div>

<!-- 姿勢ガイダンスメッセージ -->
{#if showPoseGuidance}
  <div class="pose-guidance">
    <div class="guidance-message {poseGuidanceType}">
      {poseGuidanceMessage}
    </div>
  </div>
{/if}

<!-- SVG矢印ガイダンス -->
{#if guidanceDirection && showPoseGuidance}
  <div class="dynamic-elements">
    <svg class="arrow-svg" viewBox="0 0 100 100" style:opacity="1">
      {#if guidanceDirection === PoseGuidanceDirection.TURN_LEFT}
        <!-- 左向き矢印 -->
        <path
          d="M 20 28.4 A 35 35 0 0 0 20 71.6"
          fill="none"
          stroke="#D2294C"
          stroke-width="2"
          opacity="1"
        />
        <polygon points="8,50 10,53 10,47" fill="#D2294C" />
      {:else if guidanceDirection === PoseGuidanceDirection.TURN_RIGHT}
        <!-- 右向き矢印 -->
        <path
          d="M 80 28.4 A 35 35 0 0 1 80 71.6"
          fill="none"
          stroke="#D2294C"
          stroke-width="2"
          opacity="1"
        />
        <polygon points="92,50 90,53 90,47" fill="#D2294C" />
      {:else if guidanceDirection === PoseGuidanceDirection.LOOK_UP}
        <!-- 上向き矢印 -->
        <path
          d="M 28.4 25 A 35 35 0 0 1 71.6 25"
          fill="none"
          stroke="#D2294C"
          stroke-width="2"
          opacity="1"
        />
        <polygon points="50,13 53,15 47,15" fill="#D2294C" />
      {:else if guidanceDirection === PoseGuidanceDirection.LOOK_DOWN}
        <!-- 下向き矢印 -->
        <path
          d="M 71.6 75 A 35 35 0 0 1 28.4 75"
          fill="none"
          stroke="#D2294C"
          stroke-width="2"
          opacity="1"
        />
        <polygon points="50,87 47,85 53,85" fill="#D2294C" />
      {:else if guidanceDirection === PoseGuidanceDirection.TILT_LEFT}
        <!-- 左傾き矢印 -->
        <path
          d="M 43 20 A 35 35 0 0 0 20 48"
          fill="none"
          stroke="#D2294C"
          stroke-width="2"
          opacity="1"
        />
        <polygon points="22.5,47 18,46.5 20,50" fill="#D2294C" />
      {:else if guidanceDirection === PoseGuidanceDirection.TILT_RIGHT}
        <!-- 右傾き矢印 -->
        <path
          d="M 57 20 A 35 35 0 0 1 80 48"
          fill="none"
          stroke="#D2294C"
          stroke-width="2"
          opacity="1"
        />
        <polygon points="77.5,47 82,46.5 80,50" fill="#D2294C" />
      {/if}
    </svg>
  </div>
{/if}

<style>
  /* Before参照情報表示 */
  .before-reference-info {
    position: fixed;
    top: 80px;
    left: 20px;
    right: 20px;
    z-index: 1100;
    pointer-events: none;
  }

  .reference-status {
    background: rgba(0, 0, 0, 0.8);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .reference-status.has-reference {
    border-color: rgba(76, 175, 80, 0.5);
  }

  .reference-status.no-reference {
    border-color: rgba(255, 152, 0, 0.5);
  }

  .reference-icon {
    font-size: 18px;
    line-height: 1;
  }

  .reference-text {
    flex: 1;
    color: white;
    font-size: 14px;
  }

  .reference-title {
    font-weight: 600;
    margin-bottom: 2px;
  }

  .reference-subtitle {
    font-size: 12px;
    opacity: 0.8;
  }

  .match-percentage {
    font-size: 12px;
    color: #4caf50;
    font-weight: 500;
  }

  /* 姿勢ガイダンス */
  .pose-guidance {
    position: fixed;
    bottom: 100px;
    left: 0;
    right: 0;
    z-index: 2000;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 0;
  }

  .guidance-message {
    background: #ffffff;
    color: #d2294c;
    width: min(390px, 100vw);
    height: 47px;
    padding: 12px 16px;
    border-radius: 8px;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid #d2294c;
    animation: messageSlideIn 0.3s ease-out;
    box-sizing: border-box;
    margin: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .guidance-message.success {
    background: #ffffff !important;
    color: #d2294c !important;
    border-color: #d2294c !important;
  }

  .guidance-message.warning {
    background: #ffffff !important;
    color: #d2294c !important;
    border-color: #d2294c !important;
  }

  .guidance-message.error {
    background: #ffffff !important;
    color: #d2294c !important;
    border-color: #d2294c !important;
  }

  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* SVG矢印スタイル */
  .dynamic-elements {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 15;
    pointer-events: none;
  }

  .arrow-svg {
    width: 100%;
    height: 100%;
    animation: pulse 1.5s ease-in-out infinite;
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5));
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* モバイル対応 */
  @media (max-width: 480px) {
    .before-reference-info {
      top: 60px;
      left: 10px;
      right: 10px;
    }

    .reference-status {
      padding: 10px 12px;
    }

    .reference-text {
      font-size: 13px;
    }

    .reference-title {
      font-size: 13px;
    }

    .reference-subtitle,
    .match-percentage {
      font-size: 11px;
    }
  }
</style>
