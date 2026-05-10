import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NzModalModule, NzModalRef } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CanvasWrapperService } from '../../canvas/canvas-wrapper.service';
import { AuthService } from '../../../../core/services/auth.service';
import { type ImageFormat } from 'fabric';

export type ExportFormat = 'png' | 'jpeg' | 'pdf';

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzModalModule, NzRadioModule, NzSliderModule,
    NzButtonModule, NzSelectModule,
    NzDividerModule, NzIconModule,
  ],
  template: `
    <div class="export-dialog">
      <div class="export-section">
        <label class="export-label">Format</label>
        <nz-radio-group [(ngModel)]="format" nzButtonStyle="solid">
          <label nz-radio-button nzValue="png">PNG</label>
          <label nz-radio-button nzValue="jpeg">JPG</label>
          <label nz-radio-button nzValue="pdf">PDF</label>
        </nz-radio-group>
      </div>

      <nz-divider />

      <div class="export-section">
        <label class="export-label">Resolution</label>
        <nz-radio-group [(ngModel)]="multiplier" nzButtonStyle="solid">
          <label nz-radio-button [nzValue]="1">1x</label>
          <label nz-radio-button [nzValue]="2">2x</label>
          <label nz-radio-button [nzValue]="3">3x</label>
          <label nz-radio-button [nzValue]="4">4x</label>
        </nz-radio-group>
        <span class="export-dimensions">{{ exportWidth() }} &times; {{ exportHeight() }} px</span>
      </div>

      @if (showQuality()) {
        <div class="export-section">
          <label class="export-label">Quality</label>
          <nz-slider
            [(ngModel)]="quality"
            [nzMin]="0.1"
            [nzMax]="1"
            [nzStep]="0.01"
            [nzMarks]="qualityMarks"
          />
        </div>
      }

      @if (showPdfOptions()) {
        <div class="export-section">
          <label class="export-label">Page Size</label>
          <nz-select [(ngModel)]="pdfPageSize" nzStyle="width: 120px">
            <nz-option nzValue="a4" nzLabel="A4" />
            <nz-option nzValue="letter" nzLabel="Letter" />
          </nz-select>
        </div>
        <div class="export-section">
          <label class="export-label">Orientation</label>
          <nz-radio-group [(ngModel)]="pdfOrientation" nzButtonStyle="solid">
            <label nz-radio-button nzValue="portrait">Portrait</label>
            <label nz-radio-button nzValue="landscape">Landscape</label>
          </nz-radio-group>
        </div>
      }

      <nz-divider />

      <div class="export-actions">
        <button nz-button (click)="modal.close()">Cancel</button>
        <button nz-button nzType="primary" (click)="export()" [nzLoading]="isExporting()">
          <span nz-icon nzType="download"></span>
          Export
        </button>
      </div>
    </div>
  `,
  styles: [`
    .export-dialog { padding: 8px 0; }
    .export-section { margin-bottom: 16px; }
    .export-label { display: block; font-weight: 500; margin-bottom: 8px; color: #333; }
    .export-dimensions { margin-left: 12px; color: #888; font-size: 12px; }
    .export-actions { display: flex; justify-content: flex-end; gap: 8px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportDialogComponent {
  private canvasWrapper = inject(CanvasWrapperService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);

  modal = inject(NzModalRef);

  format = signal<ExportFormat>('png');
  quality = signal(0.92);
  multiplier = signal(2);
  pdfPageSize = signal<'a4' | 'letter'>('a4');
  pdfOrientation = signal<'portrait' | 'landscape'>('portrait');
  isExporting = signal(false);

  showQuality = computed(() => this.format() === 'jpeg');
  showPdfOptions = computed(() => this.format() === 'pdf');

  exportWidth = computed(() => this.canvasWrapper.getCanvasWidth() * this.multiplier());
  exportHeight = computed(() => this.canvasWrapper.getCanvasHeight() * this.multiplier());

  qualityMarks: Record<number, string> = { 0.1: '10%', 0.5: '50%', 0.92: '92%', 1: '100%' };

  export(): void {
    if (this.format() === 'pdf') {
      this.exportPdf();
    } else {
      this.exportImage();
    }
  }

  private exportImage(): void {
    const fmt = this.format() as 'png' | 'jpeg';
    const dataUrl = this.canvasWrapper.toDataURL({
      format: fmt as ImageFormat,
      quality: this.quality(),
      multiplier: this.multiplier(),
    });
    const link = document.createElement('a');
    link.download = `design.${fmt === 'jpeg' ? 'jpg' : 'png'}`;
    link.href = dataUrl;
    link.click();
    this.modal.close();
  }

  private exportPdf(): void {
    this.isExporting.set(true);
    const imageDataUrl = this.canvasWrapper.toDataURL({
      format: 'png',
      multiplier: this.multiplier(),
    });
    const token = this.authService.currentToken();

    this.http.post('/api/export/pdf', {
      imageDataUrl,
      canvasWidth: this.canvasWrapper.getCanvasWidth(),
      canvasHeight: this.canvasWrapper.getCanvasHeight(),
      backgroundColor: this.canvasWrapper.getBackgroundColor(),
      pageSize: this.pdfPageSize(),
      orientation: this.pdfOrientation(),
      multiplier: this.multiplier(),
    }, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'design.pdf';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.modal.close();
      },
      error: (err) => {
        console.error('PDF export failed:', err);
        this.message.error('PDF export failed. Please try again.');
        this.isExporting.set(false);
      },
    });
  }
}