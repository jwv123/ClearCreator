import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CanvasState {
  canvasJSON = signal<object | null>(null);
  canvasWidth = signal(1080);
  canvasHeight = signal(1080);
  canvasBackground = signal('#ffffff');
  projectId = signal<string | null>(null);
  projectName = signal('Untitled Project');
  isDirty = signal(false);
  saving = signal(false);
  isLoading = signal(true);
  lastSavedAt = signal<Date | null>(null);

  markDirty(): void {
    if (!this.isDirty()) {
      this.isDirty.set(true);
    }
  }

  markClean(): void {
    this.isDirty.set(false);
    this.lastSavedAt.set(new Date());
  }
}