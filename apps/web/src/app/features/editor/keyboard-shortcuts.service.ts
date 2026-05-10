import { Injectable, OnDestroy, inject } from '@angular/core';
import { CanvasWrapperService } from './canvas/canvas-wrapper.service';
import { HistoryState } from './state/history.state';

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService implements OnDestroy {
  private canvasWrapper = inject(CanvasWrapperService);
  private historyState = inject(HistoryState);

  private handler: ((e: KeyboardEvent) => void) | null = null;
  private active = false;

  private readonly NUDGE_SMALL = 1;
  private readonly NUDGE_LARGE = 10;

  activate(): void {
    if (this.active) return;
    this.active = true;
    this.handler = this.handleKeydown.bind(this);
    document.addEventListener('keydown', this.handler);
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    if (this.handler) {
      document.removeEventListener('keydown', this.handler);
      this.handler = null;
    }
  }

  ngOnDestroy(): void {
    this.deactivate();
  }

  private handleKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key;

    // Undo: Ctrl+Z
    if (ctrl && !shift && key === 'z') {
      e.preventDefault();
      this.historyState.undo();
      return;
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((ctrl && key === 'y') || (ctrl && shift && key === 'z')) {
      e.preventDefault();
      this.historyState.redo();
      return;
    }

    // Delete / Backspace
    if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      this.canvasWrapper.deleteSelected();
      return;
    }

    // Copy: Ctrl+C
    if (ctrl && !shift && key === 'c') {
      e.preventDefault();
      this.canvasWrapper.copySelected();
      return;
    }

    // Paste: Ctrl+V
    if (ctrl && !shift && key === 'v') {
      e.preventDefault();
      this.canvasWrapper.pasteClipboard();
      return;
    }

    // Group: Ctrl+G
    if (ctrl && !shift && key === 'g') {
      e.preventDefault();
      this.canvasWrapper.groupSelected();
      return;
    }

    // Ungroup: Ctrl+Shift+G
    if (ctrl && shift && key === 'g') {
      e.preventDefault();
      this.canvasWrapper.ungroupSelected();
      return;
    }

    // Select all: Ctrl+A
    if (ctrl && key === 'a') {
      e.preventDefault();
      this.canvasWrapper.selectAll();
      return;
    }

    // Arrow keys — nudge selected objects
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault();
      const step = shift ? this.NUDGE_LARGE : this.NUDGE_SMALL;
      switch (key) {
        case 'ArrowUp':
          this.canvasWrapper.nudgeSelected(0, -step);
          break;
        case 'ArrowDown':
          this.canvasWrapper.nudgeSelected(0, step);
          break;
        case 'ArrowLeft':
          this.canvasWrapper.nudgeSelected(-step, 0);
          break;
        case 'ArrowRight':
          this.canvasWrapper.nudgeSelected(step, 0);
          break;
      }
    }
  }
}