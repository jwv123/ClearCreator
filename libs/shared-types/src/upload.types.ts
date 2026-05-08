export interface Upload {
  id: string;
  ownerId: string;
  projectId?: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
  publicUrl: string;
  width?: number;
  height?: number;
  createdAt: string;
}