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
  /** Project canvas dimensions (e.g. 1080x1080) — separate from viewport dimensions */
  private projectWidth = 1080;
  private projectHeight = 1080;

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
  onZoomChanged$ = new Subject<number>();

  /** Cached container dimensions for fitToScreen when called without arguments */
  private lastContainerWidth = 0;
  private lastContainerHeight = 0;

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
    this.projectWidth = width;
    this.projectHeight = height;

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

  /** Temporarily restore project dimensions for serialization, then revert viewport size */
  private withProjectDimensions<T>(fn: () => T): T {
    const canvas = this.c();
    // Save current viewport dimensions
    const viewportWidth = canvas.getWidth();
    const viewportHeight = canvas.getHeight();
    const vpt = [...canvas.viewportTransform!];

    // Restore project dimensions for accurate serialization
    canvas.setDimensions({ width: this.projectWidth, height: this.projectHeight });
    canvas.setZoom(1);
    const vptIdentity = canvas.viewportTransform!;
    vptIdentity[4] = 0;
    vptIdentity[5] = 0;
    canvas.renderAll();

    try {
      return fn();
    } finally {
      // Restore viewport dimensions
      canvas.setDimensions({ width: viewportWidth, height: viewportHeight });
      canvas.setViewportTransform(vpt as any);
      canvas.renderAll();
    }
  }

  // --- Serialization ---

  toJSON(): object {
    return this.withProjectDimensions(() => this.c().toJSON());
  }

  async loadFromJSON(json: object): Promise<void> {
    const canvas = this.c();
    const fabricJson = this.toFabricJSON(json);

    // Update project dimensions if the design specifies canvas size
    const src = json as any;
    const dimWidth = src.canvasWidth || src.width;
    const dimHeight = src.canvasHeight || src.height;
    if (dimWidth && dimHeight) {
      this.projectWidth = dimWidth;
      this.projectHeight = dimHeight;
      canvas.setDimensions({ width: dimWidth, height: dimHeight });
    }

    await canvas.loadFromJSON(fabricJson);
    // Assign IDs to all loaded objects that don't have one
    for (const obj of canvas.getObjects()) {
      if (!(obj as any).id) {
        (obj as any).id = crypto.randomUUID();
      }
    }
    canvas.renderAll();
    // Re-fit viewport after loading new content
    this.fitToScreen();
  }

  /** Convert AI design format to Fabric.js serialization format */
  private toFabricJSON(design: any): object {
    // If it already looks like Fabric.js JSON (has 'version' field from toJSON()), pass through
    if (design.version) {
      return design;
    }

    const canvasW = design.canvasWidth || 1080;
    const canvasH = design.canvasHeight || 1080;
    const SAFE_MARGIN = 60;

    const elements: any[] = design.elements || [];
    const fabricObjects = elements.map((el: any) => {
      const obj: any = { ...el };

      // Normalize type names — Fabric.js v7 class registry uses lowercase names
      const typeMap: Record<string, string> = {
        'FabricImage': 'image', 'Image': 'image',
        'Textbox': 'textbox',
        'Rect': 'rect', 'Rectangle': 'rect',
        'Circle': 'circle', 'Ellipse': 'circle',
        'Triangle': 'triangle',
        'Line': 'line',
        'Group': 'group',
      };
      const normalized = typeMap[el.type];
      if (normalized) {
        obj.type = normalized;
      }

      // Circle geometry: AI uses width/height; Fabric uses radius
      if ((obj.type === 'circle' || el.type === 'circle') && el.width && !el.radius) {
        obj.radius = el.width / 2;
        delete obj.width;
        delete obj.height;
      }

      // Clamp element positions into the safe zone so nothing sits behind UI panels
      if (typeof obj.left === 'number' && obj.left < SAFE_MARGIN) {
        obj.left = SAFE_MARGIN;
      }
      if (typeof obj.top === 'number' && obj.top < SAFE_MARGIN) {
        obj.top = SAFE_MARGIN;
      }
      // Keep elements within right/bottom bounds
      const elWidth = obj.width || 0;
      const elHeight = obj.height || 0;
      if (typeof obj.left === 'number' && obj.left + elWidth > canvasW - SAFE_MARGIN) {
        obj.left = Math.max(SAFE_MARGIN, canvasW - SAFE_MARGIN - elWidth);
      }
      if (typeof obj.top === 'number' && obj.top + elHeight > canvasH - SAFE_MARGIN) {
        obj.top = Math.max(SAFE_MARGIN, canvasH - SAFE_MARGIN - elHeight);
      }

      // Ensure text elements have a minimum width for text wrapping
      if (obj.type === 'textbox' && (!obj.width || obj.width < 100)) {
        obj.width = Math.max(obj.width || 0, 200);
      }

      // Strip layout hint fields that are not Fabric.js properties
      delete obj.zone;
      delete obj.alignWith;

      return obj;
    });

    return {
      version: '7',
      objects: fabricObjects,
      background: design.backgroundColor || '#ffffff',
    };
  }

  // --- Export ---

  toDataURL(options: { format?: ImageFormat; quality?: number; multiplier?: number } = {}): string {
    return this.withProjectDimensions(() =>
      this.c().toDataURL({
        format: options.format || 'png',
        quality: options.quality || 1,
        multiplier: options.multiplier || 1,
      })
    );
  }

  // --- History ---

  snapshot(): object {
    return this.withProjectDimensions(() => this.c().toJSON());
  }

  async restoreSnapshot(snapshot: object): Promise<void> {
    const canvas = this.c();
    await canvas.loadFromJSON(snapshot);
    // Restore project dimensions from snapshot
    const snap = snapshot as any;
    if (snap.width) this.projectWidth = snap.width;
    if (snap.height) this.projectHeight = snap.height;
    canvas.renderAll();
    // Re-fit viewport after restoring
    this.fitToScreen();
  }

  // --- Zoom ---

  zoomIn(): void {
    const canvas = this.c();
    const current = canvas.getZoom();
    const newZoom = Math.min(current * 1.1, 5);
    const center = canvas.getVpCenter();
    canvas.zoomToPoint(center, newZoom);
    canvas.renderAll();
    this.onZoomChanged$.next(canvas.getZoom());
  }

  zoomOut(): void {
    const canvas = this.c();
    const current = canvas.getZoom();
    const newZoom = Math.max(current / 1.1, 0.1);
    const center = canvas.getVpCenter();
    canvas.zoomToPoint(center, newZoom);
    canvas.renderAll();
    this.onZoomChanged$.next(canvas.getZoom());
  }

  setZoom(level: number): void {
    const canvas = this.c();
    const clampedZoom = Math.max(0.1, Math.min(level, 5));
    const center = canvas.getVpCenter();
    canvas.zoomToPoint(center, clampedZoom);
    canvas.renderAll();
    this.onZoomChanged$.next(canvas.getZoom());
  }

  getZoom(): number {
    return this.c().getZoom();
  }

  fitToScreen(containerWidth?: number, containerHeight?: number): void {
    const canvas = this.c();

    // Use cached dimensions if not provided
    const cw = containerWidth || this.lastContainerWidth;
    const ch = containerHeight || this.lastContainerHeight;

    if (!cw || !ch) {
      canvas.setZoom(1);
      canvas.renderAll();
      this.onZoomChanged$.next(canvas.getZoom());
      return;
    }

    // Cache for future calls without arguments
    this.lastContainerWidth = cw;
    this.lastContainerHeight = ch;

    // Project (logical) canvas dimensions — e.g. 1080x1080
    const projectWidth = this.projectWidth;
    const projectHeight = this.projectHeight;

    const padding = 40;
    const availWidth = cw - padding * 2;
    const availHeight = ch - padding * 2;

    const scale = Math.min(availWidth / projectWidth, availHeight / projectHeight, 1);

    // Resize the canvas DOM element to fit the container so it doesn't overflow
    canvas.setDimensions({ width: cw, height: ch });
    canvas.setZoom(scale);

    // Center the project content within the viewport
    const vpt = canvas.viewportTransform!;
    vpt[4] = (cw - projectWidth * scale) / 2;
    vpt[5] = (ch - projectHeight * scale) / 2;
    canvas.renderAll();
    this.onZoomChanged$.next(canvas.getZoom());
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
    this.projectWidth = width;
    this.projectHeight = height;
    canvas.setDimensions({ width, height });
    // Re-fit viewport after dimension change
    this.fitToScreen();
  }

  getCanvasWidth(): number {
    return this.projectWidth;
  }

  getCanvasHeight(): number {
    return this.projectHeight;
  }

  getCanvas(): import('fabric').Canvas {
    return this.c();
  }
}