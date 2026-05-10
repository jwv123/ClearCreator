import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';

export interface FontInfo {
  family: string;
  category: string;
  variants: string[];
  files?: Record<string, string>;
  isSystem?: boolean;
}

const SYSTEM_FONTS: FontInfo[] = [
  { family: 'Arial', category: 'sans-serif', variants: ['regular', '700', 'italic', '700italic'], isSystem: true },
  { family: 'Helvetica', category: 'sans-serif', variants: ['regular', '700', 'italic', '700italic'], isSystem: true },
  { family: 'Times New Roman', category: 'serif', variants: ['regular', '700', 'italic', '700italic'], isSystem: true },
  { family: 'Georgia', category: 'serif', variants: ['regular', '700', 'italic', '700italic'], isSystem: true },
  { family: 'Verdana', category: 'sans-serif', variants: ['regular', '700', 'italic', '700italic'], isSystem: true },
  { family: 'Courier New', category: 'monospace', variants: ['regular', '700', 'italic', '700italic'], isSystem: true },
  { family: 'Impact', category: 'display', variants: ['regular'], isSystem: true },
  { family: 'Trebuchet MS', category: 'sans-serif', variants: ['regular', '700', 'italic', '700italic'], isSystem: true },
  { family: 'Palatino', category: 'serif', variants: ['regular', '700', 'italic', '700italic'], isSystem: true },
  { family: 'Comic Sans MS', category: 'display', variants: ['regular', '700'], isSystem: true },
];

@Injectable({ providedIn: 'root' })
export class FontService {
  private http = inject(HttpClient);

  readonly systemFonts = SYSTEM_FONTS;

  popularFonts = signal<FontInfo[]>([]);
  allFonts = signal<FontInfo[]>([]);
  fontsLoading = signal(false);
  fontsError = signal<string | null>(null);
  loadedFonts = signal<Set<string>>(new Set());

  private loadingPromises = new Map<string, Promise<void>>();
  private popularLoaded = false;
  private allLoaded = false;

  loadPopularFonts(): void {
    if (this.popularLoaded) return;
    this.popularLoaded = true;
    this.fontsLoading.set(true);
    this.http.get<{ items: FontInfo[] }>('/api/fonts/popular').subscribe({
      next: (response) => {
        this.popularFonts.set(response.items ?? []);
        this.fontsError.set(null);
        this.fontsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load popular fonts:', err);
        this.fontsError.set(err.message);
        this.popularFonts.set([]);
        this.fontsLoading.set(false);
      },
    });
  }

  loadAllFonts(): void {
    if (this.allLoaded) return;
    this.allLoaded = true;
    this.http.get<{ items: FontInfo[] }>('/api/fonts').subscribe({
      next: (response) => {
        this.allFonts.set(response.items ?? []);
        this.fontsError.set(null);
      },
      error: (err) => {
        console.error('Failed to load all fonts:', err);
        this.fontsError.set(err.message);
        this.allFonts.set([]);
      },
    });
  }

  searchFonts(query: string): FontInfo[] {
    const q = query.toLowerCase();
    const combined = [...this.systemFonts, ...this.popularFonts()];
    if (!q) return combined;
    return combined.filter(
      (f) => f.family.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
    );
  }

  async ensureFontLoaded(fontFamily: string): Promise<void> {
    if (this.loadedFonts().has(fontFamily)) return;
    if (document.fonts.check(`16px "${fontFamily}"`)) {
      this.loadedFonts.update((set) => new Set(set).add(fontFamily));
      return;
    }

    const existing = this.loadingPromises.get(fontFamily);
    if (existing) return existing;

    const isSystem = this.systemFonts.some((f) => f.family === fontFamily);
    if (isSystem) {
      this.loadedFonts.update((set) => new Set(set).add(fontFamily));
      return;
    }

    const promise = this.doLoadFont(fontFamily);
    this.loadingPromises.set(fontFamily, promise);
    try {
      await promise;
    } finally {
      this.loadingPromises.delete(fontFamily);
    }
  }

  async ensureFontsLoaded(families: string[]): Promise<void> {
    await Promise.all(families.map((f) => this.ensureFontLoaded(f)));
  }

  private async doLoadFont(fontFamily: string): Promise<void> {
    const linkId = `gf-${fontFamily.replace(/\s+/g, '-')}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700&style=normal,italic&display=swap`;
      document.head.appendChild(link);
    }

    try {
      await document.fonts.load(`400 16px "${fontFamily}"`);
      await document.fonts.load(`700 16px "${fontFamily}"`);
      const { cache } = await import('fabric');
      cache.clearFontCache(fontFamily);
      this.loadedFonts.update((set) => new Set(set).add(fontFamily));
    } catch {
      console.warn(`Failed to load font: ${fontFamily}`);
      this.loadedFonts.update((set) => new Set(set).add(fontFamily));
    }
  }

  /** Preload all popular fonts for dropdown preview by loading a single combined CSS link. */
  preloadPopularFontsForPreview(): void {
    if (document.getElementById('gf-popular-preview')) return;

    const families = this.popularFonts().map((f) => `family=${encodeURIComponent(f.family)}:wght@400`).join('&');
    if (!families) return;

    const link = document.createElement('link');
    link.id = 'gf-popular-preview';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }
}