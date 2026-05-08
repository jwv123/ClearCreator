import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, NzLayoutModule, NzButtonModule, NzIconModule, NzInputModule],
  template: `
    <nz-header class="editor-topbar">
      <div class="topbar-left">
        <button nz-button nzType="text" (click)="goBack.emit()">
          <span nz-icon nzType="arrow-left"></span>
        </button>
        <input nz-input [(ngModel)]="projectName" (ngModelChange)="projectNameChange.emit($event)" class="project-name-input" />
      </div>
      <div class="topbar-center">
        <div class="btn-group">
          <button nz-button nzType="default" nzSize="small" (click)="undo.emit()" [disabled]="!canUndo">
            <span nz-icon nzType="undo"></span>
          </button>
          <button nz-button nzType="default" nzSize="small" (click)="redo.emit()" [disabled]="!canRedo">
            <span nz-icon nzType="redo"></span>
          </button>
        </div>
        <span class="zoom-label">{{ zoomLevel }}%</span>
        <div class="btn-group">
          <button nz-button nzType="default" nzSize="small" (click)="zoomOut.emit()">
            <span nz-icon nzType="minus"></span>
          </button>
          <button nz-button nzType="default" nzSize="small" (click)="zoomIn.emit()">
            <span nz-icon nzType="plus"></span>
          </button>
          <button nz-button nzType="default" nzSize="small" (click)="fitToScreen.emit()">Fit</button>
        </div>
      </div>
      <div class="topbar-right">
        <button nz-button nzType="primary" (click)="export.emit()">Export</button>
      </div>
    </nz-header>
  `,
  styles: [`
    .editor-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: #fff;
      border-bottom: 1px solid #e8e8e8;
      height: 48px;
    }
    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .topbar-center {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .project-name-input {
      width: 200px;
      border: none;
      font-size: 16px;
      font-weight: 500;
      background: transparent;
    }
    .project-name-input:focus { outline: none; }
    .zoom-label { font-size: 12px; color: #666; min-width: 40px; text-align: center; }
    .btn-group { display: inline-flex; gap: 2px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  @Input() projectName = 'Untitled Project';
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() zoomLevel = 100;

  @Output() projectNameChange = new EventEmitter<string>();
  @Output() goBack = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() fitToScreen = new EventEmitter<void>();
  @Output() export = new EventEmitter<void>();
}