<!--
  BeforePoseGuidance - Before撮影時の姿勢ガイダンスUI
-->
<script lang="ts">
  import {
    PoseGuidanceDirection,
    PoseGuidanceType,
  } from '../../../types/camera';

  // Props
  export const pose: any = null;
  export const landmarks: any = null;
  export let guidance: any = null;

  // Pose guidance state
  let showPoseGuidance = false;
  let poseGuidanceMessage = '';
  let poseGuidanceType = '';
  let guidanceDirection: PoseGuidanceDirection | null = null;
  let nosePosition: { x: number; y: number } | null = null;

  // Before mode: use normal pose guidance
  $: if (guidance) {
    showPoseGuidance = guidance.show;
    poseGuidanceMessage = guidance.message;
    poseGuidanceType = guidance.type;
    guidanceDirection = guidance.direction;
    nosePosition = guidance.nosePosition;
  }
</script>

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
</style>
