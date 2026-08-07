import { env } from "@/env/server";
import { ContextEngineClient } from "@clinia/context-engine-js";

import { tokenProvider } from "./auth";

export const serverClient = new ContextEngineClient({
  baseUrl: env.CLINIA_CONTEXT_ENGINE_API_URL,
  auth: tokenProvider,
});
