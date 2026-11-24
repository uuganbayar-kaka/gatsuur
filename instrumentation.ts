import type { Instrumentation } from "next";

// Server component / route-ийн барьж аваагүй алдааг бүртгэнэ.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { log } = await import("./lib/log");
  await log("error", "server.request_error", err, {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    digest: (err as { digest?: string }).digest,
  });
};
