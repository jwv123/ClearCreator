import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { Template } from '../../../core/services/project.service';

@Component({
  selector: 'app-template-gallery',
  standalone: true,
  imports: [NzCardModule, NzTagModule, NzEmptyModule, NzSpinModule, NzTypographyModule],
  template: `
    <div class="template-gallery">
      <h3 nz-typography>Templates</h3>
      @if (loading) {
        <nz-spin></nz-spin>
      } @else if (templates.length === 0) {
        <nz-empty nzDescription="No templates available"></nz-empty>
      } @else {
        <div class="template-grid">
          @for (template of templates; track template.id) {
            <nz-card
              class="template-card"
              (click)="selected.emit(template)"
            >
              <div class="template-preview">
                @if (template.thumbnailUrl) {
                  <img [src]="template.thumbnailUrl" [alt]="template.name" />
                } @else {
                  <div class="placeholder">
                    <span>&#x1f3a8;</span>
                  </div>
                }
              </div>
              <nz-card-meta
                [nzTitle]="template.name"
                [nzDescription]="template.description || ''"
              />
              @if (template.category) {
                <nz-tag [nzColor]="'blue'" class="category-tag">{{ template.category }}</nz-tag>
              }
            </nz-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .template-gallery { margin-top: 32px; }
    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .template-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .template-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .template-preview {
      width: 100%;
      aspect-ratio: 1;
      background: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .template-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .placeholder {
      font-size: 36px;
    }
    .category-tag {
      margin-top: 4px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateGalleryComponent {
  @Input({ required: true }) templates!: Template[];
  @Input() loading = false;
  @Output() selected = new EventEmitter<Template>();
}