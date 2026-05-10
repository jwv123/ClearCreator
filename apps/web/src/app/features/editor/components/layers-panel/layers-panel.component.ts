import { Component, inject, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CanvasWrapperService } from '../../canvas/canvas-wrapper.service';
import { SelectionState } from '../../state/selection.state';

interface LayerItem {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-layers-panel',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTooltipModule, NzEmptyModule, ScrollingModule],
  template: `
    <div class="layers-content">
      @if (layers().length === 0) {
        <nz-empty nzDescription="No elements" nzNotFoundImage="simple"></nz-empty>
      } @else {
        <cdk-virtual-scroll-viewport itemSize="36" class="layers-viewport">
          <div *cdkVirtualFor="let layer of layers(); let i = index"
               class="layer-item"
               [class.selected]="layer.selected"
               (click)="selectLayer(layer.id)">
            <span class="layer-icon" [ngSwitch]="layer.type">
              <span nz-icon nzType="font-size" *ngSwitchCase="'textbox'"></span>
              <span nz-icon nzType="border" *ngSwitchCase="'rect'"></span>
              <span nz-icon nzType="circle" *ngSwitchCase="'circle'"></span>
              <span nz-icon nzType="picture" *ngSwitchCase="'image'"></span>
              <span nz-icon nzType="appstore" *ngSwitchDefault></span>
            </span>
            <span class="layer-name" [title]="layer.name">{{ layer.name }}</span>
            <div class="layer-actions">
              <button nz-button nzType="text" nzSize="small" (click)="toggleVisibility(layer.id); $event.stopPropagation()" [nz-tooltip]="layer.visible ? 'Hide' : 'Show'">
                <span nz-icon [nzType]="layer.visible ? 'eye' : 'eye-invisible'"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" (click)="toggleLock(layer.id); $event.stopPropagation()" [nz-tooltip]="layer.locked ? 'Unlock' : 'Lock'">
                <span nz-icon [nzType]="layer.locked ? 'lock' : 'unlock'"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" (click)="moveUp(i); $event.stopPropagation()" nz-tooltip="Move Up" [disabled]="i === 0">
                <span nz-icon nzType="up"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" (click)="moveDown(i); $event.stopPropagation()" nz-tooltip="Move Down" [disabled]="i === layers().length - 1">
                <span nz-icon nzType="down"></span>
              </button>
            </div>
          </div>
        </cdk-virtual-scroll-viewport>
      }
    </div>
  `,
  styles: [`
    .layers-content { padding: 8px 0; height: 100%; display: flex; flex-direction: column; }
    .layers-viewport { flex: 1; }
    .layer-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.15s;
      height: 36px;
      box-sizing: border-box;
    }
    .layer-item:hover { background: #f5f5f5; }
    .layer-item.selected { background: #e6f7ff; border-left: 3px solid #1890ff; }
    .layer-icon { flex-shrink: 0; width: 20px; color: #666; }
    .layer-name { flex: 1; margin-left: 8px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .layer-actions { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
    .layer-actions button { padding: 0 4px; height: 24px; width: 24px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayersPanelComponent implements OnDestroy {
  private canvasWrapper = inject(CanvasWrapperService);
  private selectionState = inject(SelectionState);
  private destroy$ = new Subject<void>();

  layers = signal<LayerItem[]>([]);

  constructor() {
    // Subscribe to canvas events to refresh layer list
    this.canvasWrapper.onObjectAdded$.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshLayers());
    this.canvasWrapper.onObjectRemoved$.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshLayers());
    this.canvasWrapper.onSelectionChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshLayers());
    this.canvasWrapper.onObjectsReordered$.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshLayers());
    this.canvasWrapper.onObjectModified$.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshLayers());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshLayers(): void {
    const objects = this.canvasWrapper.getObjects();
    const selectedIds = this.selectionState.selectedIds();
    // Display in reverse order (top-most first)
    const layerItems: LayerItem[] = [];

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      const id = (obj as any).id || '';
      const type = obj.type || 'unknown';

      let name = type.charAt(0).toUpperCase() + type.slice(1);
      if (type === 'textbox' && 'text' in obj) {
        const text = (obj as any).text as string;
        name = text.length > 20 ? text.substring(0, 20) + '...' : text;
      }

      layerItems.push({
        id,
        type,
        name,
        visible: this.canvasWrapper.isElementVisible(id),
        locked: this.canvasWrapper.isElementLocked(id),
        selected: selectedIds.includes(id),
      });
    }

    this.layers.set(layerItems);
  }

  selectLayer(id: string): void {
    this.canvasWrapper.selectById(id);
  }

  toggleVisibility(id: string): void {
    this.canvasWrapper.toggleVisibility(id);
    this.refreshLayers();
  }

  toggleLock(id: string): void {
    if (this.canvasWrapper.isElementLocked(id)) {
      this.canvasWrapper.unlockElement(id);
    } else {
      this.canvasWrapper.lockElement(id);
    }
    this.refreshLayers();
  }

  moveUp(index: number): void {
    const layer = this.layers()[index];
    if (layer) {
      this.canvasWrapper.bringForward(layer.id);
      this.refreshLayers();
    }
  }

  moveDown(index: number): void {
    const layer = this.layers()[index];
    if (layer) {
      this.canvasWrapper.sendBackward(layer.id);
      this.refreshLayers();
    }
  }
}