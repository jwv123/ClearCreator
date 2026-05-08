import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { Project } from '../../../core/services/project.service';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [DatePipe, NzCardModule, NzDropDownModule, NzMenuModule, NzIconModule, NzTooltipModule],
  template: `
    <nz-card class="project-card" (click)="clicked.emit(project.id)">
      <div class="card-thumbnail">
        @if (project.thumbnailUrl) {
          <img [src]="project.thumbnailUrl" [alt]="project.name" />
        } @else {
          <div class="placeholder">
            <span nz-icon nzType="file-image" nzTheme="outline"></span>
          </div>
        }
      </div>
      <nz-card-meta
        [nzTitle]="project.name"
        [nzDescription]="project.updatedAt | date:'mediumDate'"
      />
      <div class="card-actions" (click)="$event.stopPropagation()">
        <span
          nz-icon
          nzType="ellipsis"
          nzTheme="outline"
          nz-tooltip="More actions"
          nz-dropdown
          [nzDropdownMenu]="menu"
          class="action-trigger"
        ></span>
        <nz-dropdown-menu #menu="nzDropdownMenu">
          <ul nz-menu>
            <li nz-menu-item (click)="renamed.emit(project.id)">
              <span nz-icon nzType="edit" nzTheme="outline"></span>
              Rename
            </li>
            <li nz-menu-item (click)="duplicated.emit(project.id)">
              <span nz-icon nzType="copy" nzTheme="outline"></span>
              Duplicate
            </li>
            <li nz-menu-item nzDanger (click)="deleted.emit(project.id)">
              <span nz-icon nzType="delete" nzTheme="outline"></span>
              Delete
            </li>
          </ul>
        </nz-dropdown-menu>
      </div>
    </nz-card>
  `,
  styles: [`
    .project-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .project-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .card-thumbnail {
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
    .card-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .placeholder {
      color: #d9d9d9;
      font-size: 32px;
    }
    .card-actions {
      position: absolute;
      top: 8px;
      right: 8px;
    }
    .action-trigger {
      font-size: 18px;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
    }
    .action-trigger:hover {
      background: rgba(0,0,0,0.06);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;
  @Output() clicked = new EventEmitter<string>();
  @Output() renamed = new EventEmitter<string>();
  @Output() duplicated = new EventEmitter<string>();
  @Output() deleted = new EventEmitter<string>();
}