/**
 * Vercel Serverless Function entry point.
 *
 * Exports the Express app without calling app.listen(),
 * so Vercel can wrap it as a serverless function handler.
 */
import app from "./app";

export default app;
