import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

import enhanceable from "./src/vite.ts";

export default defineConfig(({ mode }) => ({
	plugins: [
		enhanceable(),
		mode !== "test" && cloudflare({ viteEnvironment: { name: "ssr" } }),
	],
}));
