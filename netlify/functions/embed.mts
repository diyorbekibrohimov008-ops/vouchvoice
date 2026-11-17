import type { Config } from '@netlify/functions';
import { handleEmbedRequest } from '../lib/embedHandler';

export default async (req: Request) => {
  return handleEmbedRequest(req);
};

export const config: Config = {
  path: '/embed.js',
};
