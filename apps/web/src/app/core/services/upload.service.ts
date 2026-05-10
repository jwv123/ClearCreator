import { Injectable, inject, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Upload {
  id: string;
  ownerId: string;
  projectId: string | null;
  fileName: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
  publicUrl: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface CreateUploadInput {
  projectId?: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  width?: number;
  height?: number;
}

// ── GraphQL Documents ──

const PROJECT_UPLOADS_QUERY = gql<{ project: { uploads: Upload[] } }, { id: string }>`
  query ProjectUploads($id: ID!) {
    project(id: $id) {
      uploads {
        id
        ownerId
        projectId
        fileName
        fileSize
        contentType
        storagePath
        publicUrl
        width
        height
        createdAt
      }
    }
  }
`;

const CREATE_UPLOAD_MUTATION = gql<{ createUpload: Upload }, { input: CreateUploadInput }>`
  mutation CreateUpload($input: CreateUploadInput!) {
    createUpload(input: $input) {
      id
      ownerId
      projectId
      fileName
      fileSize
      contentType
      storagePath
      publicUrl
      width
      height
      createdAt
    }
  }
`;

const DELETE_UPLOAD_MUTATION = gql<{ deleteUpload: boolean }, { id: string }>`
  mutation DeleteUpload($id: ID!) {
    deleteUpload(id: $id)
  }
`;

@Injectable({ providedIn: 'root' })
export class UploadService {
  private apollo = inject(Apollo);
  private supabaseService = inject(SupabaseService);

  uploads = signal<Upload[]>([]);
  isUploading = signal(false);
  isLoadingInitial = signal(false);
  uploadError = signal<string | null>(null);

  loadUploads(projectId: string): void {
    this.isLoadingInitial.set(true);
    this.apollo
      .query({ query: PROJECT_UPLOADS_QUERY, variables: { id: projectId } })
      .subscribe({
        next: (result) => {
          this.uploads.set(result.data!.project.uploads);
          this.isLoadingInitial.set(false);
        },
        error: (err) => {
          this.uploadError.set(err.message || 'Failed to load uploads');
          this.isLoadingInitial.set(false);
        },
      });
  }

  async uploadAndCreate(file: File, projectId?: string): Promise<Upload | null> {
    this.isUploading.set(true);
    this.uploadError.set(null);

    try {
      // 1. Extract image dimensions
      const dims = await this.getImageDimensions(file);

      // 2. Call createUpload mutation to get storagePath and metadata
      const result = await firstValueFrom(
        this.apollo.mutate({
          mutation: CREATE_UPLOAD_MUTATION,
          variables: {
            input: {
              fileName: file.name,
              contentType: file.type,
              fileSize: file.size,
              width: dims.width,
              height: dims.height,
              projectId: projectId ?? undefined,
            },
          },
        }),
      );

      const upload: Upload = result.data!.createUpload;

      // 3. Upload file to Supabase Storage at the returned storagePath
      const { error: uploadError } = await this.supabaseService.supabase.storage
        .from('uploads')
        .upload(upload.storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        // Cleanup: delete the DB row since file upload failed
        await firstValueFrom(
          this.apollo.mutate({
            mutation: DELETE_UPLOAD_MUTATION,
            variables: { id: upload.id },
          }),
        );
        throw new Error(uploadError.message);
      }

      // 4. Add to local signal
      this.uploads.update((list) => [...list, upload]);
      return upload;
    } catch (err: any) {
      this.uploadError.set(err.message || 'Upload failed');
      return null;
    } finally {
      this.isUploading.set(false);
    }
  }

  async deleteUpload(id: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.apollo.mutate({
          mutation: DELETE_UPLOAD_MUTATION,
          variables: { id },
        }),
      );
      if (result.data!.deleteUpload) {
        this.uploads.update((list) => list.filter((u) => u.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }
}