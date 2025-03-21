import { type RenderContext, RenderContextStorage } from "enhanceable/context";
import type { UnsafeHTML } from "./html.ts";

export async function render(cb: () => Promise<UnsafeHTML>): Promise<string> {
  const ctx: RenderContext = { enhancements: new Set() };
  const html = await RenderContextStorage.run(ctx, cb);
  const chunks = [html.value];

  const seen = new Set<string>();
  if (ctx.enhancements != null && ctx.enhancements.size > 0) {
    chunks.push('<script async type="module">');
    for (const enhancement of ctx.enhancements) {
      if (seen.has(enhancement)) continue;
      seen.add(enhancement);
      chunks.push(`import(${JSON.stringify(enhancement)});`);
    }
    return `${chunks.join("")}</script>`;
  }
  return chunks.join("");
}

export type Enhancements<TModule> = {
  [K in keyof TModule]: string | TModule[K];
};

const CLIENT_REFERENCE = Symbol.for("enhanceable.reference.client");

export type ClientModuleReference<TModule> = {
  $$typeof: typeof CLIENT_REFERENCE;
  $$id: string;
  $$chunks?: string[];
  $$stringify?(this: TModule | undefined): string;
};

export function useEnhancements<TModule extends Record<string, any>>(
  enhancementsOrClientModule: TModule | ClientModuleReference<TModule>,
): Enhancements<TModule> {
  const ctx = RenderContextStorage.getStore();
  if (!ctx) throw new Error("RenderContext not found");

  return new Proxy({} as TModule, {
    async get(_, enhancement) {
      if (
        "$$id" in enhancementsOrClientModule &&
        enhancementsOrClientModule.$$typeof === CLIENT_REFERENCE
      ) {
        if (typeof enhancement !== "string") {
          throw new Error("Invalid enhancement name");
        }
        if (enhancementsOrClientModule.$$chunks) {
          for (let i = 0; i < enhancementsOrClientModule.$$chunks.length; i++) {
            ctx.enhancements.add(enhancementsOrClientModule.$$chunks[i]);
          }
        }
        if (enhancementsOrClientModule.$$stringify) {
          return enhancementsOrClientModule.$$stringify.call(this);
        }

        ctx.enhancements.add(enhancementsOrClientModule.$$id);
        return `import(${JSON.stringify(
          enhancementsOrClientModule.$$id,
        )}).then(m => m[${JSON.stringify(enhancement)}].call(this, event))`;
      }

      return enhancementsOrClientModule[
        enhancement as keyof typeof enhancementsOrClientModule
      ];
    },
  });
}
