import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, NzButtonModule, NzInputModule, NzFormModule, NzCardModule, NzAlertModule],
  template: `
    <div class="auth-container">
      <nz-card nzTitle="Create Account" class="auth-card">
        @if (error) {
          <nz-alert nzType="error" [nzMessage]="error" nzShowIcon></nz-alert>
        }
        <form nz-form (ngSubmit)="onSubmit()" #registerForm="ngForm">
          <nz-form-item>
            <nz-form-label [nzSpan]="6">Name</nz-form-label>
            <nz-form-control [nzSpan]="18">
              <input nz-input [(ngModel)]="displayName" name="displayName" placeholder="Your name" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzSpan]="6">Email</nz-form-label>
            <nz-form-control [nzSpan]="18">
              <input nz-input type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" required />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzSpan]="6">Password</nz-form-label>
            <nz-form-control [nzSpan]="18">
              <input nz-input type="password" [(ngModel)]="password" name="password" placeholder="Min 6 characters" required />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-control [nzOffset]="6" [nzSpan]="18">
              <button nz-button nzType="primary" type="submit" [nzLoading]="loading" style="width: 100%">Create Account</button>
            </nz-form-control>
          </nz-form-item>
        </form>
        <p class="auth-footer">Already have an account? <a routerLink="/auth/login">Sign in</a></p>
      </nz-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f2f5; }
    .auth-card { width: 400px; }
    .auth-footer { text-align: center; margin-top: 16px; }
  `],
})
export class RegisterComponent {
  email = '';
  password = '';
  displayName = '';
  loading = false;
  error = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  async onSubmit() {
    this.error = '';
    this.loading = true;
    try {
      await this.authService.signUp(this.email, this.password, this.displayName || undefined);
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error = err.message || 'Sign up failed';
    } finally {
      this.loading = false;
    }
  }
}