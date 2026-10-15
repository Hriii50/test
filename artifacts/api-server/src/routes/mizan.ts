import { Router, type IRouter } from "express";
import { handleMizanApi } from "@workspace/mizan-api";

const router: IRouter = Router();

router.use(async (req, res, next): Promise<void> => {
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(", "));
    }

    // Express has already parsed the body; serialize it back into a Web Request.
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    const hasBody = !["GET", "HEAD"].includes(req.method.toUpperCase());
    const body = hasBody ? JSON.stringify(req.body ?? {}) : undefined;
    if (hasBody) headers.set("content-type", "application/json");
    const request = new Request(
      new URL(`/api${req.url}`, `http://${req.get("host") ?? "localhost"}`),
      { method: req.method, headers, body },
    );
    const response = await handleMizanApi(request);

    response.headers.forEach((value, name) => {
      if (name.toLowerCase() !== "set-cookie") res.setHeader(name, value);
    });
    const cookies = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
    if (cookies?.length) {
      res.setHeader("Set-Cookie", cookies);
    } else {
      const cookie = response.headers.get("set-cookie");
      if (cookie) res.setHeader("Set-Cookie", cookie);
    }

    res.status(response.status).end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    req.log.error({ err }, "MIZAN API request failed");
    next(err);
  }
});

export default router;
