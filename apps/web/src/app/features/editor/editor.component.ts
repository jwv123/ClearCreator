import { Component, OnInit, OnDestroy, inject, ViewChild, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CanvasWrapperService } from './canvas/canvas-wrapper.service';
import { CanvasState } from './state/canvas.state';
import { SelectionState } from './state/selection.state';
import { HistoryState } from './state/history.state';
import { AiService } from '../../core/services/ai.service';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CanvasAreaComponent } from './components/canvas-area/canvas-area.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { LayersPanelComponent } from './components/layers-panel/layers-panel.component';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    CommonModule, NzLayoutModule, NzTabsModule,
    TopbarComponent, SidebarComponent, CanvasAreaComponent, PropertiesPanelComponent, LayersPanelComponent,
  ],
  template: `
    <nz-layout class="editor-layout">
      <app-topbar
        [projectName]="projectName()"
        [canUndo]="canUndo()"
        [canRedo]="canRedo()"
        [zoomLevel]="zoomLevel()"
        (projectNameChange)="projectName.set($event)"
        (goBack)="goBack()"
        (undo)="undo()"
        (redo)="redo()"
        (zoomIn)="zoomIn()"
        (zoomOut)="zoomOut()"
        (fitToScreen)="fitToScreen()"
        (export)="showExportDialog()"
      />

      <nz-layout>
        <nz-sider class="editor-sidebar" nzWidth="280">
          <app-sidebar
            [isGenerating]="isGenerating()"
            [streamingText]="aiStreamingText()"
            (addText)="addText()"
            (addRect)="addRect()"
            (addCircle)="addCircle()"
            (addImage)="addImage()"
            (generateAI)="generateWithAI($event)"
          />
        </nz-sider>

        <nz-content class="editor-canvas-area">
          <app-canvas-area />
        </nz-content>

        <nz-sider class="editor-right-panel" nzWidth="280" nzPlacement="right">
          <nz-tabs [(nzSelectedIndex)]="rightPanelIndex" nzSize="small" [nzAnimated]="false">
            <nz-tab nzTitle="Properties">
              <app-properties-panel />
            </nz-tab>
            <nz-tab nzTitle="Layers">
              <app-layers-panel />
            </nz-tab>
          </nz-tabs>
        </nz-sider>
      </nz-layout>
    </nz-layout>
  `,
  styles: [`
    .editor-layout { height: 100vh; }
    .editor-sidebar { background: #fafafa; border-right: 1px solid #e8e8e8; overflow-y: auto; }
    .editor-canvas-area { flex: 1; display: flex; overflow: hidden; }
    .editor-right-panel { background: #fafafa; border-left: 1px solid #e8e8e8; overflow-y: auto; }
    .editor-right-panel ::ng-deep .ant-tabs { height: 100%; }
    .editor-right-panel ::ng-deep .ant-tabs-content { height: calc(100% - 46px); overflow-y: auto; }
  `],
})
export class EditorComponent implements OnInit, OnDestroy {
  private canvasWrapper = inject(CanvasWrapperService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private canvasState = inject(CanvasState);
  private selectionState = inject(SelectionState);
  private historyState = inject(HistoryState);
  private aiService = inject(AiService);
  private message = inject(NzMessageService);
  private destroy$ = new Subject<void>();

  projectName = signal('Untitled Project');
  zoomLevel = signal(100);
  rightPanelIndex = 0;
  isGenerating = this.aiService.isGenerating;
  aiStreamingText = this.aiService.streamingText;
  canUndo = this.historyState.canUndo;
  canRedo = this.historyState.canRedo;

  private projectId: string | null = null;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    // TODO: Load project from GraphQL if projectId !== 'new'
  }

  ngAfterViewInit(): void {
    // Wire up history recording — push snapshot on canvas changes
    this.canvasWrapper.onObjectAdded$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.historyState.push({
        json: this.canvasWrapper.snapshot(),
        timestamp: Date.now(),
      });
    });

    this.canvasWrapper.onObjectRemoved$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.historyState.push({
        json: this.canvasWrapper.snapshot(),
        timestamp: Date.now(),
      });
    });

    this.canvasWrapper.onObjectModified$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.historyState.push({
        json: this.canvasWrapper.snapshot(),
        timestamp: Date.now(),
      });
    });

    // Debounce text changes to avoid pushing on every keystroke
    this.canvasWrapper.onTextChanged$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.historyState.push({
        json: this.canvasWrapper.snapshot(),
        timestamp: Date.now(),
      });
    });

    // Sync zoom level from canvas wrapper
    this.canvasWrapper.onObjectModified$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.zoomLevel.set(Math.round(this.canvasWrapper.getZoom() * 100));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  addText(): void {
    this.canvasWrapper.addTextElement();
  }

  addRect(): void {
    this.canvasWrapper.addRectElement();
  }

  addCircle(): void {
    this.canvasWrapper.addCircleElement();
  }

  addImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) this.canvasWrapper.addImageFromFile(file);
    };
    input.click();
  }

  generateWithAI(prompt: string): void {
    if (!prompt.trim()) return;
    this.aiService.generateDesignStream(
      prompt,
      this.canvasState.canvasWidth(),
      this.canvasState.canvasHeight(),
    ).subscribe({
      next: (data: string) => {
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            if (parsed.elements) {
              this.canvasWrapper.loadFromJSON(parsed);
            }
          } catch {
            // Streaming chunk, not yet valid JSON
          }
        }
      },
      error: (err: unknown) => {
        this.message.error('AI generation failed');
        console.error('AI generation error:', err);
      },
    });
  }

  undo(): void {
    this.historyState.undo();
  }

  redo(): void {
    this.historyState.redo();
  }

  zoomIn(): void {
    const current = this.zoomLevel();
    this.zoomLevel.set(Math.min(current + 10, 300));
    this.canvasWrapper.setZoom(this.zoomLevel() / 100);
  }

  zoomOut(): void {
    const current = this.zoomLevel();
    this.zoomLevel.set(Math.max(current - 10, 25));
    this.canvasWrapper.setZoom(this.zoomLevel() / 100);
  }

  fitToScreen(): void {
    this.canvasWrapper.fitToScreen();
    this.zoomLevel.set(Math.round(this.canvasWrapper.getZoom() * 100));
  }

  showExportDialog(): void {
    const dataUrl = this.canvasWrapper.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = `${this.projectName()}.png`;
    link.href = dataUrl;
    link.click();
  }
}