import { Injectable, signal, WritableSignal } from '@angular/core';
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

type ImageFormat = 'png' | 'jpeg';

@Injectable({ providedIn: 'root' })
export class CanvasWrapperService {
  private fabric: typeof import('fabric') | null = null;
  private canvas: import('fabric').Canvas | null = null;
  private initialized = false;

  /** Signal that becomes true once Fabric.js is loaded and the canvas is initialized */
  readonly isReady = signal(false);

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

  async init(canvasEl: HTMLCanvasElement, width: number, height: number): Promise<void> {
    if (this.initialized) {
      this.dispose();
    }

    this.fabric = await import('fabric');
    const { Canvas } = this.fabric;

    this.canvas = new Canvas(canvasEl, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    this.setupEventListeners();
    this.initialized = true;
    this.isReady.set(true);
  }

  dispose(): void {
    if (!this.initialized || !this.canvas) return;
    this.canvas.dispose();
    this.canvas = null;
    this.initialized = false;
    this.isReady.set(false);
  }

  private f(): typeof import('fabric') {
    if (!this.fabric) throw new Error('CanvasWrapperService: Fabric.js not loaded. Call init() first.');
    return this.fabric;
  }

  private c(): import('fabric').Canvas {
    if (!this.canvas) throw new Error('CanvasWrapperService: Canvas not initialized. Call init() first.');
    return this.canvas;
  }

  private setupEventListeners(): void {
    const canvas = this.c();
    const { Textbox } = this.f();

    canvas.on('selection:created', (e) => this.handleSelectionChange(e));
    canvas.on('selection:updated', (e) => this.handleSelectionChange(e));
    canvas.on('selection:cleared', () => {
      this.selectedObjectIds.set([]);
      this.selectedObjectType.set('none');
      this.onSelectionChanged$.next({ selectedIds: [], selectedType: 'none' });
    });

    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (obj) {
        this.onObjectModified$.next({
          id: (obj as any).id || '',
          type: obj.type || '',
          changes: { left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY, angle: obj.angle },
        });
      }
    });

    canvas.on('object:added', (e) => {
      const obj = e.target;
      if (obj) {
        this.onObjectAdded$.next({ id: (obj as any).id || '', type: obj.type || '' });
      }
    });

    canvas.on('object:removed', (e) => {
      const obj = e.target;
      if (obj) {
        this.onObjectRemoved$.next({ id: (obj as any).id || '' });
      }
    });

    canvas.on('text:changed', (e) => {
      const obj = e.target as InstanceType<typeof Textbox>;
      if (obj) {
        this.onTextChanged$.next({ id: (obj as any).id || '', text: obj.text || '' });
      }
    });
  }

  private handleSelectionChange(e: any): void {
    const canvas = this.c();
    const selected = canvas.getActiveObjects();
    const ids = selected.map(obj => (obj as any).id || '');
    const types = selected.map(obj => obj.type || '');

    this.selectedObjectIds.set(ids);
    this.selectedObjectType.set(types.length === 1 ? types[0] : types.length > 1 ? 'multiple' : 'none');
    this.onSelectionChanged$.next({ selectedIds: ids, selectedType: types.length === 1 ? types[0] : 'multiple' });
  }

  // --- Element Operations ---

  addTextElement(text = 'Double-click to edit', fontFamily = 'Arial'): void {
    const { Textbox } = this.f();
    const canvas = this.c();
    const textObj = new Textbox(text, {
      left: 100,
      top: 100,
      width: 300,
      fontSize: 24,
      fontFamily,
      fill: '#000000',
    });
    (textObj as any).id = crypto.randomUUID();
    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
  }

  addRectElement(): void {
    const { Rect } = this.f();
    const canvas = this.c();
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
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  }

  addCircleElement(): void {
    const { Circle } = this.f();
    const canvas = this.c();
    const circle = new Circle({
      left: 150,
      top: 150,
      radius: 75,
      fill: '#e94560',
      stroke: '#c0392b',
      strokeWidth: 2,
    });
    (circle as any).id = crypto.randomUUID();
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  }

  async addImageFromURL(url: string): Promise<void> {
    const { FabricImage } = this.f();
    const canvas = this.c();
    const img = await FabricImage.fromURL(url);
    const maxDim = Math.min(canvas.getWidth(), canvas.getHeight()) * 0.5;
    const scale = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1));
    img.set({
      left: 100,
      top: 100,
      scaleX: scale,
      scaleY: scale,
    });
    (img as any).id = crypto.randomUUID();
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
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
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      canvas.remove(obj);
      canvas.renderAll();
    }
  }

  updateElement(id: string, changes: Record<string, unknown>): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      obj.set(changes);
      obj.setCoords();
      canvas.renderAll();
    }
  }

  private getElementById(id: string): import('fabric').FabricObject | undefined {
    return this.c().getObjects().find(obj => (obj as any).id === id);
  }

  // --- Selection ---

  getActiveObject(): import('fabric').FabricObject | undefined {
    return this.c().getActiveObject();
  }

  getActiveObjects(): import('fabric').FabricObject[] {
    return this.c().getActiveObjects();
  }

  deselectAll(): void {
    const canvas = this.c();
    canvas.discardActiveObject();
    canvas.renderAll();
  }

  selectById(id: string): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      canvas.setActiveObject(obj);
      canvas.renderAll();
    }
  }

  // --- Element Properties ---

  getObjects(): import('fabric').FabricObject[] {
    return this.c().getObjects();
  }

  getElementProperties(id: string): ElementProperties | null {
    const obj = this.getElementById(id);
    if (!obj) return null;

    const { Textbox, Rect, Circle } = this.f();

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
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      canvas.bringObjectForward(obj);
      canvas.renderAll();
      this.onObjectsReordered$.next();
    }
  }

  sendBackward(id: string): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      canvas.sendObjectBackwards(obj);
      canvas.renderAll();
      this.onObjectsReordered$.next();
    }
  }

  bringToFront(id: string): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      canvas.bringObjectToFront(obj);
      canvas.renderAll();
      this.onObjectsReordered$.next();
    }
  }

  sendToBack(id: string): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      canvas.sendObjectToBack(obj);
      canvas.renderAll();
      this.onObjectsReordered$.next();
    }
  }

  // --- Visibility & Locking ---

  toggleVisibility(id: string): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      obj.set('visible', !obj.visible);
      canvas.renderAll();
    }
  }

  isElementVisible(id: string): boolean {
    const obj = this.getElementById(id);
    return obj ? obj.visible !== false : true;
  }

  lockElement(id: string): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      obj.set({ selectable: false, evented: false } as any);
      canvas.renderAll();
    }
  }

  unlockElement(id: string): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (obj) {
      obj.set({ selectable: true, evented: true } as any);
      canvas.renderAll();
    }
  }

  isElementLocked(id: string): boolean {
    const obj = this.getElementById(id);
    return obj ? (obj as any).selectable === false : false;
  }

  // --- Duplicate ---

  duplicateElement(id: string): void {
    const canvas = this.c();
    const obj = this.getElementById(id);
    if (!obj) return;

    obj.clone().then((cloned: import('fabric').FabricObject) => {
      (cloned as any).id = crypto.randomUUID();
      cloned.set({
        left: (obj.left ?? 0) + 20,
        top: (obj.top ?? 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  }

  // --- Group / Ungroup ---

  groupSelected(): void {
    const canvas = this.c();
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    if (activeObject.type === 'activeselection') {
      const group = (activeObject as any).toGroup();
      (group as any).id = crypto.randomUUID();
      canvas.renderAll();
      canvas.setActiveObject(group);
    }
  }

  ungroupSelected(): void {
    const canvas = this.c();
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') return;

    const items = (activeObject as any).removeAll();
    canvas.remove(activeObject);

    for (const item of items) {
      (item as any).id = (item as any).id || crypto.randomUUID();
      canvas.add(item);
    }
    canvas.renderAll();
  }

  // --- Canvas Background ---

  setBackgroundColor(color: string): void {
    const canvas = this.c();
    canvas.set('backgroundColor', color);
    canvas.renderAll();
  }

  getBackgroundColor(): string {
    return (this.c() as any).backgroundColor as string || '#ffffff';
  }

  // --- Serialization ---

  toJSON(): object {
    return this.c().toJSON();
  }

  async loadFromJSON(json: object): Promise<void> {
    const canvas = this.c();
    await canvas.loadFromJSON(json);
    canvas.renderAll();
  }

  // --- Export ---

  toDataURL(options: { format?: ImageFormat; quality?: number; multiplier?: number } = {}): string {
    return this.c().toDataURL({
      format: options.format || 'png',
      quality: options.quality || 1,
      multiplier: options.multiplier || 1,
    });
  }

  // --- History ---

  snapshot(): object {
    return this.c().toJSON();
  }

  async restoreSnapshot(snapshot: object): Promise<void> {
    const canvas = this.c();
    await canvas.loadFromJSON(snapshot);
    canvas.renderAll();
  }

  // --- Zoom ---

  zoomIn(): void {
    const canvas = this.c();
    const current = canvas.getZoom();
    canvas.setZoom(current * 1.1);
    canvas.renderAll();
  }

  zoomOut(): void {
    const canvas = this.c();
    const current = canvas.getZoom();
    canvas.setZoom(current / 1.1);
    canvas.renderAll();
  }

  setZoom(level: number): void {
    const canvas = this.c();
    canvas.setZoom(level);
    canvas.renderAll();
  }

  getZoom(): number {
    return this.c().getZoom();
  }

  fitToScreen(containerWidth?: number, containerHeight?: number): void {
    const canvas = this.c();
    if (!containerWidth || !containerHeight) {
      canvas.setZoom(1);
      canvas.renderAll();
      return;
    }

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const padding = 40;
    const availWidth = containerWidth - padding * 2;
    const availHeight = containerHeight - padding * 2;

    const scale = Math.min(availWidth / canvasWidth, availHeight / canvasHeight, 1);
    canvas.setZoom(scale);

    const vpt = canvas.viewportTransform!;
    vpt[4] = (containerWidth - canvasWidth * scale) / 2;
    vpt[5] = (containerHeight - canvasHeight * scale) / 2;
    canvas.renderAll();
  }

  // --- Bulk operations for keyboard shortcuts ---

  deleteSelected(): void {
    const canvas = this.c();
    const objects = canvas.getActiveObjects();
    if (objects.length === 0) return;
    canvas.discardActiveObject();
    objects.forEach(obj => canvas.remove(obj));
    canvas.renderAll();
  }

  selectAll(): void {
    const canvas = this.c();
    const { Canvas } = this.f();
    const objects = canvas.getObjects();
    if (objects.length === 0) return;
    const activeSelection = new (Canvas as any).ActiveSelection(objects, { canvas });
    canvas.setActiveObject(activeSelection);
    canvas.renderAll();
  }

  nudgeSelected(dx: number, dy: number): void {
    const canvas = this.c();
    const objects = canvas.getActiveObjects();
    if (objects.length === 0) return;
    objects.forEach(obj => {
      obj.set({
        left: (obj.left ?? 0) + dx,
        top: (obj.top ?? 0) + dy,
      });
      obj.setCoords();
    });
    canvas.renderAll();
    this.onObjectModified$.next({
      id: objects.length === 1 ? (objects[0] as any).id || '' : '',
      type: objects.length === 1 ? objects[0].type || '' : 'multiple',
      changes: {},
    });
  }

  // --- Clipboard ---

  private clipboard: object[] = [];

  copySelected(): void {
    const objects = this.c().getActiveObjects();
    if (objects.length === 0) return;
    this.clipboard = objects.map(obj => obj.toJSON());
  }

  async pasteClipboard(): Promise<void> {
    if (this.clipboard.length === 0) return;
    const { FabricObject, Canvas } = this.f();
    const canvas = this.c();
    const offset = 20;
    const newObjects: import('fabric').FabricObject[] = [];

    for (const json of this.clipboard) {
      const obj = await (FabricObject as any).fromObject(json, {});
      (obj as any).id = crypto.randomUUID();
      obj.set({
        left: (obj.left ?? 0) + offset,
        top: (obj.top ?? 0) + offset,
      });
      canvas.add(obj);
      newObjects.push(obj);
    }

    if (newObjects.length > 1) {
      const activeSelection = new (Canvas as any).ActiveSelection(newObjects, { canvas });
      canvas.setActiveObject(activeSelection);
    } else if (newObjects.length === 1) {
      canvas.setActiveObject(newObjects[0]);
    }

    canvas.renderAll();
  }

  // --- Canvas dimensions ---

  setDimensions(width: number, height: number): void {
    const canvas = this.c();
    canvas.setDimensions({ width, height });
    canvas.renderAll();
  }

  getCanvasWidth(): number {
    return this.c().getWidth();
  }

  getCanvasHeight(): number {
    return this.c().getHeight();
  }

  getCanvas(): import('fabric').Canvas {
    return this.c();
  }
}