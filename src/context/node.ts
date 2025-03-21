import { AsyncLocalStorage } from "node:async_hooks";

import type { RenderContext } from "./types.ts";

export type { RenderContext };

export const RenderContextStorage = new AsyncLocalStorage<RenderContext>();
