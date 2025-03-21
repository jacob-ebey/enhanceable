import type * as Vite from "vite";

import directives from "./plugins/directives.ts";
import scanPass from "./plugins/scan-pass.ts";

export default function enhanceable(): Vite.PluginOption {
  return [
    {
      name: "enhanceable",
      sharedDuringBuild: true,
      config() {
        return {
          builder: {
            sharedConfigBuild: true,
            sharedPlugins: true,
            async buildApp(builder) {
              await Promise.all([
                builder.build(builder.environments.client),
                builder.build(builder.environments.ssr),
              ]);
            },
          },
          environments: {
            client: {
              build: {
                outDir: "build/client",
                rollupOptions: {
                  input: "enhanceable/error",
                },
              },
            },
            ssr: {
              build: {
                outDir: "build/ssr",
              },
            },
          },
        };
      },
    },
    directives({
      clientEnvironment: "client",
      serverEnvironments: ["ssr"],
    }),
    scanPass(),
  ];
}
