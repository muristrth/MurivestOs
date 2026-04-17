import { clerkMiddleware, createClerkClient } from "@clerk/express";
import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from 'pino-http';
import { clerkProxyMiddleware } from './middlewares/clerkProxyMiddleware.js'
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url?.split("?")[0],
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Only enable Clerk auth if valid keys are provided
if (
  process.env.CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
  process.env.CLERK_SECRET_KEY?.startsWith("sk_")
) {
  app.use(clerkMiddleware());
} else {
  logger.warn(
    "Clerk keys not configured - authentication disabled for development",
  );
}

app.use("/api", router);

export default app;
