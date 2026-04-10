// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_xcvmdulgbemsmbfonvzn", // (Keep whatever ID is already here)
  runtime: "node",
  logLevel: "log",
  
  // ADD THIS LINE:
  maxDuration: 3600, // 1 hour default fallback for all tasks

  dirs: ["./trigger"], // (Or whichever directory it set)
});