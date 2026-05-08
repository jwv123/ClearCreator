export const schema = `#graphql
  # === Types ===

  type User {
    id: ID!
    displayName: String
    avatarUrl: String
    plan: PlanType!
    createdAt: String!
    projects: [Project!]!
  }

  enum PlanType {
    free
    pro
  }

  type Project {
    id: ID!
    ownerId: ID!
    name: String!
    description: String
    canvasJson: String!
    canvasWidth: Int!
    canvasHeight: Int!
    backgroundColor: String!
    thumbnailUrl: String
    isTemplate: Boolean!
    isPublic: Boolean!
    createdAt: String!
    updatedAt: String!
    uploads: [Upload!]!
  }

  type Template {
    id: ID!
    name: String!
    description: String
    category: String!
    canvasJson: String!
    canvasWidth: Int!
    canvasHeight: Int!
    backgroundColor: String!
    thumbnailUrl: String
    isFeatured: Boolean!
    sortOrder: Int!
    createdAt: String!
  }

  type Upload {
    id: ID!
    ownerId: ID!
    projectId: ID
    fileName: String!
    fileSize: Int!
    contentType: String!
    publicUrl: String!
    width: Int
    height: Int
    createdAt: String!
  }

  type AiGeneration {
    id: ID!
    ownerId: ID!
    projectId: ID
    prompt: String!
    generationType: GenerationType!
    modelUsed: String!
    parsedResult: String
    status: GenerationStatus!
    errorMessage: String
    createdAt: String!
  }

  enum GenerationType {
    full_design
    element_modify
  }

  enum GenerationStatus {
    pending
    streaming
    completed
    failed
  }

  type AiModel {
    name: String!
    modifiedAt: String
    size: Int
  }

  # === Inputs ===

  input CreateProjectInput {
    name: String
    canvasWidth: Int
    canvasHeight: Int
    backgroundColor: String
  }

  input UpdateProjectInput {
    id: ID!
    name: String
    description: String
    canvasJson: String
    canvasWidth: Int
    canvasHeight: Int
    backgroundColor: String
    thumbnailUrl: String
    isPublic: Boolean
  }

  input CreateUploadInput {
    projectId: ID
    fileName: String!
    contentType: String!
    fileSize: Int!
  }

  # === Queries ===

  type Query {
    me: User
    project(id: ID!): Project
    myProjects(limit: Int, offset: Int): [Project!]!
    myProjectsCount: Int!
    templates(category: String, limit: Int, offset: Int): [Template!]!
    featuredTemplates: [Template!]!
    aiModels: [AiModel!]!
  }

  # === Mutations ===

  type Mutation {
    createProject(input: CreateProjectInput!): Project!
    updateProject(input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    duplicateProject(id: ID!): Project!
    createUpload(input: CreateUploadInput!): Upload!
    deleteUpload(id: ID!): Boolean!
  }
`;