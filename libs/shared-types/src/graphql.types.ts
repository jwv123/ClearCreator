export interface CreateUserInput {
  displayName?: string;
  avatarUrl?: string;
}

export interface CreateProjectInput {
  name?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  canvasJson?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
}

export interface CreateUploadInput {
  projectId?: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}