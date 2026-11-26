import { handleApiRequest } from './router';

async function dispatch(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url, 'http://localhost');
    const rewrittenPath = url.searchParams.get('__path');
    let targetReq = req;
    if (rewrittenPath) {
      url.pathname = rewrittenPath.startsWith('/') ? rewrittenPath : `/${rewrittenPath}`;
      url.searchParams.delete('__path');
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.body !== null;
      targetReq = new Request(url.toString(), {
        method: req.method,
        headers: req.headers,
        body: hasBody ? await req.arrayBuffer() : undefined,
      });
    }
    return await handleApiRequest(targetReq);
  } catch (err) {
    console.error('[vouchvoice] unhandled route error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request): Promise<Response> {
  return dispatch(req);
}

export async function POST(req: Request): Promise<Response> {
  return dispatch(req);
}

export async function PATCH(req: Request): Promise<Response> {
  return dispatch(req);
}

export async function PUT(req: Request): Promise<Response> {
  return dispatch(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return dispatch(req);
}

export async function OPTIONS(req: Request): Promise<Response> {
  return dispatch(req);
}
