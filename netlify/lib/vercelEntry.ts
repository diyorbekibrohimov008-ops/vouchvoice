import { handleApiRequest } from './router';

async function dispatch(req: Request): Promise<Response> {
  try {
    return await handleApiRequest(req);
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
