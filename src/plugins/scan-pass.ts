import { walk } from "estree-walker";
import * as Vite from "vite";

export default function scanPass(): Vite.PluginOption {
  let buildMode: "build" | "scan" = "build";

  return [
    {
      name: "scan-pass",
      enforce: "post",
      sharedDuringBuild: true,
      config(userConfig) {
        const logger = Vite.createLogger("info");
        return {
          builder: {
            sharedConfigBuild: true,
            async buildApp(builder) {
              builder.config.logger.info("Scanning for imports...");
              buildMode = "scan";

              for (const env of Object.values(builder.environments)) {
                env.config.build.write = false;
              }

              if (userConfig.builder?.buildApp) {
                await userConfig.builder.buildApp(builder);
              } else {
                await builder.buildApp();
              }

              buildMode = "build";
              builder.config.logger.info("Building app...");

              for (const env of Object.values(builder.environments)) {
                env.config.build.write = true;
              }

              if (userConfig.builder?.buildApp) {
                await userConfig.builder.buildApp(builder);
              } else {
                await builder.buildApp();
              }
            },
          },
          customLogger: new Proxy(logger, {
            get(t, p) {
              if (buildMode === "scan" && p !== "error") {
                return () => {};
              }
              return t[p as keyof typeof t];
            },
          }),
        };
      },
    },
    {
      name: "scan-pass:transform",
      transform(code) {
        if (buildMode !== "scan") return;

        const ast = this.parse(code);

        let result = "";
        walk(ast, {
          enter(node) {
            const location = node as unknown as { start: number; end: number };
            switch (node.type) {
              case "ImportDeclaration":
                result += `${code.slice(location.start, location.end)}\n`;
                break;
              case "ImportExpression":
                result += `${code.slice(location.start, location.end)}\n`;
                break;
            }
          },
        });

        return `${result}module.exports = {};\n`;
      },
    },
  ];
}
