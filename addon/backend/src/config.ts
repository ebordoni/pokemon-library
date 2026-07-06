import fs from "fs";
import path from "path";

interface AppConfig {
  grokApiKey: string;
  port: number;
  dataDir: string;
}

function loadConfig(): AppConfig {
  const dataDir =
    process.env.DATA_DIR ??
    (process.env.NODE_ENV === "production" ? "/data" : "./data");

  // In HA addon context, options are written by Supervisor to /data/options.json
  let grokApiKey = process.env.GROK_API_KEY ?? "";

  const optionsPath = path.join(dataDir, "options.json");
  if (fs.existsSync(optionsPath)) {
    try {
      const options = JSON.parse(
        fs.readFileSync(optionsPath, "utf-8"),
      ) as Record<string, string>;
      grokApiKey = options["grok_api_key"] ?? grokApiKey;
    } catch {
      console.warn(
        "[config] Could not parse options.json — falling back to environment variables",
      );
    }
  }

  return {
    grokApiKey,
    port: parseInt(process.env.PORT ?? "3001", 10),
    dataDir,
  };
}

export const config = loadConfig();
