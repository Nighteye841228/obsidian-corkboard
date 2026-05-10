import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: ["./tests/setup.ts"],
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		alias: {
			obsidian: resolve(__dirname, "./tests/__mocks__/obsidian.ts"),
		},
	},
	oxc: {
		jsx: {
			runtime: "automatic",
			importSource: "preact",
		},
	},
});
