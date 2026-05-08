import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

// ── GraphQL Documents ──

const MY_PROJECTS_QUERY = gql<{ myProjects: Project[] }, { limit?: number; offset?: number }>`
  query MyProjects($limit: Int, $offset: Int) {
    myProjects(limit: $limit, offset: $offset) {
      id
      ownerId
      name
      description
      canvasJson
      canvasWidth
      canvasHeight
      backgroundColor
      thumbnailUrl
      isTemplate
      isPublic
      createdAt
      updatedAt
    }
  }
`;

const FEATURED_TEMPLATES_QUERY = gql<{ featuredTemplates: Template[] }, Record<string, never>>`
  query FeaturedTemplates {
    featuredTemplates {
      id
      name
      description
      category
      canvasJson
      canvasWidth
      canvasHeight
      backgroundColor
      thumbnailUrl
      isFeatured
      sortOrder
      createdAt
    }
  }
`;

const TEMPLATES_QUERY = gql<{ templates: Template[] }, { category?: string; limit?: number; offset?: number }>`
  query Templates($category: String, $limit: Int, $offset: Int) {
    templates(category: $category, limit: $limit, offset: $offset) {
      id
      name
      description
      category
      canvasJson
      canvasWidth
      canvasHeight
      backgroundColor
      thumbnailUrl
      isFeatured
      sortOrder
      createdAt
    }
  }
`;

const CREATE_PROJECT_MUTATION = gql<{ createProject: Project }, { input: Partial<CreateProjectInput> & { name?: string } }>`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      canvasJson
      canvasWidth
      canvasHeight
      backgroundColor
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_PROJECT_MUTATION = gql<{ updateProject: Project }, { input: UpdateProjectInput }>`
  mutation UpdateProject($input: UpdateProjectInput!) {
    updateProject(input: $input) {
      id
      name
      description
      canvasJson
      canvasWidth
      canvasHeight
      backgroundColor
      thumbnailUrl
      isPublic
      updatedAt
    }
  }
`;

const DELETE_PROJECT_MUTATION = gql<{ deleteProject: boolean }, { id: string }>`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

const DUPLICATE_PROJECT_MUTATION = gql<{ duplicateProject: Project }, { id: string }>`
  mutation DuplicateProject($id: ID!) {
    duplicateProject(id: $id) {
      id
      name
      canvasJson
      canvasWidth
      canvasHeight
      backgroundColor
      createdAt
      updatedAt
    }
  }
`;

// Re-export input types for mutation use
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

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private apollo = inject(Apollo);

  getMyProjects(limit = 20, offset = 0): Observable<Project[]> {
    return this.apollo
      .query({ query: MY_PROJECTS_QUERY, variables: { limit, offset } })
      .pipe(map((result) => result.data!.myProjects));
  }

  getFeaturedTemplates(): Observable<Template[]> {
    return this.apollo
      .query({ query: FEATURED_TEMPLATES_QUERY })
      .pipe(map((result) => result.data!.featuredTemplates));
  }

  getTemplates(category?: string, limit = 20, offset = 0): Observable<Template[]> {
    return this.apollo
      .query({ query: TEMPLATES_QUERY, variables: { category, limit, offset } })
      .pipe(map((result) => result.data!.templates));
  }

  createProject(input: CreateProjectInput = {}): Observable<Project> {
    return this.apollo
      .mutate({ mutation: CREATE_PROJECT_MUTATION, variables: { input } })
      .pipe(map((result) => result.data!.createProject));
  }

  updateProject(input: UpdateProjectInput): Observable<Project> {
    return this.apollo
      .mutate({ mutation: UPDATE_PROJECT_MUTATION, variables: { input } })
      .pipe(map((result) => result.data!.updateProject));
  }

  deleteProject(id: string): Observable<boolean> {
    return this.apollo
      .mutate({
        mutation: DELETE_PROJECT_MUTATION,
        variables: { id },
        refetchQueries: [{ query: MY_PROJECTS_QUERY, variables: { limit: 20, offset: 0 } }],
      })
      .pipe(map((result) => result.data!.deleteProject));
  }

  duplicateProject(id: string): Observable<Project> {
    return this.apollo
      .mutate({
        mutation: DUPLICATE_PROJECT_MUTATION,
        variables: { id },
        refetchQueries: [{ query: MY_PROJECTS_QUERY, variables: { limit: 20, offset: 0 } }],
      })
      .pipe(map((result) => result.data!.duplicateProject));
  }
}