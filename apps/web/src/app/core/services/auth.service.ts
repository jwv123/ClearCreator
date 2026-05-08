import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User, Session } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  isAuthenticated = signal(false);
  currentToken = signal<string | null>(null);

  constructor(public supabaseService: SupabaseService) {
    this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
      this.userSubject.next(session?.user ?? null);
      this.isAuthenticated.set(!!session?.user);
      this.currentToken.set(session?.access_token ?? null);
    });

    // Check for existing session
    this.supabaseService.supabase.auth.getSession().then(({ data: { session } }) => {
      this.userSubject.next(session?.user ?? null);
      this.isAuthenticated.set(!!session?.user);
      this.currentToken.set(session?.access_token ?? null);
    });
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabaseService.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await this.supabaseService.supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    return data;
  }

  async signInWithGoogle() {
    const { data, error } = await this.supabaseService.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    await this.supabaseService.supabase.auth.signOut();
    this.userSubject.next(null);
    this.isAuthenticated.set(false);
    this.currentToken.set(null);
  }
}