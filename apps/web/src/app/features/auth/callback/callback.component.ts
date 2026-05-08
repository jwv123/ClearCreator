import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [NzSpinModule],
  template: `
    <div class="callback-container">
      <nz-spin nzTip="Completing sign in..." nzSize="large"></nz-spin>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
  `],
})
export class AuthCallbackComponent {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  constructor() {
    this.handleCallback();
  }

  async handleCallback() {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const code = params.get('code') ?? new URLSearchParams(window.location.search).get('code');

    if (code) {
      const { error } = await this.supabaseService.supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        this.router.navigate(['/']);
        return;
      }
    }

    // Fallback: let onAuthStateChange handle implicit flow, or redirect on failure
    const { data } = await this.supabaseService.supabase.auth.getSession();
    if (data.session) {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
}