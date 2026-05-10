import { Request, Response, NextFunction } from 'express';
import { createSupabaseClient } from '../utils/supabase-client.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health check and AI models list
  if (req.path === '/health' || req.path === '/ai/models' || req.path.startsWith('/fonts')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    // Allow unauthenticated access for certain endpoints
    return next();
  }

  const token = authHeader.split(' ')[1];
  const supabase = createSupabaseClient();

  supabase.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user) {
      (req as any).user = null;
    } else {
      (req as any).user = data.user;
    }
    next();
  }).catch(() => {
    (req as any).user = null;
    next();
  });
}