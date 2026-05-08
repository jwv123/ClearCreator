import { Injectable, signal, inject } from '@angular/core';
import { CanvasWrapperService } from '../canvas/canvas-wrapper.service';

export interface CanvasSnapshot {
  json: object;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class HistoryState {
  private canvasWrapper = inject(CanvasWrapperService);

  private undoStack: CanvasSnapshot[] = [];
  private redoStack: CanvasSnapshot[] = [];
  private maxHistorySize = 50;

  canUndo = signal(false);
  canRedo = signal(false);

  push(snapshot: CanvasSnapshot): void {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateSignals();
  }

  undo(): CanvasSnapshot | null {
    if (this.undoStack.length === 0) return null;
    const snapshot = this.undoStack.pop()!;
    const currentSnapshot: CanvasSnapshot = {
      json: this.canvasWrapper.snapshot(),
      timestamp: Date.now(),
    };
    this.redoStack.push(currentSnapshot);
    this.canvasWrapper.restoreSnapshot(snapshot.json);
    this.updateSignals();
    return snapshot;
  }

  redo(): CanvasSnapshot | null {
    if (this.redoStack.length === 0) return null;
    const snapshot = this.redoStack.pop()!;
    const currentSnapshot: CanvasSnapshot = {
      json: this.canvasWrapper.snapshot(),
      timestamp: Date.now(),
    };
    this.undoStack.push(currentSnapshot);
    this.canvasWrapper.restoreSnapshot(snapshot.json);
    this.updateSignals();
    return snapshot;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.updateSignals();
  }

  private updateSignals(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }
}