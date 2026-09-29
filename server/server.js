import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { getOrderDetails } from "./services/orderService.js";
import livekitRoutes from "./routes/livekit.routes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Aura API running on port ${PORT}`);
});