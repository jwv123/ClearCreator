import { Injectable, signal, computed, inject } from '@angular/core';
import { CanvasWrapperService } from '../canvas/canvas-wrapper.service';

@Injectable({ providedIn: 'root' })
export class SelectionState {
  private canvasWrapper = inject(CanvasWrapperService);

  selectedIds = this.canvasWrapper.selectedObjectIds;
  selectedType = computed(() => {
    const ids = this.selectedIds();
    if (ids.length === 0) return 'none';
    if (ids.length > 1) return 'multiple';
    return this.canvasWrapper.selectedObjectType();
  });

  canGroup = computed(() => this.selectedIds().length > 1);
  canUngroup = computed(() => {
    const obj = this.canvasWrapper.getActiveObject();
    return obj?.type === 'group';
  });
}