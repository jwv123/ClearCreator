import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule],
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
          <span nz-icon nzType="ant-design:circle"></span>
          <span>Circle</span>
        </button>
        <button nz-button nzType="default" class="tool-btn" (click)="addImage.emit()">
          <span nz-icon nzType="picture"></span>
          <span>Image</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-content { padding: 16px; }
    .sidebar-content h4 { margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #333; }
    .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .tool-btn { display: flex; flex-direction: column; align-items: center; height: auto; padding: 12px 8px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  @Output() addText = new EventEmitter<void>();
  @Output() addRect = new EventEmitter<void>();
  @Output() addCircle = new EventEmitter<void>();
  @Output() addImage = new EventEmitter<void>();
}