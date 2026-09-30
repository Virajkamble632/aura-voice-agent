import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { getOrderDetails } from "./services/orderService.js";
import livekitRoutes from "./routes/livekit.routes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// CLIENT_URL may be a single origin or a comma-separated list, e.g.:
//   http://localhost:5173,https://aura.example.com
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin (curl, server-to-server) OR
      // any origin in the allowed list.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);

app.use(express.json());

app.use("/api/livekit", livekitRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Aura Voice Agent API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
  });
});

app.get("/api/orders/:orderId", (req, res) => {
  const result = getOrderDetails(req.params.orderId);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json(result);
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Fail fast if critical env vars are missing so a broken deployment
// is obvious immediately instead of failing per-request.
const REQUIRED_ENV = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"];
for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    console.warn(`⚠️ Missing environment variable: ${name}`);
  }
}
if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️ Missing environment variable: GROQ_API_KEY (only needed by the agent)");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Aura API running on port ${PORT}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(", ") || "(none)"}`);
});