import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/dom.ts",
		"src/enhanceable.ts",
		"src/error.ts",
		"src/vite.ts",
		"./src/context/browser.ts",
		"./src/context/node.ts",
	],
	external: ["enhanceable/context"],
	format: "esm",
	target: "es2024",
	platform: "node",
	dts: true,
});
