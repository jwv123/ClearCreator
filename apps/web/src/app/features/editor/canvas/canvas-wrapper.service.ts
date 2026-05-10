import { Injectable, signal, WritableSignal } from '@angular/core';
import { Canvas, FabricObject, FabricImage, Rect, Circle, Textbox, PencilBrush, type ImageFormat } from 'fabric';
import { Subject } from 'rxjs';

export interface ObjectModifiedEvent {
  id: string;
  type: string;
  changes: Record<string, unknown>;
}

export interface SelectionChangedEvent {
  selectedIds: string[];
  selectedType: string;
}

export interface ElementProperties {
  id: string;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  fill: string | undefined;
  stroke: string | undefined;
  strokeWidth: number;
  // Text-specific
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  // Shape-specific
  rx?: number;
  ry?: number;
  radius?: number;
}

@Injectable({ providedIn: 'root' })
export class CanvasWrapperService {
  private canvas!: Canvas;
  private initialized = false;

  // Reactive state
  selectedObjectIds: WritableSignal<string[]> = signal<string[]>([]);
  selectedObjectType: WritableSignal<string> = signal('none');

  // Observable streams
  onObjectModified$ = new Subject<ObjectModifiedEvent>();
  onObjectAdded$ = new Subject<{ id: string; type: string }>();
  onObjectRemoved$ = new Subject<{ id: string }>();
  onSelectionChanged$ = new Subject<SelectionChangedEvent>();
  onTextChanged$ = new Subject<{ id: string; text: string }>();
  onObjectsReordered$ = new Subject<void>();

  init(canvasEl: HTMLCanvasElement, width: number, height: number): Canvas {
    if (this.initialized) {
      this.dispose();
    }

    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    this.setupEventListeners();
    this.initialized = true;
    return this.canvas;
  }

  dispose(): void {
    if (!this.initialized) return;
    this.canvas.dispose();
    this.initialized = false;
  }

  private setupEventListeners(): void {
    this.canvas.on('selection:created', (e) => this.handleSelectionChange(e));
    this.canvas.on('selection:updated', (e) => this.handleSelectionChange(e));
    this.canvas.on('selection:cleared', () => {
      this.selectedObjectIds.set([]);
      this.selectedObjectType.set('none');
      this.onSelectionChanged$.next({ selectedIds: [], selectedType: 'none' });
    });

    this.canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (obj) {
        this.onObjectModified$.next({
          id: (obj as any).id || '',
          type: obj.type || '',
          changes: { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY, angle: obj.angle },
        });
      }
    });

    this.canvas.on('object:added', (e) => {
      const obj = e.target;
      if (obj) {
        this.onObjectAdded$.next({ id: (obj as any).id || '', type: obj.type || '' });
      }
    });

    this.canvas.on('object:removed', (e) => {
      const obj = e.target;
      if (obj) {
        this.onObjectRemoved$.next({ id: (obj as any).id || '' });
      }
    });

    this.canvas.on('text:changed', (e) => {
      const obj = e.target as Textbox;
      if (obj) {
        this.onTextChanged$.next({ id: (obj as any).id || '', text: obj.text || '' });
      }
    });
  }

  private handleSelectionChange(e: any): void {
    const selected = this.canvas.getActiveObjects();
    const ids = selected.map(obj => (obj as any).id || '');
    const types = selected.map(obj => obj.type || '');

    this.selectedObjectIds.set(ids);
    this.selectedObjectType.set(types.length === 1 ? types[0] : types.length > 1 ? 'multiple' : 'none');
    this.onSelectionChanged$.next({ selectedIds: ids, selectedType: types.length === 1 ? types[0] : 'multiple' });
  }

  // --- Element Operations ---

  addTextElement(text = 'Double-click to edit', fontFamily = 'Arial'): void {
    const textObj = new Textbox(text, {
      left: 100,
      top: 100,
      width: 300,
      fontSize: 24,
      fontFamily,
      fill: '#000000',
    });
    (textObj as any).id = crypto.randomUUID();
    this.canvas.add(textObj);
    this.canvas.setActiveObject(textObj);
    this.canvas.renderAll();
  }

  addRectElement(): void {
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 150,
      fill: '#4a90d9',
      stroke: '#2c5f8a',
      strokeWidth: 2,
    });
    (rect as any).id = crypto.randomUUID();
    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
  }

  addCircleElement(): void {
    const circle = new Circle({
      left: 150,
      top: 150,
      radius: 75,
      fill: '#e94560',
      stroke: '#c0392b',
      strokeWidth: 2,
    });
    (circle as any).id = crypto.randomUUID();
    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();
  }

  async addImageFromURL(url: string): Promise<void> {
    const img = await FabricImage.fromURL(url);
    const maxDim = Math.min(this.canvas.getWidth(), this.canvas.getHeight()) * 0.5;
    const scale = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1));
    img.set({
      left: 100,
      top: 100,
      scaleX: scale,
      scaleY: scale,
    });
    (img as any).id = crypto.randomUUID();
    this.canvas.add(img);
    this.canvas.setActiveObject(img);
    this.canvas.renderAll();
  }

  async addImageFromFile(file: File): Promise<void> {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        await this.addImageFromURL(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  removeElement(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      this.canvas.remove(obj);
      this.canvas.renderAll();
    }
  }

  updateElement(id: string, changes: Record<string, unknown>): void {
    const obj = this.getElementById(id);
    if (obj) {
      obj.set(changes);
      obj.setCoords();
      this.canvas.renderAll();
    }
  }

  private getElementById(id: string): FabricObject | undefined {
    return this.canvas.getObjects().find(obj => (obj as any).id === id);
  }

  // --- Selection ---

  getActiveObject(): FabricObject | undefined {
    return this.canvas.getActiveObject();
  }

  getActiveObjects(): FabricObject[] {
    return this.canvas.getActiveObjects();
  }

  deselectAll(): void {
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  selectById(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      this.canvas.setActiveObject(obj);
      this.canvas.renderAll();
    }
  }

  // --- Element Properties ---

  getObjects(): FabricObject[] {
    return this.canvas.getObjects();
  }

  getElementProperties(id: string): ElementProperties | null {
    const obj = this.getElementById(id);
    if (!obj) return null;

    const props: ElementProperties = {
      id,
      type: obj.type || 'unknown',
      left: obj.left ?? 0,
      top: obj.top ?? 0,
      width: obj.width ?? 0,
      height: obj.height ?? 0,
      scaleX: obj.scaleX ?? 1,
      scaleY: obj.scaleY ?? 1,
      angle: obj.angle ?? 0,
      opacity: obj.opacity ?? 1,
      visible: obj.visible !== false,
      locked: (obj as any).selectable === false,
      fill: typeof obj.fill === 'string' ? obj.fill : undefined,
      stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
      strokeWidth: obj.strokeWidth ?? 0,
    };

    if (obj instanceof Textbox) {
      props.text = obj.text;
      props.fontFamily = obj.fontFamily;
      props.fontSize = obj.fontSize;
      props.fontWeight = String(obj.fontWeight ?? 'normal');
      props.fontStyle = obj.fontStyle ?? 'normal';
      props.textAlign = obj.textAlign ?? 'left';
      props.lineHeight = obj.lineHeight ?? 1.3;
    }

    if (obj instanceof Rect) {
      props.rx = obj.rx ?? 0;
      props.ry = obj.ry ?? 0;
    }

    if (obj instanceof Circle) {
      props.radius = obj.radius ?? 0;
    }

    return props;
  }

  // --- Layer Ordering ---

  bringForward(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      this.canvas.bringObjectForward(obj);
      this.canvas.renderAll();
      this.onObjectsReordered$.next();
    }
  }

  sendBackward(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      this.canvas.sendObjectBackwards(obj);
      this.canvas.renderAll();
      this.onObjectsReordered$.next();
    }
  }

  bringToFront(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      this.canvas.bringObjectToFront(obj);
      this.canvas.renderAll();
      this.onObjectsReordered$.next();
    }
  }

  sendToBack(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      this.canvas.sendObjectToBack(obj);
      this.canvas.renderAll();
      this.onObjectsReordered$.next();
    }
  }

  // --- Visibility & Locking ---

  toggleVisibility(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      obj.set('visible', !obj.visible);
      this.canvas.renderAll();
    }
  }

  isElementVisible(id: string): boolean {
    const obj = this.getElementById(id);
    return obj ? obj.visible !== false : true;
  }

  lockElement(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      obj.set({ selectable: false, evented: false } as any);
      this.canvas.renderAll();
    }
  }

  unlockElement(id: string): void {
    const obj = this.getElementById(id);
    if (obj) {
      obj.set({ selectable: true, evented: true } as any);
      this.canvas.renderAll();
    }
  }

  isElementLocked(id: string): boolean {
    const obj = this.getElementById(id);
    return obj ? (obj as any).selectable === false : false;
  }

  // --- Duplicate ---

  duplicateElement(id: string): void {
    const obj = this.getElementById(id);
    if (!obj) return;

    obj.clone().then((cloned: FabricObject) => {
      (cloned as any).id = crypto.randomUUID();
      cloned.set({
        left: (obj.left ?? 0) + 20,
        top: (obj.top ?? 0) + 20,
      });
      this.canvas.add(cloned);
      this.canvas.setActiveObject(cloned);
      this.canvas.renderAll();
    });
  }

  // --- Group / Ungroup ---

  groupSelected(): void {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) return;

    // Check if it's already an ActiveSelection with multiple objects
    if (activeObject.type === 'activeselection') {
      const group = (activeObject as any).toGroup();
      (group as any).id = crypto.randomUUID();
      this.canvas.renderAll();
      this.canvas.setActiveObject(group);
    }
  }

  ungroupSelected(): void {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') return;

    const items = (activeObject as any).removeAll();
    this.canvas.remove(activeObject);

    for (const item of items) {
      (item as any).id = (item as any).id || crypto.randomUUID();
      this.canvas.add(item);
    }
    this.canvas.renderAll();
  }

  // --- Canvas Background ---

  setBackgroundColor(color: string): void {
    this.canvas.set('backgroundColor', color);
    this.canvas.renderAll();
  }

  getBackgroundColor(): string {
    return (this.canvas as any).backgroundColor as string || '#ffffff';
  }

  // --- Serialization ---

  toJSON(): object {
    return this.canvas.toJSON();
  }

  async loadFromJSON(json: object): Promise<void> {
    await this.canvas.loadFromJSON(json);
    this.canvas.renderAll();
  }

  // --- Export ---

  toDataURL(options: { format?: ImageFormat; quality?: number; multiplier?: number } = {}): string {
    return this.canvas.toDataURL({
      format: options.format || 'png',
      quality: options.quality || 1,
      multiplier: options.multiplier || 1,
    });
  }

  // --- History ---

  snapshot(): object {
    return this.canvas.toJSON();
  }

  async restoreSnapshot(snapshot: object): Promise<void> {
    await this.canvas.loadFromJSON(snapshot);
    this.canvas.renderAll();
  }

  // --- Zoom ---

  zoomIn(): void {
    const current = this.canvas.getZoom();
    this.canvas.setZoom(current * 1.1);
    this.canvas.renderAll();
  }

  zoomOut(): void {
    const current = this.canvas.getZoom();
    this.canvas.setZoom(current / 1.1);
    this.canvas.renderAll();
  }

  setZoom(level: number): void {
    this.canvas.setZoom(level);
    this.canvas.renderAll();
  }

  getZoom(): number {
    return this.canvas.getZoom();
  }

  fitToScreen(containerWidth?: number, containerHeight?: number): void {
    if (!containerWidth || !containerHeight) {
      this.canvas.setZoom(1);
      this.canvas.renderAll();
      return;
    }

    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    const padding = 40;
    const availWidth = containerWidth - padding * 2;
    const availHeight = containerHeight - padding * 2;

    const scale = Math.min(availWidth / canvasWidth, availHeight / canvasHeight, 1);
    this.canvas.setZoom(scale);

    // Center the canvas viewport
    const vpt = this.canvas.viewportTransform!;
    vpt[4] = (containerWidth - canvasWidth * scale) / 2;
    vpt[5] = (containerHeight - canvasHeight * scale) / 2;
    this.canvas.renderAll();
  }

  // --- Canvas dimensions ---

  setDimensions(width: number, height: number): void {
    this.canvas.setDimensions({ width, height });
    this.canvas.renderAll();
  }

  getCanvasWidth(): number {
    return this.canvas.getWidth();
  }

  getCanvasHeight(): number {
    return this.canvas.getHeight();
  }

  getCanvas(): Canvas {
    return this.canvas;
  }
}