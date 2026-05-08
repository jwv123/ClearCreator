import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, NzCardModule, NzButtonModule, NzGridModule, NzTypographyModule, NzEmptyModule, NzSpinModule, NzDropDownModule, NzMenuModule],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1 nz-typography>ClearCreator</h1>
        <div class="header-actions">
          <button nz-button nzType="primary" (click)="createProject()">
            + New Project
          </button>
          <button nz-button (click)="signOut()">Sign Out</button>
        </div>
      </header>

      <section class="dashboard-content">
        <h2 nz-typography>Recent Projects</h2>
        @if (loading) {
          <nz-spin></nz-spin>
        } @else if (projects.length === 0) {
          <nz-empty nzDescription="No projects yet. Create your first design!"></nz-empty>
        } @else {
          <div nz-row [nzGutter]="16">
            @for (project of projects; track project.id) {
              <div nz-col [nzSpan]="6">
                <nz-card class="project-card" (click)="openProject(project.id)">
                  <nz-card-meta [nzTitle]="project.name" [nzDescription]="project.updatedAt | date"></nz-card-meta>
                </nz-card>
              </div>
            }
          </div>
        }
      </section>

      <section class="dashboard-content">
        <h2 nz-typography>Templates</h2>
        <div nz-row [nzGutter]="16">
          @for (template of templates; track template.id) {
            <div nz-col [nzSpan]="6">
              <nz-card class="template-card" (click)="createFromTemplate(template.id)">
                <nz-card-meta [nzTitle]="template.name" [nzDescription]="template.category"></nz-card-meta>
              </nz-card>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .header-actions { display: flex; gap: 12px; }
    .dashboard-content { margin-bottom: 40px; }
    .project-card, .template-card { cursor: pointer; transition: transform 0.2s; }
    .project-card:hover, .template-card:hover { transform: translateY(-2px); }
  `],
})
export class DashboardComponent implements OnInit {
  projects: any[] = [];
  templates: any[] = [];
  loading = true;

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    // TODO: Load projects and templates via Apollo Angular
    this.loading = false;
  }

  createProject() {
    this.router.navigate(['/editor/new']);
  }

  openProject(id: string) {
    this.router.navigate(['/editor', id]);
  }

  createFromTemplate(templateId: string) {
    this.router.navigate(['/editor/new']);
  }

  async signOut() {
    await this.authService.signOut();
    this.router.navigate(['/auth/login']);
  }
}