import { handleMizanApi } from "@workspace/mizan-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleMizanApi;
export const POST = handleMizanApi;
export const PATCH = handleMizanApi;
export const PUT = handleMizanApi;
export const DELETE = handleMizanApi;
