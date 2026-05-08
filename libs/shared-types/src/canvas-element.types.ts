export type CanvasElementType = 'textbox' | 'rect' | 'circle' | 'triangle' | 'image' | 'line' | 'group';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  left: number;
  top: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  flipX?: boolean;
  flipY?: boolean;
  // Text-specific
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  charSpacing?: number;
  // Image-specific
  src?: string;
  uploadId?: string;
}

export interface CanvasSnapshot {
  version: string;
  objects: CanvasElement[];
  background: string;
  width: number;
  height: number;
}