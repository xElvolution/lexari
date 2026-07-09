import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias as Record<string, string>),
      "@": process.cwd(),
    },
  },
}));

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);
Config.setOutputLocation(path.join("tmp", "out.mp4"));
