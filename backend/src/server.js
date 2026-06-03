import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { reportRuntimeError } from "./services/errorMonitoringService.js";
import { markRuntimeReady } from "./services/runtimeState.js";
import { ensureSeedData } from "./services/seedService.js";

function installRuntimeMonitoring() {
  if (!env.monitorErrors) {
    return;
  }

  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error("Unhandled rejection", error);
    void reportRuntimeError({ error, label: "unhandled rejection" });
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception", error);
    void reportRuntimeError({ error, label: "uncaught exception" }).finally(() => {
      setTimeout(() => process.exit(1), 1000);
    });
  });
}

async function bootstrap() {
  installRuntimeMonitoring();
  const app = createApp();
  app.listen(env.port, async () => {
    console.log(`Backend running on http://localhost:${env.port}`);

    try {
      await connectDB(env.mongoUri);
      await ensureSeedData();
      markRuntimeReady();
      console.log("Backend runtime ready");
    } catch (error) {
      console.error("Backend bootstrap failed", error);
      void reportRuntimeError({ error, label: "bootstrap failure" }).finally(() => {
        setTimeout(() => process.exit(1), 1000);
      });
    }
  });
}

bootstrap();
