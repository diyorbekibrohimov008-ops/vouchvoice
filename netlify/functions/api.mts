import type { Config, Context } from '@netlify/functions';
import { handleApiRequest } from '../lib/router';

export default async (req: Request, _context: Context) => {
  return handleApiRequest(req);
};

export const config: Config = {
  path: '/api/*',
};
