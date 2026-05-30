import { config } from "./config.js";
import app from "./app.js";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
