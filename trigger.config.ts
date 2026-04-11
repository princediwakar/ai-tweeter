// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_xcvmdulgbemsmbfonvzn", 
  runtime: "node",
  logLevel: "info",
  
  maxDuration: 3600,

  dirs: ["./trigger"], 
});