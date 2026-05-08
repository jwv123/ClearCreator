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

  addTextElement(text = 'Double-click to edit'): void {
    const textObj = new Textbox(text, {
      left: 100,
      top: 100,
      width: 300,
      fontSize: 24,
      fontFamily: 'Arial',
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

  fitToScreen(): void {
    // Reset zoom to 1 and center
    this.canvas.setZoom(1);
    this.canvas.renderAll();
  }

  // --- Canvas dimensions ---

  setDimensions(width: number, height: number): void {
    this.canvas.setDimensions({ width, height });
    this.canvas.renderAll();
  }

  getCanvas(): Canvas {
    return this.canvas;
  }
}