import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService, Project, Template } from '../../core/services/project.service';
import { ProjectCardComponent } from './project-card/project-card.component';
import { TemplateGalleryComponent } from './template-gallery/template-gallery.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NzButtonModule, NzGridModule, NzTypographyModule, NzEmptyModule, NzSpinModule,
    ProjectCardComponent, TemplateGalleryComponent,
  ],
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

      <section class="dashboard-section">
        <h2 nz-typography>Recent Projects</h2>
        @if (projectsLoading()) {
          <nz-spin></nz-spin>
        } @else if (projects().length === 0) {
          <nz-empty nzDescription="No projects yet. Create your first design!"></nz-empty>
        } @else {
          <div nz-row [nzGutter]="[16, 16]">
            @for (project of projects(); track project.id) {
              <div nz-col [nzXs]="24" [nzSm]="12" [nzMd]="8" [nzLg]="6">
                <app-project-card
                  [project]="project"
                  (clicked)="openProject($event)"
                  (renamed)="renameProject($event)"
                  (duplicated)="duplicateProject($event)"
                  (deleted)="confirmDeleteProject($event)"
                />
              </div>
            }
          </div>
        }
      </section>

      <app-template-gallery
        [templates]="templates()"
        [loading]="templatesLoading()"
        (selected)="createFromTemplate($event)"
      />
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 12px; }
    .header-actions { display: flex; gap: 12px; }
    .dashboard-section { margin-bottom: 40px; }
    @media (max-width: 576px) {
      .dashboard-container { padding: 16px; }
      .dashboard-header { margin-bottom: 24px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  projects = signal<Project[]>([]);
  templates = signal<Template[]>([]);
  projectsLoading = signal(true);
  templatesLoading = signal(true);

  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);

  ngOnInit() {
    this.loadProjects();
    this.loadTemplates();
  }

  private loadProjects() {
    this.projectsLoading.set(true);
    this.projectService.getMyProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.projectsLoading.set(false);
      },
      error: (err) => {
        this.message.error('Failed to load projects');
        this.projectsLoading.set(false);
        console.error(err);
      },
    });
  }

  private loadTemplates() {
    this.templatesLoading.set(true);
    this.projectService.getFeaturedTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.templatesLoading.set(false);
      },
      error: (err) => {
        this.message.error('Failed to load templates');
        this.templatesLoading.set(false);
        console.error(err);
      },
    });
  }

  createProject() {
    this.projectService.createProject().subscribe({
      next: (project) => this.router.navigate(['/editor', project.id]),
      error: (err) => {
        this.message.error('Failed to create project');
        console.error(err);
      },
    });
  }

  openProject(id: string) {
    this.router.navigate(['/editor', id]);
  }

  createFromTemplate(template: Template) {
    this.projectService.createProject({
      name: template.name,
      canvasWidth: template.canvasWidth,
      canvasHeight: template.canvasHeight,
      backgroundColor: template.backgroundColor,
    }).subscribe({
      next: (project) => {
        if (template.canvasJson && template.canvasJson !== '{}') {
          this.projectService.updateProject({
            id: project.id,
            canvasJson: template.canvasJson,
          }).subscribe();
        }
        this.router.navigate(['/editor', project.id]);
      },
      error: (err) => {
        this.message.error('Failed to create project from template');
        console.error(err);
      },
    });
  }

  renameProject(id: string) {
    const project = this.projects().find((p) => p.id === id);
    if (!project) return;
    const newName = prompt('Rename project:', project.name);
    if (newName && newName !== project.name) {
      this.projectService.updateProject({ id, name: newName }).subscribe({
        next: () => {
          this.message.success('Project renamed');
          this.loadProjects();
        },
        error: () => this.message.error('Failed to rename project'),
      });
    }
  }

  duplicateProject(id: string) {
    this.projectService.duplicateProject(id).subscribe({
      next: () => {
        this.message.success('Project duplicated');
        this.loadProjects();
      },
      error: () => this.message.error('Failed to duplicate project'),
    });
  }

  confirmDeleteProject(id: string) {
    const project = this.projects().find((p) => p.id === id);
    if (!project) return;
    if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      this.projectService.deleteProject(id).subscribe({
        next: () => {
          this.message.success('Project deleted');
          this.loadProjects();
        },
        error: () => this.message.error('Failed to delete project'),
      });
    }
  }

  async signOut() {
    await this.authService.signOut();
    this.router.navigate(['/auth/login']);
  }
}