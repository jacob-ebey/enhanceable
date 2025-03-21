import type { RenderContext } from "./types.ts";

export type { RenderContext };

const renderContext: RenderContext = {
  enhancements: new Set(),
  functions: {
    idByReference: new WeakMap(),
    referenceById: new Map(),
  },
};

export const RenderContextStorage = {
  getStore() {
    return renderContext;
  },
};
