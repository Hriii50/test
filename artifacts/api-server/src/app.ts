import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(process.env.API_BASE_PATH ?? "/api", router);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ err }, "Unhandled request error");
  res.status(500).json({ error: "حدث خطأ غير متوقع. حاول مرة أخرى." });
});

export default app;
