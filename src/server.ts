import { app } from "./app";
import { appConfig } from "./config/env";

const server = app.listen(appConfig.port, () => {
  console.log(`Server listening on port ${appConfig.port}`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
