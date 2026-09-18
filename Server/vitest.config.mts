import { defineConfig } from "vitest/config";

// Tests cover the pure parts only (scoring, placement, URL detection): no database, no Redis.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
