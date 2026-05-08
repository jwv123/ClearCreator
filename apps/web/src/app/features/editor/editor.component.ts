import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { CanvasWrapperService } from './canvas/canvas-wrapper.service';
import { CanvasState } from './state/canvas.state';
import { SelectionState } from './state/selection.state';
import { HistoryState } from './state/history.state';
import { AiService } from '../../core/services/ai.service';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzLayoutModule,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    NzDropDownModule,
    NzMenuModule,
    NzInputModule,
    NzSpinModule,
    NzEmptyModule,
  ],
  template: `
    <nz-layout class="editor-layout">
      <!-- Top Bar -->
      <nz-header class="editor-topbar">
        <div class="topbar-left">
          <button nz-button nzType="text" (click)="goBack()">
            <span nz-icon nzType="arrow-left"></span>
          </button>
          <input nz-input [(ngModel)]="projectName" class="project-name-input" />
        </div>
        <div class="topbar-center">
          <div class="btn-group">
            <button nz-button nzType="default" nzSize="small" (click)="undo()" [disabled]="!canUndo()">
              <span nz-icon nzType="undo"></span>
            </button>
            <button nz-button nzType="default" nzSize="small" (click)="redo()" [disabled]="!canRedo()">
              <span nz-icon nzType="redo"></span>
            </button>
          </div>
          <span class="zoom-label">{{ zoomLevel() }}%</span>
          <div class="btn-group">
            <button nz-button nzType="default" nzSize="small" (click)="zoomOut()">
              <span nz-icon nzType="minus"></span>
            </button>
            <button nz-button nzType="default" nzSize="small" (click)="zoomIn()">
              <span nz-icon nzType="plus"></span>
            </button>
            <button nz-button nzType="default" nzSize="small" (click)="fitToScreen()">Fit</button>
          </div>
        </div>
        <div class="topbar-right">
          <button nz-button nzType="primary" (click)="showExportDialog()">Export</button>
        </div>
      </nz-header>

      <nz-layout>
        <!-- Sidebar -->
        <nz-sider class="editor-sidebar" nzWidth="280">
          <div class="sidebar-content">
            <h4>Tools</h4>
            <div class="tool-grid">
              <button nz-button nzType="default" class="tool-btn" (click)="addText()">
                <span nz-icon nzType="font-size"></span>
                <span>Text</span>
              </button>
              <button nz-button nzType="default" class="tool-btn" (click)="addRect()">
                <span nz-icon nzType="border"></span>
                <span>Rectangle</span>
              </button>
              <button nz-button nzType="default" class="tool-btn" (click)="addCircle()">
                <span nz-icon nzType="circle"></span>
                <span>Circle</span>
              </button>
              <button nz-button nzType="default" class="tool-btn" (click)="addImage()">
                <span nz-icon nzType="picture"></span>
                <span>Image</span>
              </button>
            </div>

            <h4>AI Generate</h4>
            <nz-input-group nzSearch [nzAddOnAfter]="searchBtn">
              <input nz-input placeholder="Describe your design..." [(ngModel)]="aiPrompt" (keydown.enter)="generateWithAI()" />
            </nz-input-group>
            <ng-template #searchBtn>
              <button nz-button nzType="primary" nzSize="small" (click)="generateWithAI()" [nzLoading]="isGenerating()">
                Generate
              </button>
            </ng-template>

            @if (isGenerating()) {
              <nz-spin nzSimple class="ai-spinner"></nz-spin>
            }
            @if (aiStreamingText()) {
              <div class="ai-streaming">{{ aiStreamingText() }}</div>
            }
          </div>
        </nz-sider>

        <!-- Canvas Area -->
        <nz-content class="editor-canvas-area">
          <div class="canvas-container" #canvasContainer>
            <canvas #canvasEl></canvas>
          </div>
        </nz-content>

        <!-- Properties Panel -->
        <nz-sider class="editor-properties" nzWidth="260" nzPlacement="right">
          <div class="properties-content">
            @if (selectedType() === 'none') {
              <nz-empty nzDescription="Select an element to edit"></nz-empty>
            } @else if (selectedType() === 'textbox') {
              <h4>Text Properties</h4>
              <!-- Text properties will be rendered here -->
            } @else if (selectedType() === 'image') {
              <h4>Image Properties</h4>
              <!-- Image properties will be rendered here -->
            } @else {
              <h4>Shape Properties</h4>
              <!-- Shape properties will be rendered here -->
            }
          </div>
        </nz-sider>
      </nz-layout>
    </nz-layout>
  `,
  styles: [`
    .editor-layout { height: 100vh; }
    .editor-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #fff; border-bottom: 1px solid #e8e8e8; }
    .topbar-left, .topbar-right { display: flex; align-items: center; gap: 8px; }
    .topbar-center { display: flex; align-items: center; gap: 8px; }
    .project-name-input { width: 200px; border: none; font-size: 16px; font-weight: 500; background: transparent; }
    .project-name-input:focus { outline: none; }
    .zoom-label { font-size: 12px; color: #666; min-width: 40px; text-align: center; }
    .btn-group { display: inline-flex; gap: 2px; }
    .editor-sidebar { background: #fafafa; border-right: 1px solid #e8e8e8; overflow-y: auto; }
    .sidebar-content { padding: 16px; }
    .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .tool-btn { display: flex; flex-direction: column; align-items: center; height: auto; padding: 12px 8px; }
    .ai-spinner { margin: 16px auto; display: block; }
    .ai-streaming { margin-top: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; max-height: 200px; overflow-y: auto; }
    .editor-canvas-area { display: flex; align-items: center; justify-content: center; background: #e8e8e8; overflow: hidden; }
    .canvas-container { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .editor-properties { background: #fafafa; border-left: 1px solid #e8e8e8; overflow-y: auto; }
    .properties-content { padding: 16px; }
  `],
})
export class EditorComponent implements OnInit, OnDestroy {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  private canvasWrapper = inject(CanvasWrapperService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private canvasState = inject(CanvasState);
  private selectionState = inject(SelectionState);
  private historyState = inject(HistoryState);
  private aiService = inject(AiService);

  projectName = signal('Untitled Project');
  aiPrompt = '';
  isGenerating = this.aiService.isGenerating;
  aiStreamingText = this.aiService.streamingText;
  zoomLevel = signal(100);
  selectedType = this.selectionState.selectedType;
  canUndo = this.historyState.canUndo;
  canRedo = this.historyState.canRedo;

  private projectId: string | null = null;

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id');
    // TODO: Load project from GraphQL if projectId !== 'new'
  }

  ngAfterViewInit() {
    if (this.canvasEl && this.canvasContainer) {
      this.canvasWrapper.init(
        this.canvasEl.nativeElement,
        this.canvasState.canvasWidth(),
        this.canvasState.canvasHeight()
      );
    }
  }

  ngOnDestroy() {
    this.canvasWrapper.dispose();
  }

  goBack() {
    this.router.navigate(['/']);
  }

  addText() {
    this.canvasWrapper.addTextElement('Double-click to edit');
  }

  addRect() {
    this.canvasWrapper.addRectElement();
  }

  addCircle() {
    this.canvasWrapper.addCircleElement();
  }

  addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) this.canvasWrapper.addImageFromFile(file);
    };
    input.click();
  }

  generateWithAI() {
    if (!this.aiPrompt.trim()) return;
    this.aiService.generateDesignStream(
      this.aiPrompt,
      this.canvasState.canvasWidth(),
      this.canvasState.canvasHeight()
    ).subscribe({
      next: (data: string) => {
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            if (parsed.elements) {
              this.canvasWrapper.loadFromJSON(parsed);
              this.aiPrompt = '';
            }
          } catch {}
        }
      },
      error: (err: unknown) => console.error('AI generation error:', err),
    });
  }

  showExportDialog() {
    // TODO: Show export dialog component
    const dataUrl = this.canvasWrapper.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = `${this.projectName()}.png`;
    link.href = dataUrl;
    link.click();
  }

  undo() { this.historyState.undo(); }
  redo() { this.historyState.redo(); }

  zoomIn() {
    const current = this.zoomLevel();
    this.zoomLevel.set(Math.min(current + 10, 300));
    this.canvasWrapper.setZoom(this.zoomLevel() / 100);
  }

  zoomOut() {
    const current = this.zoomLevel();
    this.zoomLevel.set(Math.max(current - 10, 25));
    this.canvasWrapper.setZoom(this.zoomLevel() / 100);
  }

  fitToScreen() {
    this.canvasWrapper.fitToScreen();
    this.zoomLevel.set(Math.round(this.canvasWrapper.getZoom() * 100));
  }
}