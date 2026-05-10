import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ThumbnailService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  async uploadThumbnail(projectId: string, dataUrl: string): Promise<string> {
    const userId = this.authService.currentUser?.id;
    if (!userId) throw new Error('Not authenticated');

    const blob = this.dataUrlToBlob(dataUrl);
    const storagePath = `thumbnails/${userId}/${projectId}.png`;

    const { error } = await this.supabaseService.supabase.storage
      .from('uploads')
      .upload(storagePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = this.supabaseService.supabase.storage
      .from('uploads')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  }
}