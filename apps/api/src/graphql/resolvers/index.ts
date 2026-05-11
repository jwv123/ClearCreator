import { createSupabaseClient } from '../../utils/supabase-client.js';

const supabase = createSupabaseClient();

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      if (!context.user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', context.user.id)
        .single();
      return data;
    },

    project: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      return data;
    },

    myProjects: async (_: any, { limit = 20, offset = 0 }: { limit: number; offset: number }, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', context.user.id)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);
      return data || [];
    },

    myProjectsCount: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', context.user.id);
      return count || 0;
    },

    templates: async (_: any, { category, limit = 20, offset = 0 }: { category?: string; limit: number; offset: number }) => {
      let query = supabase
        .from('templates')
        .select('*')
        .order('sort_order', { ascending: true })
        .range(offset, offset + limit - 1);
      if (category) query = query.eq('category', category);
      const { data } = await query;
      return data || [];
    },

    featuredTemplates: async () => {
      const { data } = await supabase
        .from('templates')
        .select('*')
        .eq('is_featured', true)
        .order('sort_order', { ascending: true });
      return data || [];
    },

    aiModels: async () => {
      // This will be populated by the Ollama service
      // For now, return a default set
      return [
        { name: 'gpt-oss:120b', modifiedAt: new Date().toISOString(), size: 0 },
      ];
    },
  },

  Mutation: {
    createProject: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .insert({
          owner_id: context.user.id,
          name: input.name || 'Untitled Project',
          canvas_width: input.canvasWidth || 1080,
          canvas_height: input.canvasHeight || 1080,
          background_color: input.backgroundColor || '#ffffff',
          canvas_json: JSON.stringify({ version: '7', objects: [] }),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    updateProject: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.canvasJson !== undefined) updateData.canvas_json = input.canvasJson;
      if (input.canvasWidth !== undefined) updateData.canvas_width = input.canvasWidth;
      if (input.canvasHeight !== undefined) updateData.canvas_height = input.canvasHeight;
      if (input.backgroundColor !== undefined) updateData.background_color = input.backgroundColor;
      if (input.thumbnailUrl !== undefined) updateData.thumbnail_url = input.thumbnailUrl;
      if (input.isPublic !== undefined) updateData.is_public = input.isPublic;

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', input.id)
        .eq('owner_id', context.user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    deleteProject: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('owner_id', context.user.id);
      if (error) throw new Error(error.message);
      return true;
    },

    duplicateProject: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const { data: original } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (!original) throw new Error('Project not found');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          owner_id: context.user.id,
          name: `${original.name} (Copy)`,
          canvas_json: original.canvas_json,
          canvas_width: original.canvas_width,
          canvas_height: original.canvas_height,
          background_color: original.background_color,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    createUpload: async (_: any, { input }: { input: any }, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const storagePath = `uploads/${context.user.id}/${input.projectId || 'unassigned'}/${crypto.randomUUID()}.${input.contentType.split('/')[1] || 'bin'}`;

      const { data, error } = await supabase
        .from('uploads')
        .insert({
          owner_id: context.user.id,
          project_id: input.projectId,
          file_name: input.fileName,
          file_size: input.fileSize,
          content_type: input.contentType,
          storage_path: storagePath,
          public_url: `${process.env.SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`,
          width: input.width || null,
          height: input.height || null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },

    deleteUpload: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) throw new Error('Not authenticated');
      const { data: upload } = await supabase
        .from('uploads')
        .select('storage_path')
        .eq('id', id)
        .eq('owner_id', context.user.id)
        .single();
      if (upload) {
        await supabase.storage.from('uploads').remove([upload.storage_path]);
      }
      const { error } = await supabase
        .from('uploads')
        .delete()
        .eq('id', id)
        .eq('owner_id', context.user.id);
      if (error) throw new Error(error.message);
      return true;
    },
  },

  // Field resolvers for nested types and snake_case → camelCase mapping
  Project: {
    ownerId: (parent: any) => parent.owner_id,
    canvasJson: (parent: any) => typeof parent.canvas_json === 'string' ? parent.canvas_json : JSON.stringify(parent.canvas_json ?? '{}'),
    canvasWidth: (parent: any) => parent.canvas_width,
    canvasHeight: (parent: any) => parent.canvas_height,
    backgroundColor: (parent: any) => parent.background_color,
    thumbnailUrl: (parent: any) => parent.thumbnail_url,
    isTemplate: (parent: any) => parent.is_template,
    isPublic: (parent: any) => parent.is_public,
    createdAt: (parent: any) => parent.created_at,
    updatedAt: (parent: any) => parent.updated_at,
    uploads: async (parent: any) => {
      const { data } = await supabase
        .from('uploads')
        .select('*')
        .eq('project_id', parent.id);
      return (data || []).map((u: any) => ({
        ...u,
        ownerId: u.owner_id,
        projectId: u.project_id,
        fileName: u.file_name,
        fileSize: u.file_size,
        contentType: u.content_type,
        storagePath: u.storage_path,
        publicUrl: u.public_url,
        createdAt: u.created_at,
      }));
    },
  },

  Template: {
    canvasJson: (parent: any) => typeof parent.canvas_json === 'string' ? parent.canvas_json : JSON.stringify(parent.canvas_json ?? '{}'),
    canvasWidth: (parent: any) => parent.canvas_width,
    canvasHeight: (parent: any) => parent.canvas_height,
    backgroundColor: (parent: any) => parent.background_color,
    thumbnailUrl: (parent: any) => parent.thumbnail_url,
    isFeatured: (parent: any) => parent.is_featured,
    sortOrder: (parent: any) => parent.sort_order,
    createdAt: (parent: any) => parent.created_at,
  },

  Upload: {
    ownerId: (parent: any) => parent.owner_id ?? parent.ownerId,
    projectId: (parent: any) => parent.project_id ?? parent.projectId,
    fileName: (parent: any) => parent.file_name ?? parent.fileName,
    fileSize: (parent: any) => parent.file_size ?? parent.fileSize,
    contentType: (parent: any) => parent.content_type ?? parent.contentType,
    storagePath: (parent: any) => parent.storage_path ?? parent.storagePath,
    publicUrl: (parent: any) => parent.public_url ?? parent.publicUrl,
    createdAt: (parent: any) => parent.created_at ?? parent.createdAt,
  },

  User: {
    displayName: (parent: any) => parent.display_name ?? parent.displayName,
    avatarUrl: (parent: any) => parent.avatar_url ?? parent.avatarUrl,
    createdAt: (parent: any) => parent.created_at ?? parent.createdAt,
    projects: async (parent: any) => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', parent.id);
      return data || [];
    },
  },
};