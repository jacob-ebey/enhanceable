import { createHash } from "node:crypto";
import * as path from "node:path";

import type * as t from "estree";
import MagicString from "magic-string";
import * as Vite from "vite";

export type Options = {
  clientEnvironment: string;
  serverEnvironments: string[];
};

const clientModules = new Map<string, string>();

export default function enhanceableDirectives({
  clientEnvironment,
  serverEnvironments,
}: Options): Vite.PluginOption {
  let clientResolver: PromiseWithResolvers<Vite.Manifest> | undefined;

  return [
    {
      name: "enhanceable-directives:builder",
      enforce: "post",
      sharedDuringBuild: true,
      config(userConfig) {
        return {
          environments: {
            [clientEnvironment]: {
              build: {
                manifest: true,
                rollupOptions: {
                  preserveEntrySignatures: "exports-only",
                },
              },
            },
          },
          builder: {
            sharedConfigBuild: true,
            async buildApp(builder) {
              clientResolver = Promise.withResolvers();
              builder.environments[
                clientEnvironment
              ].config.build.rollupOptions.input = ensureInputs(
                builder.environments[clientEnvironment].config.build
                  .rollupOptions.input,
                clientModules.values(),
              );

              if (userConfig.builder?.buildApp) {
                await userConfig.builder.buildApp(builder);
              } else {
                await builder.buildApp();
              }
            },
          },
        };
      },
    },
    {
      name: "enhanceable-directives",
      sharedDuringBuild: true,
      transform(code, id) {
        const ast = this.parse(code);
        const directives = ast.body.filter(
          (node): node is t.Directive & { start: number; end: number } =>
            node.type === "ExpressionStatement" && "directive" in node,
        );

        let isClientModule = false;
        const s = new MagicString(code);
        for (const directive of directives) {
          if (directive.directive === "use client") {
            isClientModule = true;
            s.remove(directive.start, directive.end);
          }
        }

        if (
          isClientModule &&
          serverEnvironments.includes(this.environment.name)
        ) {
          const clientId = createHash("sha256")
            .update(id)
            .digest("hex")
            .toString();
          clientModules.set(clientId, id);

          let result =
            'export const $$typeof = Symbol.for("enhanceable.reference.client");';

          if (this.environment.mode === "dev") {
            result += `export const $$id = ${JSON.stringify(id)};`;
          } else {
            result += `export const $$id = ${JSON.stringify(`___ENHANCEABLE_CLIENT_ID_${clientId}___`)};`;
          }

          return result + `\n`;
        }

        return s.toString();
      },
      async renderChunk(code) {
        if (this.environment.name !== clientEnvironment) {
          const matches = Array.from(
            code.matchAll(/___ENHANCEABLE_CLIENT_ID_([A-Fa-f0-9]{64})___/g),
          );
          if (matches.length === 0) return;

          const s = new MagicString(code);
          for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];

            const moduleId = clientModules.get(match[1]);
            if (!moduleId) {
              throw new Error(`Module ID not found for ${match[1]}.`);
            }
            const relativePath = Vite.normalizePath(
              path.relative(this.environment.config.root, moduleId),
            );
            if (!clientResolver) {
              throw new Error("Client build was not ran.");
            }
            const manifest = await clientResolver.promise;
            const metadata = manifest[relativePath];
            if (!metadata) {
              throw new Error(
                `Metadata not found in manifest for ${moduleId}.`,
              );
            }

            const id = this.environment.config.base + metadata.file;

            s.overwrite(match.index, match.index + 92, id);
          }
          return s.toString();
        }
      },
      writeBundle(_, bundle) {
        if (this.environment.name === clientEnvironment) {
          if (!clientResolver) {
            throw new Error(
              "Client build was not ran with the correct buildApp. If overriding, you must compose the user's buildApp.",
            );
          }
          const manifestChunk = bundle[".vite/manifest.json"];
          if (!manifestChunk || manifestChunk.type !== "asset") {
            clientResolver.resolve({});
            return;
          }
          const manifestSource =
            typeof manifestChunk.source === "string"
              ? manifestChunk.source
              : new TextDecoder().decode(manifestChunk.source);
          clientResolver.resolve(JSON.parse(manifestSource));
        }
      },
    },
  ];
}

function ensureInputs(
  inputs: Vite.Rollup.InputOption | undefined,
  required: Iterable<string>,
) {
  const initial = typeof inputs === "string" ? [inputs] : (inputs ?? []);
  if (!Array.isArray(initial)) {
    throw new Error("Expected inputs to be an array.");
  }
  const unique = new Set(initial);
  for (const id of required) {
    unique.add(id);
  }
  return Array.from(unique);
}
