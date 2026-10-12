import type { IncomingMessage, ServerResponse } from 'http';
import { aiMiddlewareHandler } from '../server/aiMiddleware.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const handled = await aiMiddlewareHandler(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Endpoint not found', url: req.url }));
    }
  } catch (error: any) {
    console.error('[API Gateway Error]:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error?.message || 'Internal Server Error' }));
    }
  }
}
