declare module '@mediapipe/face_mesh/face_mesh' {
  export class FaceMesh {
    constructor(config: any);
    setOptions(options: any): void;
    onResults(callback: (results: any) => void): void;
    send(data: any): Promise<void>;
    close(): void;
  }
}

declare module '@mediapipe/camera_utils/camera_utils' {
  export class Camera {
    constructor(video: HTMLVideoElement, config: any);
    start(): Promise<void>;
    stop(): void;
  }
}

declare module '@mediapipe/drawing_utils/drawing_utils' {
  export function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: any,
    connections: any,
    style?: any
  ): void;
  
  export const FACEMESH_TESSELATION: any;
  export const FACEMESH_RIGHT_EYE: any;
  export const FACEMESH_LEFT_EYE: any;
  export const FACEMESH_FACE_OVAL: any;
  export const FACEMESH_LIPS: any;
}
