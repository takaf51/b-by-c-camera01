<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { push } from 'svelte-spa-router';
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
  import {
    reportStore,
    isReportUploading,
    reportError,
    currentReportId,
    type CameraReportImage,
    type CameraFacePoints,
  } from '../stores/report';

  // ルートパラメータ
  export let params: { programId: string } = { programId: '' };

  // プログラムIDを取得
  $: programId = params.programId;

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
  let mirrorMode = true; // ミラー表示（デフォルト有効）

  // Store subscriptions
  $: uploading = $isReportUploading;
  $: uploadError = $reportError;
  $: reportId = $currentReportId;

  // レポート管理
  let faceLandmarks: any = null; // 最後に検出された顔の座標

  // 姿勢ガイダンス
  let poseGuidanceMessage = '';
  let poseGuidanceType = ''; // 'success', 'warning', 'error', ''
  let showPoseGuidance = false;
  let lastGuidanceUpdate = 0; // 最後にガイダンスを更新した時間
  let lastGuidanceMessage = ''; // 最後に表示したメッセージ
  const GUIDANCE_UPDATE_INTERVAL = 500; // ガイダンス更新間隔（ミリ秒）
  const GUIDANCE_DISPLAY_DURATION = 3000; // ガイダンス表示時間（ミリ秒）

  // 姿勢検知パラメータ
  let stablePosition = false;
  let stableStartTime: number | null = null;
  let progress = 0;
  const STABILITY_TIME = 0.5; // 安定時間（秒）
  const CAPTURE_COUNT = 1; // 撮影枚数：1枚のみ

  // 角度閾値（より緩い設定で顔検出しやすく）
  const THRESHOLDS = {
    roll: 15.0, // 左右の傾き（緩和）
    pitch: 20.0, // 上下の向き（緩和）
    yaw: 15.0, // 左右の向き（緩和）
  };

  // 自動撮影設定
  let faceDetected = false;
  let faceDetectionStartTime: number | null = null;
  const FACE_DETECTION_DELAY = 2.0; // 顔検出後の撮影待機時間（秒）
  let faceDetectionCount = 0; // 連続で顔が検出された回数
  const FACE_DETECTION_THRESHOLD = 3; // 安定して顔検出するのに必要なフレーム数

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

      // 顔の座標情報を保存（API送信用）
      faceLandmarks = landmarks;

      // 姿勢を計算
      const pose = calculatePose(landmarks);
      updateStability(pose);

      if (showMesh) {
        // Face meshを描画（PHP側と同じスタイル）
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
          color: '#C0C0C070',
          lineWidth: 1,
        });
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

      // 顔検出の安定性を確保
      faceDetectionCount++;

      // 十分な回数検出された場合のみ顔検出とみなす
      if (!faceDetected && faceDetectionCount >= FACE_DETECTION_THRESHOLD) {
        faceDetected = true;

        // 撮影モードの場合のみカウントダウン開始
        if (currentMode !== CaptureMode.IDLE) {
          faceDetectionStartTime = performance.now();
          statusMessage = '顔を検出しました。撮影準備中...';
        } else {
          // IDLEモードでは顔検出のみ（カウントダウンなし）
        }
      }

      // 自動撮影チェック
      if (
        currentMode !== CaptureMode.IDLE &&
        capturedImages.length < CAPTURE_COUNT
      ) {
        checkAutoCapture();
      }
    } else {
      // 顔が検出されない場合
      faceDetectionCount = 0; // カウンターリセット

      if (faceDetected) {
        faceDetected = false;
        faceDetectionStartTime = null;
      }

      stablePosition = false;
      stableStartTime = null;
      progress = 0;

      // IDLEモードとそれ以外で状態メッセージを分ける
      if (currentMode === CaptureMode.IDLE) {
        statusMessage = 'カメラに正面を向けてください';
      } else {
        statusMessage = 'カメラに顔を向けてください';
      }

      showPoseGuidance = false;
      lastGuidanceMessage = ''; // ガイダンスメッセージをリセット
    }

    // UI要素を描画（顔が検出されているかに関わらず表示）
    drawUIOverlays();

    canvasCtx.restore();
  }

  function drawUIOverlays() {
    // 顔フレームガイドを描画
    drawFaceGuideFrame();

    // グリッドラインを描画（三分割法）
    drawGridLines();
  }

  function drawFaceGuideFrame() {
    const centerX = canvasElement.width / 2;
    const centerY = canvasElement.height / 2;

    // 顔を収める楕円形フレーム
    const frameWidth =
      Math.min(canvasElement.width, canvasElement.height) * 0.5;
    const frameHeight = frameWidth * 1.2; // 楕円形（縦長）

    canvasCtx.strokeStyle = 'rgba(255, 105, 180, 0.8)'; // ピンク色
    canvasCtx.lineWidth = 3;
    canvasCtx.setLineDash([10, 5]); // 破線

    canvasCtx.beginPath();
    canvasCtx.ellipse(
      centerX,
      centerY,
      frameWidth / 2,
      frameHeight / 2,
      0,
      0,
      2 * Math.PI
    );
    canvasCtx.stroke();

    canvasCtx.setLineDash([]); // 破線をリセット
  }

  function drawGridLines() {
    const width = canvasElement.width;
    const height = canvasElement.height;

    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    canvasCtx.lineWidth = 1;

    // 縦線（三分割）
    canvasCtx.beginPath();
    canvasCtx.moveTo(width / 3, 0);
    canvasCtx.lineTo(width / 3, height);
    canvasCtx.stroke();

    canvasCtx.beginPath();
    canvasCtx.moveTo((width * 2) / 3, 0);
    canvasCtx.lineTo((width * 2) / 3, height);
    canvasCtx.stroke();

    // 横線（三分割）
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, height / 3);
    canvasCtx.lineTo(width, height / 3);
    canvasCtx.stroke();

    canvasCtx.beginPath();
    canvasCtx.moveTo(0, (height * 2) / 3);
    canvasCtx.lineTo(width, (height * 2) / 3);
    canvasCtx.stroke();
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

    // 姿勢ガイダンスメッセージの生成
    updatePoseGuidance(pose, isStable);

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

      // 顔検出の進行状況を表示
      if (
        faceDetected &&
        faceDetectionStartTime &&
        currentMode !== CaptureMode.IDLE
      ) {
        const elapsed = (performance.now() - faceDetectionStartTime) / 1000;
        const faceProgress = Math.min(elapsed / FACE_DETECTION_DELAY, 1) * 100;
        progress = faceProgress;

        if (elapsed >= FACE_DETECTION_DELAY) {
          statusMessage = '撮影準備完了';
        } else {
          const remaining = Math.ceil(FACE_DETECTION_DELAY - elapsed);
          statusMessage = `撮影まで ${remaining} 秒`;
        }
      }
    }
  }

  function updatePoseGuidance(pose: any, isStable: boolean) {
    const now = performance.now();

    // 撮影モードでない場合は姿勢ガイダンスを表示しない
    if (currentMode === CaptureMode.IDLE) {
      showPoseGuidance = false;
      return;
    }

    // ガイダンス更新頻度を制限
    if (now - lastGuidanceUpdate < GUIDANCE_UPDATE_INTERVAL) {
      return;
    }

    let newMessage = '';
    let newType = '';

    if (isStable) {
      newMessage = '完璧な姿勢です！';
      newType = 'success';
    } else {
      const issues = [];

      // Roll（左右の傾き）をチェック - 絶対値を使用
      if (Math.abs(pose.roll) >= THRESHOLDS.roll) {
        issues.push('顔をまっすぐに調整してください');
      }

      // Pitch（上下の向き）をチェック - 絶対値を使用
      if (Math.abs(pose.pitch) >= THRESHOLDS.pitch) {
        if (pose.pitch > 0) {
          issues.push('少し上を向いてください');
        } else {
          issues.push('少し下を向いてください');
        }
      }

      // Yaw（左右の向き）をチェック - 絶対値を使用
      if (Math.abs(pose.yaw) >= THRESHOLDS.yaw) {
        issues.push('正面を向いてください');
      }

      // 最も重要な問題を1つだけ表示
      if (issues.length > 0) {
        newMessage = issues[0];
        newType = 'warning';
      } else {
        newMessage = '良いポジションです！';
        newType = 'success';
      }
    }

    // メッセージが変わった場合のみ更新
    if (newMessage !== lastGuidanceMessage) {
      lastGuidanceUpdate = now;
      lastGuidanceMessage = newMessage;
      poseGuidanceMessage = newMessage;
      poseGuidanceType = newType;
      showPoseGuidance = true;

      // 一定時間後に非表示（成功メッセージの場合のみ）
      if (newType === 'success') {
        setTimeout(() => {
          if (
            poseGuidanceMessage === newMessage &&
            poseGuidanceType === 'success'
          ) {
            showPoseGuidance = false;
          }
        }, GUIDANCE_DISPLAY_DURATION);
      }
    }
  }

  function checkAutoCapture() {
    const now = performance.now();

    // 顔検出ベースの自動撮影
    if (
      faceDetected &&
      faceDetectionStartTime &&
      (now - faceDetectionStartTime) / 1000 >= FACE_DETECTION_DELAY
    ) {
      capturePhoto();
      // 次の撮影のために遅延を設ける
      faceDetectionStartTime = now + 2000; // 2秒後に次の撮影可能
      return;
    }

    // 安定位置ベースの自動撮影（バックアップ）
    if (
      stablePosition &&
      stableStartTime &&
      (now - stableStartTime) / 1000 >= STABILITY_TIME
    ) {
      capturePhoto();
      stableStartTime = now; // 次の撮影のためにリセット
    }
  }

  async function capturePhoto() {
    // 撮影時は元の向き（ミラーなし）でキャプチャ
    let imageData;

    if (mirrorMode) {
      // ミラーモードの場合、一時的にキャンバスを反転して撮影
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasElement.width;
      tempCanvas.height = canvasElement.height;
      const tempCtx = tempCanvas.getContext('2d')!;

      // 水平反転してキャンバスをコピー
      tempCtx.scale(-1, 1);
      tempCtx.drawImage(canvasElement, -tempCanvas.width, 0);

      imageData = tempCanvas.toDataURL('image/jpeg', 0.8);
    } else {
      // 通常モードの場合はそのまま
      imageData = canvasElement.toDataURL('image/jpeg', 0.8);
    }

    capturedImages = [...capturedImages, imageData];

    statusMessage = '撮影完了 - API送信中...';

    // APIに画像を送信
    try {
      await sendImageToAPI(
        imageData,
        currentMode === CaptureMode.BEFORE ? 'before' : 'after'
      );
      statusMessage = '撮影・送信完了！';
    } catch (error) {
      console.error('API送信エラー:', error);
      statusMessage = '撮影完了 - API送信失敗';
    }

    // 1枚撮影完了で即座にモード完了
    completeCaptureMode();
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
    statusMessage = 'ビフォー撮影開始';

    // ガイダンス状態をリセット
    showPoseGuidance = false;
    lastGuidanceMessage = '';
  }

  function startAfterCapture() {
    currentMode = CaptureMode.AFTER;
    capturedImages = [];
    statusMessage = 'アフター撮影開始';

    // ガイダンス状態をリセット
    showPoseGuidance = false;
    lastGuidanceMessage = '';
  }

  function toggleMesh() {
    showMesh = !showMesh;
  }

  function toggleMirror() {
    mirrorMode = !mirrorMode;
  }

  function goBack() {
    console.log('goBack: programId', programId);
    if (programId) {
      push(`/plan/detail/${programId}`);
    } else {
      push('/plan/list');
    }
  }

  /**
   * Store経由で画像を送信する関数
   * @param imageDataUrl - キャンバスから取得したbase64画像データ
   * @param kind - 'before' または 'after'
   */
  async function sendImageToAPI(
    imageDataUrl: string,
    kind: 'before' | 'after'
  ) {
    try {
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

      statusMessage = `${kind === 'before' ? 'ビフォー' : 'アフター'}画像送信完了`;
    } catch (error) {
      console.error('レポート送信失敗:', error);
      statusMessage = `送信エラー: ${error instanceof Error ? error.message : 'unknown error'}`;
      throw error;
    }
  }

  /**
   * MediaPipeの顔座標からAPI用の座標情報を抽出
   * @param landmarks - MediaPipeの顔座標データ
   */
  function extractFacePoints(landmarks: any): CameraFacePoints | null {
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
      console.error('座標抽出エラー:', error);
      return null;
    }
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
    <!-- 姿勢ガイダンスメッセージ -->
    {#if showPoseGuidance}
      <div class="pose-guidance">
        <div class="guidance-message {poseGuidanceType}">
          {poseGuidanceMessage}
        </div>
      </div>
    {/if}

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
        class="input-video {mirrorMode ? 'mirror' : ''}"
        autoplay
        playsinline
        muted
      ></video>
      <canvas
        bind:this={canvasElement}
        class="output-canvas {mirrorMode ? 'mirror' : ''}"
        width="1280"
        height="720"
      ></canvas>
    </div>

    <!-- ステータスパネル -->
    <div class="status-panel">
      <div class="status-message">{statusMessage}</div>

      {#if currentMode !== CaptureMode.IDLE && progress > 0}
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: {progress}%"></div>
          </div>
          <div class="progress-text">{Math.round(progress)}%</div>
        </div>
      {/if}

      {#if uploading}
        <div class="upload-indicator">
          <div class="spinner"></div>
          <span>API送信中...</span>
        </div>
      {/if}
      {#if reportId}
        <div class="report-info">
          レポートID: {reportId}
        </div>
      {/if}
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

      <Button variant="outline" on:click={toggleMirror}>
        {mirrorMode ? 'ミラー解除' : 'ミラー表示'}
      </Button>
    </div>

    <!-- 撮影結果ギャラリー -->
    {#if capturedImages.length > 0}
      <div class="gallery">
        <h3>撮影結果</h3>
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
    position: relative;
  }

  /* 姿勢ガイダンス */
  .pose-guidance {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    width: 100%;
    max-width: 600px;
    padding: 0 1rem;
  }

  .guidance-message {
    background: linear-gradient(
      135deg,
      rgba(255, 152, 0, 0.95),
      rgba(255, 111, 0, 0.95)
    );
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
    animation: messageSlideIn 0.3s ease-out;
  }

  .guidance-message.success {
    background: linear-gradient(
      135deg,
      rgba(76, 175, 80, 0.95),
      rgba(46, 125, 50, 0.95)
    ) !important;
  }

  .guidance-message.warning {
    background: linear-gradient(
      135deg,
      rgba(255, 152, 0, 0.95),
      rgba(255, 111, 0, 0.95)
    ) !important;
  }

  .guidance-message.error {
    background: linear-gradient(
      135deg,
      rgba(255, 107, 107, 0.95),
      rgba(255, 69, 58, 0.95)
    ) !important;
  }

  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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

  .input-video.mirror {
    transform: scaleX(-1);
  }

  .output-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .output-canvas.mirror {
    transform: scaleX(-1);
  }

  .status-panel {
    width: 100%;
    max-width: 640px;
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }

  .status-message {
    color: #fff;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .upload-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #ffa500;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 165, 0, 0.3);
    border-top: 2px solid #ffa500;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .report-info {
    color: #90ee90;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    text-align: center;
  }

  .progress-container {
    margin-top: 1rem;
    width: 100%;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #8bc34a);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    color: #fff;
    font-size: 0.9rem;
    text-align: center;
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
