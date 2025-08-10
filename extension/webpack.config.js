import path from "path";

export default {
  entry: {
    background: "./src/background.js",
    content: "./src/content-scripts/content.js",
    page: "./src/page.js"
  },
  output: {
    path: path.resolve("dist"),
    filename: "[name].js",
    clean: true,
    module: true   // 👈 required for background as module
  },
  experiments: {
    outputModule: true  // 👈 required when output.module = true
  },
  resolve: {
    extensions: [".js"]
  },
  target: "webworker"  // 👈 required for service worker
};
