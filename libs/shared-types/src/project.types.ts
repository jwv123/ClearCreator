export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  canvasJson: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  thumbnailUrl?: string;
  isTemplate: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  canvasJson: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  thumbnailUrl?: string;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
}

export type PlanType = 'free' | 'pro';

export interface Profile {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  plan: PlanType;
  createdAt: string;
  updatedAt: string;
}