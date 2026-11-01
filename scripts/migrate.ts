import { env } from "../db/runtime";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
await env.DB.prepare("SELECT 1").first();
console.log("SQLite migrations applied successfully.");
