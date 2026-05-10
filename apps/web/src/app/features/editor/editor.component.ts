import { Component, OnInit, OnDestroy, inject, ViewChild, signal, effect } from '@angular/core';
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
import { AiState } from './state/ai.state';
import { FontService } from '../../core/services/font.service';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CanvasAreaComponent } from './components/canvas-area/canvas-area.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { LayersPanelComponent } from './components/layers-panel/layers-panel.component';
import { AiPanelComponent } from './components/ai-panel/ai-panel.component';
import { AssetsPanelComponent } from './components/assets-panel/assets-panel.component';
import { KeyboardShortcutsService } from './keyboard-shortcuts.service';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    CommonModule, NzLayoutModule, NzTabsModule,
    TopbarComponent, SidebarComponent, CanvasAreaComponent,
    PropertiesPanelComponent, LayersPanelComponent, AiPanelComponent, AssetsPanelComponent,
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
            (addText)="addText()"
            (addRect)="addRect()"
            (addCircle)="addCircle()"
            (addImage)="addImage()"
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
            <nz-tab nzTitle="AI">
              <app-ai-panel />
            </nz-tab>
            <nz-tab nzTitle="Assets">
              <app-assets-panel />
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
  private aiState = inject(AiState);
  private fontService = inject(FontService);
  private message = inject(NzMessageService);
  private keyboardShortcuts = inject(KeyboardShortcutsService);
  private destroy$ = new Subject<void>();

  projectName = signal('Untitled Project');
  zoomLevel = signal(100);
  rightPanelIndex = 0;
  canUndo = this.historyState.canUndo;
  canRedo = this.historyState.canRedo;

  private projectId: string | null = null;

  constructor() {
    effect(() => {
      if (this.aiState.isGenerating()) {
        this.rightPanelIndex = 2;
      }
    });
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    this.fontService.loadPopularFonts();
    this.keyboardShortcuts.activate();
  }

  ngAfterViewInit(): void {
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

    this.canvasWrapper.onTextChanged$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.historyState.push({
        json: this.canvasWrapper.snapshot(),
        timestamp: Date.now(),
      });
    });

    this.canvasWrapper.onObjectModified$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.zoomLevel.set(Math.round(this.canvasWrapper.getZoom() * 100));
    });
  }

  ngOnDestroy(): void {
    this.keyboardShortcuts.deactivate();
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
    this.rightPanelIndex = 3;
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