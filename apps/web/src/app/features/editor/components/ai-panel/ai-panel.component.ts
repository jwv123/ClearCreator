import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { AiState } from '../../state/ai.state';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzInputModule, NzSelectModule, NzSpinModule,
    NzTagModule, NzAlertModule, NzIconModule, NzDividerModule,
  ],
  template: `
    <div class="ai-panel">
      <h4>AI Design</h4>

      <!-- Model Selector -->
      <div class="prop-group">
        <label>Model</label>
        <nz-select
          [ngModel]="aiState.selectedModel()"
          (ngModelChange)="aiState.setModel($event)"
          nzSize="small"
          class="full-width"
          nzPlaceHolder="Select model"
        >
          @for (model of aiState.models(); track model.name) {
            <nz-option [nzValue]="model.name" [nzLabel]="model.name"></nz-option>
          }
        </nz-select>
      </div>

      <!-- Prompt Input -->
      <div class="prop-group">
        <label>Prompt</label>
        <textarea
          nz-input
          [(ngModel)]="prompt"
          placeholder="Describe your design..."
          [rows]="3"
          class="prompt-input"
        ></textarea>
      </div>

      <!-- Generate / Cancel buttons -->
      <div class="action-row">
        <button
          nz-button
          nzType="primary"
          nzBlock
          (click)="generate()"
          [nzLoading]="aiState.isGenerating()"
          [disabled]="!prompt.trim() || aiState.isGenerating()"
        >
          <span nz-icon nzType="thunderbolt" nzTheme="outline"></span>
          Generate
        </button>
        @if (aiState.isGenerating()) {
          <button nz-button nzType="default" nzBlock (click)="cancel()" class="cancel-btn">
            Cancel
          </button>
        }
      </div>

      <!-- Status indicators -->
      @if (aiState.generationStatus() === 'streaming') {
        <div class="status-row">
          <nz-spin nzSimple nzSize="small"></nz-spin>
          <span>Generating design...</span>
        </div>
      }
      @if (aiState.generationStatus() === 'completed') {
        <div class="status-row">
          <nz-tag nzColor="success">Design ready</nz-tag>
        </div>
      }
      @if (aiState.generationStatus() === 'failed') {
        <div class="status-row">
          <nz-tag nzColor="error">Generation failed</nz-tag>
        </div>
      }

      <!-- Streaming text preview -->
      @if (aiState.streamingText()) {
        <div class="streaming-preview">{{ aiState.streamingText() }}</div>
      }

      <!-- Apply to Canvas button -->
      @if (aiState.generationStatus() === 'completed' && aiState.lastDesign()) {
        <button nz-button nzType="primary" nzBlock (click)="applyDesign()" class="apply-btn">
          <span nz-icon nzType="check" nzTheme="outline"></span>
          Apply to Canvas
        </button>
        <button nz-button nzType="default" nzBlock (click)="aiState.resetGeneration()" class="discard-btn">
          Discard
        </button>
      }

      <!-- Error alert -->
      @if (aiState.lastError()) {
        <nz-alert
          nzType="error"
          [nzMessage]="aiState.lastError()!"
          nzCloseable
          (nzOnClose)="aiState.clearError()"
          class="error-alert"
        ></nz-alert>
      }

      <!-- Modify Selected section -->
      @if (aiState.selectedContext().length > 0) {
        <nz-divider></nz-divider>
        <h4>Modify Selected</h4>
        <p class="modify-hint">{{ aiState.selectedContext().length }} element(s) selected</p>
        <textarea
          nz-input
          [(ngModel)]="modifyInstruction"
          placeholder="e.g. Change fill to red, make it bigger..."
          [rows]="2"
          class="prompt-input"
        ></textarea>
        <button
          nz-button
          nzSize="small"
          nzType="primary"
          (click)="modifySelected()"
          [nzLoading]="aiState.isGenerating()"
          [disabled]="!modifyInstruction.trim() || aiState.isGenerating()"
          class="modify-btn"
        >
          Modify
        </button>
      }

      <!-- Generation History -->
      @if (aiState.generationHistory().length > 0) {
        <nz-divider></nz-divider>
        <h4>History</h4>
        <div class="history-list">
          @for (record of aiState.generationHistory(); track record.timestamp) {
            <div class="history-item" (click)="reusePrompt(record.prompt)">
              <span class="history-prompt">{{ record.prompt }}</span>
              <nz-tag [nzColor]="record.status === 'completed' ? 'success' : 'error'" nzSize="small">
                {{ record.status }}
              </nz-tag>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ai-panel { padding: 12px; }
    .ai-panel h4 { margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333; }

    .prop-group { margin-bottom: 12px; }
    .prop-group label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .full-width { width: 100%; }

    .prompt-input { font-size: 13px; resize: vertical; }

    .action-row { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
    .cancel-btn { margin-top: 4px; }

    .status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; color: #666; }

    .streaming-preview {
      margin-bottom: 12px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 12px;
      max-height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: monospace;
    }

    .apply-btn { margin-bottom: 8px; }
    .discard-btn { margin-bottom: 12px; }

    .error-alert { margin-bottom: 12px; }

    .modify-hint { font-size: 12px; color: #888; margin: 0 0 8px 0; }
    .modify-btn { margin-top: 8px; margin-bottom: 12px; }

    .history-list { max-height: 200px; overflow-y: auto; }
    .history-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 8px; cursor: pointer; border-radius: 4px; margin-bottom: 4px;
      font-size: 12px; transition: background 0.2s;
    }
    .history-item:hover { background: #e6f7ff; }
    .history-prompt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiPanelComponent {
  aiState = inject(AiState);
  prompt = '';
  modifyInstruction = '';

  generate(): void {
    if (!this.prompt.trim()) return;
    this.aiState.generateDesignStream(this.prompt);
    this.prompt = '';
  }

  applyDesign(): void {
    this.aiState.applyDesignToCanvas();
  }

  cancel(): void {
    this.aiState.cancelGeneration();
  }

  modifySelected(): void {
    if (!this.modifyInstruction.trim()) return;
    this.aiState.modifySelectedElements(this.modifyInstruction);
    this.modifyInstruction = '';
  }

  reusePrompt(prompt: string): void {
    this.prompt = prompt;
  }
}