/**
 * Vercel Serverless Function entry point.
 *
 * Imports the bundled Express app (without app.listen()) and exports
 * it as a default handler for Vercel to invoke on every /api/* request.
 */
import app from "../apps/api/dist/serverless.mjs";

export default app;
