import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzSpinModule],
  template: `
    <div class="sidebar-content">
      <h4>Tools</h4>
      <div class="tool-grid">
        <button nz-button nzType="default" class="tool-btn" (click)="addText.emit()">
          <span nz-icon nzType="font-size"></span>
          <span>Text</span>
        </button>
        <button nz-button nzType="default" class="tool-btn" (click)="addRect.emit()">
          <span nz-icon nzType="border"></span>
          <span>Rectangle</span>
        </button>
        <button nz-button nzType="default" class="tool-btn" (click)="addCircle.emit()">
          <span nz-icon nzType="circle"></span>
          <span>Circle</span>
        </button>
        <button nz-button nzType="default" class="tool-btn" (click)="addImage.emit()">
          <span nz-icon nzType="picture"></span>
          <span>Image</span>
        </button>
      </div>

      <h4>AI Generate</h4>
      <nz-input-group nzSearch [nzAddOnAfter]="searchBtn">
        <input nz-input placeholder="Describe your design..." [(ngModel)]="aiPrompt" (keydown.enter)="generateAI.emit(aiPrompt); aiPrompt = ''" />
      </nz-input-group>
      <ng-template #searchBtn>
        <button nz-button nzType="primary" nzSize="small" (click)="generateAI.emit(aiPrompt); aiPrompt = ''" [nzLoading]="isGenerating">
          Generate
        </button>
      </ng-template>

      @if (isGenerating) {
        <nz-spin nzSimple class="ai-spinner"></nz-spin>
      }
      @if (streamingText) {
        <div class="ai-streaming">{{ streamingText }}</div>
      }
    </div>
  `,
  styles: [`
    .sidebar-content { padding: 16px; }
    .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .tool-btn { display: flex; flex-direction: column; align-items: center; height: auto; padding: 12px 8px; }
    .ai-spinner { margin: 16px auto; display: block; }
    .ai-streaming { margin-top: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; max-height: 200px; overflow-y: auto; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  @Input() isGenerating = false;
  @Input() streamingText = '';

  aiPrompt = '';

  @Output() addText = new EventEmitter<void>();
  @Output() addRect = new EventEmitter<void>();
  @Output() addCircle = new EventEmitter<void>();
  @Output() addImage = new EventEmitter<void>();
  @Output() generateAI = new EventEmitter<string>();
}