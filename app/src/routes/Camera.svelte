<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { push, params } from 'svelte-spa-router';
  import Layout from '../components/Layout.svelte';
  import Button from '../components/Button.svelte';
  import { FaceMesh } from '@mediapipe/face_mesh/face_mesh';
  import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils/camera_utils';
  import {
    drawConnectors,
    FACEMESH_TESSELATION,
    FACEMESH_RIGHT_EYE,
    FACEMESH_LEFT_EYE,
    FACEMESH_FACE_OVAL,
    FACEMESH_LIPS,
  } from '@mediapipe/drawing_utils/drawing_utils';

  // ルートパラメータ
  export let programId: string = '';

  // DOM要素
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let canvasCtx: CanvasRenderingContext2D;

  // MediaPipe
  let faceMesh: any;
  let camera: any;

  // 撮影モード
  const CaptureMode = {
    IDLE: 'IDLE',
    BEFORE: 'BEFORE',
    CHALLENGE: 'CHALLENGE',
    AFTER: 'AFTER',
  } as const;

  type CaptureModeType = (typeof CaptureMode)[keyof typeof CaptureMode];

  // 状態管理
  let currentMode: CaptureModeType = CaptureMode.IDLE;
  let isCapturing = false;
  let statusMessage = 'カメラを起動してください';
  let capturedImages: string[] = [];
  let showMesh = true;

  // 姿勢検知パラメータ
  let stablePosition = false;
  let stableStartTime: number | null = null;
  let progress = 0;
  const STABILITY_TIME = 0.5; // 安定時間（秒）
  const CAPTURE_COUNT = 5; // 撮影枚数

  // 角度閾値（PHP側と同じ値）
  const THRESHOLDS = {
    roll: 3.0,
    pitch: 8.0,
    yaw: 3.0,
  };

  onMount(async () => {
    console.log('Camera.svelte: onMount started');
    try {
      console.log('Camera.svelte: Initializing MediaPipe...');
      await initializeMediaPipe();
      console.log('Camera.svelte: MediaPipe initialized');

      console.log('Camera.svelte: Starting camera...');
      await startCamera();
      console.log('Camera.svelte: Camera started');
    } catch (error) {
      console.error('Camera.svelte: Error in onMount:', error);
      statusMessage =
        'カメラの初期化に失敗しました: ' +
        (error instanceof Error ? error.message : String(error));
    }
  });

  onDestroy(() => {
    cleanup();
  });

  async function initializeMediaPipe() {
    console.log('initializeMediaPipe: Creating FaceMesh...');
    try {
      console.log('initializeMediaPipe: Using imported FaceMesh class...');

      faceMesh = new FaceMesh({
        locateFile: (file: string) => {
          console.log('initializeMediaPipe: locateFile called for:', file);
          // 元のコードと同じCDN設定
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      console.log('initializeMediaPipe: Setting options...');
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      console.log('initializeMediaPipe: Setting onResults callback...');
      faceMesh.onResults(onResults);
      console.log('initializeMediaPipe: MediaPipe setup complete');
    } catch (error) {
      console.error('initializeMediaPipe: Error:', error);
      throw error;
    }
  }

  async function startCamera() {
    console.log('startCamera: Starting...');
    try {
      console.log('startCamera: videoElement:', videoElement);
      if (!videoElement) {
        throw new Error('Video element is not available');
      }

      console.log('startCamera: Creating Camera instance...');

      camera = new MediaPipeCamera(videoElement, {
        onFrame: async () => {
          if (faceMesh) {
            try {
              await faceMesh.send({ image: videoElement });
            } catch (error) {
              console.error('startCamera: Error in faceMesh.send:', error);
            }
          } else {
            console.warn('startCamera: faceMesh not available in onFrame');
          }
        },
        width: 1280,
        height: 720,
      });

      console.log('startCamera: Starting camera...');
      await camera.start();
      console.log('startCamera: Camera started successfully');

      isCapturing = true;
      statusMessage = 'カメラに正面を向けてください';
    } catch (error) {
      console.error('startCamera: Camera startup failed:', error);
      console.error('startCamera: Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      statusMessage =
        'カメラの起動に失敗しました: ' +
        (error instanceof Error ? error.message : String(error));
    }
  }

  function onResults(results: any) {
    if (!canvasCtx) {
      console.log('onResults: Initializing canvas context...');
      if (!canvasElement) {
        console.error('onResults: Canvas element not available');
        return;
      }
      canvasCtx = canvasElement.getContext('2d')!;
      console.log('onResults: Canvas context initialized');
    }

    // キャンバスをクリア
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // ビデオを描画
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      console.log(
        'onResults: Face detected, landmarks count:',
        landmarks.length
      );

      // 姿勢を計算
      const pose = calculatePose(landmarks);
      console.log('onResults: Pose calculated:', pose);
      updateStability(pose);

      if (showMesh) {
        console.log(
          'onResults: Drawing face mesh, canvasCtx available:',
          !!canvasCtx
        );
        console.log(
          'onResults: Canvas size:',
          canvasElement.width,
          'x',
          canvasElement.height
        );
        console.log(
          'onResults: FACEMESH_TESSELATION available:',
          !!FACEMESH_TESSELATION
        );

        try {
          // drawConnectors関数の検証
          console.log('onResults: drawConnectors type:', typeof drawConnectors);
          console.log(
            'onResults: FACEMESH_TESSELATION type:',
            typeof FACEMESH_TESSELATION
          );

          if (typeof drawConnectors === 'function') {
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
              color: '#FF0000', // 赤色で目立たせる
              lineWidth: 3, // 太くして見やすく
            });
            console.log('onResults: drawConnectors executed');
          } else {
            console.error('onResults: drawConnectors is not a function');
          }

          // 手動で顔の輪郭を描画
          canvasCtx.strokeStyle = '#00FFFF';
          canvasCtx.lineWidth = 2;
          canvasCtx.beginPath();

          // 顔の輪郭のランドマーク（MediaPipeの標準的な顔輪郭ポイント）
          const faceOvalIndices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
            379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
            234, 127, 162, 21, 54, 103, 67, 109, 10,
          ];

          for (let i = 0; i < faceOvalIndices.length; i++) {
            const idx = faceOvalIndices[i];
            if (landmarks[idx]) {
              const x = landmarks[idx].x * canvasElement.width;
              const y = landmarks[idx].y * canvasElement.height;

              if (i === 0) {
                canvasCtx.moveTo(x, y);
              } else {
                canvasCtx.lineTo(x, y);
              }
            }
          }
          canvasCtx.closePath();
          canvasCtx.stroke();

          // 目を描画
          const drawEye = (eyeIndices: number[], color: string) => {
            canvasCtx.strokeStyle = color;
            canvasCtx.beginPath();
            for (let i = 0; i < eyeIndices.length; i++) {
              const idx = eyeIndices[i];
              if (landmarks[idx]) {
                const x = landmarks[idx].x * canvasElement.width;
                const y = landmarks[idx].y * canvasElement.height;
                if (i === 0) {
                  canvasCtx.moveTo(x, y);
                } else {
                  canvasCtx.lineTo(x, y);
                }
              }
            }
            canvasCtx.closePath();
            canvasCtx.stroke();
          };

          // 右目と左目
          const rightEye = [
            33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160,
            161, 246,
          ];
          const leftEye = [
            362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386,
            385, 384, 398,
          ];

          drawEye(rightEye, '#FF3030');
          drawEye(leftEye, '#30FF30');

          console.log('onResults: Manual face mesh drawn');
        } catch (error) {
          console.error('onResults: Error in MediaPipe drawing:', error);
        }

        drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {
          color: '#FF3030',
        });
        drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {
          color: '#30FF30',
        });
        drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {
          color: '#E0E0E0',
        });
        drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {
          color: '#E0E0E0',
        });
      }

      // 自動撮影チェック
      if (
        currentMode !== CaptureMode.IDLE &&
        stablePosition &&
        capturedImages.length < CAPTURE_COUNT
      ) {
        checkAutoCapture();
      }
    } else {
      stablePosition = false;
      stableStartTime = null;
      progress = 0;
      statusMessage = '顔が検出されません';
    }

    canvasCtx.restore();
  }

  function calculatePose(landmarks: any) {
    // PHP側と同じ姿勢計算ロジック
    // 簡略化した実装（実際のPHP側はより複雑）
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    // Roll計算（左右の傾き）
    const eyeVector = {
      x: rightEye.x - leftEye.x,
      y: rightEye.y - leftEye.y,
    };
    const roll = Math.atan2(eyeVector.y, eyeVector.x) * (180 / Math.PI);

    // 簡易的なPitch/Yaw計算
    const pitch = (nose.y - 0.5) * 50; // 上下の向き
    const yaw = (nose.x - 0.5) * 50; // 左右の向き

    return { roll: Math.abs(roll), pitch: Math.abs(pitch), yaw: Math.abs(yaw) };
  }

  function updateStability(pose: any) {
    const isStable =
      pose.roll < THRESHOLDS.roll &&
      pose.pitch < THRESHOLDS.pitch &&
      pose.yaw < THRESHOLDS.yaw;

    if (isStable) {
      if (!stablePosition) {
        stablePosition = true;
        stableStartTime = performance.now();
        statusMessage = '良いポジションです！そのまま維持してください';
      }

      if (stableStartTime) {
        const elapsed = (performance.now() - stableStartTime) / 1000;
        progress = Math.min(elapsed / STABILITY_TIME, 1) * 100;

        if (elapsed >= STABILITY_TIME) {
          statusMessage = '安定しています - 自動撮影準備完了';
        }
      }
    } else {
      stablePosition = false;
      stableStartTime = null;
      progress = 0;
      statusMessage = '顔の位置を調整してください';
    }
  }

  function checkAutoCapture() {
    if (
      stableStartTime &&
      (performance.now() - stableStartTime) / 1000 >= STABILITY_TIME
    ) {
      capturePhoto();
      stableStartTime = performance.now(); // 次の撮影のためにリセット
    }
  }

  function capturePhoto() {
    // キャンバスから画像データを取得
    const imageData = canvasElement.toDataURL('image/jpeg', 0.8);
    capturedImages = [...capturedImages, imageData];

    statusMessage = `撮影完了 (${capturedImages.length}/${CAPTURE_COUNT})`;

    if (capturedImages.length >= CAPTURE_COUNT) {
      completeCaptureMode();
    }
  }

  function completeCaptureMode() {
    if (currentMode === CaptureMode.BEFORE) {
      statusMessage = 'ビフォー撮影完了！';
      // TODO: 5分間チャレンジモードへの遷移
    } else if (currentMode === CaptureMode.AFTER) {
      statusMessage = 'アフター撮影完了！結果を処理中...';
      // TODO: 結果ページへの遷移
    }
  }

  function startBeforeCapture() {
    currentMode = CaptureMode.BEFORE;
    capturedImages = [];
    statusMessage = `ビフォー撮影開始 (${capturedImages.length}/${CAPTURE_COUNT})`;
  }

  function startAfterCapture() {
    currentMode = CaptureMode.AFTER;
    capturedImages = [];
    statusMessage = `アフター撮影開始 (${capturedImages.length}/${CAPTURE_COUNT})`;
  }

  function toggleMesh() {
    showMesh = !showMesh;
  }

  function goBack() {
    push(`/plan/detail/${programId}`);
  }

  function cleanup() {
    if (camera) {
      camera.stop();
    }
    if (faceMesh) {
      faceMesh.close();
    }
  }
</script>

<Layout title="カメラ撮影">
  <div class="camera-container">
    <!-- ヘッダー -->
    <div class="camera-header">
      <Button variant="outline" on:click={goBack}>
        ← プログラム詳細に戻る
      </Button>
      <h2>プログラム撮影</h2>
    </div>

    <!-- ビデオエリア -->
    <div class="video-container">
      <video
        bind:this={videoElement}
        class="input-video"
        autoplay
        playsinline
        muted
      ></video>
      <canvas
        bind:this={canvasElement}
        class="output-canvas"
        width="1280"
        height="720"
      ></canvas>
    </div>

    <!-- ステータスパネル -->
    <div class="status-panel">
      <div class="status-message">{statusMessage}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progress}%"></div>
      </div>
    </div>

    <!-- コントロール -->
    <div class="controls">
      <Button
        variant="primary"
        disabled={currentMode !== CaptureMode.IDLE}
        on:click={startBeforeCapture}
      >
        1. ビフォー撮影開始
      </Button>

      <Button
        variant="secondary"
        disabled={currentMode === CaptureMode.IDLE ||
          capturedImages.length < CAPTURE_COUNT}
        on:click={startAfterCapture}
      >
        3. アフター撮影開始
      </Button>

      <Button variant="outline" on:click={toggleMesh}>
        {showMesh ? 'メッシュ非表示' : 'メッシュ表示'}
      </Button>
    </div>

    <!-- 撮影結果ギャラリー -->
    {#if capturedImages.length > 0}
      <div class="gallery">
        <h3>撮影結果 ({capturedImages.length}/{CAPTURE_COUNT})</h3>
        <div class="captured-images">
          {#each capturedImages as image, index (index)}
            <img
              src={image}
              alt="撮影画像 {index + 1}"
              class="captured-image"
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>
</Layout>

<style>
  .camera-container {
    max-width: 100%;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .camera-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .camera-header h2 {
    margin: 0;
    color: #fff;
  }

  .video-container {
    position: relative;
    width: 100%;
    max-width: 640px;
    background-color: #000;
    border-radius: 8px;
    overflow: hidden;
  }

  .input-video {
    width: 100%;
    height: auto;
    display: block;
  }

  .output-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .status-panel {
    width: 100%;
    max-width: 640px;
    background: rgba(0, 0, 0, 0.8); /* より濃い背景で視認性向上 */
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
    border: 2px solid rgba(255, 255, 255, 0.3); /* 境界線を追加 */
  }

  .status-message {
    color: #fff;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    font-weight: bold; /* 文字を太く */
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8); /* 影を追加 */
  }

  .progress-bar {
    width: 100%;
    height: 12px; /* バーを太く */
    background-color: rgba(255, 255, 255, 0.8); /* より濃い背景 */
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.5); /* 境界線を追加 */
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6b6b, #4ecdc4); /* より目立つ色 */
    transition: width 0.1s ease;
    box-shadow: 0 0 10px rgba(255, 107, 107, 0.5); /* 光る効果 */
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }

  .gallery {
    width: 100%;
    max-width: 640px;
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 8px;
  }

  .gallery h3 {
    color: #fff;
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .captured-images {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }

  .captured-image {
    width: 100%;
    height: auto;
    border-radius: 4px;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    .camera-container {
      padding: 0.5rem;
    }

    .camera-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .controls {
      flex-direction: column;
      width: 100%;
    }
  }
</style>
