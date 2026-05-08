import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth state to initialize
  const { data } = await authService.supabaseService.supabase.auth.getSession();

  if (data.session) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};