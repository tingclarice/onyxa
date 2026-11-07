import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack(config: unknown) {
    if (typeof config !== "object" || config === null || !("module" in config))
      throw new Error("Missing Webpack module configuration");
    const moduleConfig: unknown = config.module;
    if (
      typeof moduleConfig !== "object" ||
      moduleConfig === null ||
      !("rules" in moduleConfig) ||
      !Array.isArray(moduleConfig.rules)
    )
      throw new Error("Missing Webpack rules");
    const rules: unknown[] = moduleConfig.rules;
    // Compile the same Tailwind entry when using the Webpack build path.
    rules.unshift({
      test: /[\\/]src[\\/]app[\\/]globals\.css$/,
      enforce: "pre",
      use: ["@tailwindcss/turbopack"],
    });
    return config;
  },
};

export default nextConfig;
