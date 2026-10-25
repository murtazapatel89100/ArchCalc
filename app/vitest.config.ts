import { defineConfig } from "vitest/config";

// Unit tests cover pure logic only, so they skip the Solid/Tailwind plugins and run in Node.
export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
});
