import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { UploadService, Upload } from '../../../../core/services/upload.service';
import { CanvasState } from '../../state/canvas.state';
import { CanvasWrapperService } from '../../canvas/canvas-wrapper.service';

@Component({
  selector: 'app-assets-panel',
  standalone: true,
  imports: [
    CommonModule, NzButtonModule, NzIconModule, NzSpinModule,
    NzEmptyModule, NzAlertModule, NzPopconfirmModule,
  ],
  template: `
    <div class="assets-content">
      <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileSelected($event)" />

      <div class="assets-header">
        <span class="assets-title">Assets</span>
        <button nz-button nzType="primary" nzSize="small" (click)="triggerUpload()" [nzLoading]="isUploading()">
          <span nz-icon nzType="upload"></span> Upload
        </button>
      </div>

      @if (uploadError()) {
        <nz-alert nzType="error" [nzMessage]="uploadError()!" nzCloseable (nzOnClose)="clearError()" />
      }

      @if (isUploading()) {
        <div class="assets-loading">
          <nz-spin nzSimple nzTip="Uploading..."></nz-spin>
        </div>
      }

      @if (uploads().length === 0 && !isUploading() && !isLoadingInitial()) {
        <nz-empty nzDescription="No uploads yet" nzNotFoundImage="simple"></nz-empty>
      } @else if (isLoadingInitial()) {
        <div class="assets-loading">
          <nz-spin nzSimple nzTip="Loading assets..."></nz-spin>
        </div>
      } @else if (!isUploading()) {
        <div class="assets-grid">
          @for (upload of uploads(); track upload.id) {
            <div class="asset-card" (click)="addToCanvas(upload)">
              <div class="asset-thumbnail">
                <img [src]="upload.publicUrl" [alt]="upload.fileName" loading="lazy" decoding="async" (error)="onImageError($event)" />
                <button nz-button nzType="text" nzSize="small" class="delete-btn"
                        nz-popconfirm="Delete this upload?" (nzOnConfirm)="confirmDelete(upload.id)"
                        (click)="$event.stopPropagation()">
                  <span nz-icon nzType="delete" nzTheme="outline"></span>
                </button>
              </div>
              <div class="asset-name" [title]="upload.fileName">{{ upload.fileName }}</div>
              @if (upload.width && upload.height) {
                <div class="asset-dimensions">{{ upload.width }}&times;{{ upload.height }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .assets-content { padding: 12px; }
    .assets-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .assets-title { font-size: 13px; font-weight: 600; color: #333; }
    .assets-loading { text-align: center; padding: 24px 0; }
    .assets-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .asset-card { cursor: pointer; border-radius: 4px; overflow: hidden; transition: box-shadow 0.2s; }
    .asset-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .asset-thumbnail { position: relative; aspect-ratio: 1; background: #f0f0f0; display: flex; align-items: center; justify-content: center; }
    .asset-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
    .asset-thumbnail img.img-error { opacity: 0.5; }
    .delete-btn { position: absolute; top: 2px; right: 2px; opacity: 0; transition: opacity 0.2s; }
    .asset-card:hover .delete-btn { opacity: 1; }
    .asset-name { font-size: 11px; padding: 4px 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .asset-dimensions { font-size: 10px; color: #999; padding: 0 2px 4px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetsPanelComponent implements OnInit, OnDestroy {
  private uploadService = inject(UploadService);
  private canvasState = inject(CanvasState);
  private canvasWrapper = inject(CanvasWrapperService);
  private message = inject(NzMessageService);

  uploads = this.uploadService.uploads;
  isUploading = this.uploadService.isUploading;
  isLoadingInitial = this.uploadService.isLoadingInitial;
  uploadError = this.uploadService.uploadError;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    const projectId = this.canvasState.projectId();
    if (projectId) {
      this.uploadService.loadUploads(projectId);
    }
  }

  triggerUpload(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const projectId = this.canvasState.projectId() ?? undefined;
      this.uploadService.uploadAndCreate(file, projectId).then((upload) => {
        if (upload) {
          this.message.success(`Uploaded ${upload.fileName}`);
        }
      });
    }
    input.value = '';
  }

  addToCanvas(upload: Upload): void {
    this.canvasWrapper.addImageFromURL(upload.publicUrl);
  }

  confirmDelete(uploadId: string): void {
    this.uploadService.deleteUpload(uploadId).then((success) => {
      if (success) {
        this.message.success('Upload deleted');
      }
    });
  }

  clearError(): void {
    this.uploadService.uploadError.set(null);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/placeholder-image.svg';
    img.classList.add('img-error');
  }

  ngOnDestroy(): void {
    // No subscriptions to clean up — signals are read-only references
  }
}