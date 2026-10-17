import dotenv from 'dotenv';
dotenv.config();
import type { IncomingMessage, ServerResponse } from 'http';
import { aiMiddlewareHandler } from '../server/aiMiddleware.ts';
import { sendSafeError, ERROR_CODES } from '../server/lib/safeErrors.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const handled = await aiMiddlewareHandler(req, res);
    if (!handled) {
      sendSafeError(
        res,
        404,
        'The requested API endpoint was not found.',
        ERROR_CODES.NOT_FOUND
      );
    }
  } catch (error: any) {
    sendSafeError(
      res,
      500,
      'An unexpected internal server error occurred. Please try again or contact TIP support.',
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      error
    );
  }
}
