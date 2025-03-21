import express from "express";
import locationRoutes from "./routes/location.routes";
import { httpLogger } from "./utils/logger";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import docsRoutes from "./routes/doc.routes";
import crypto from "crypto";

const app = express();

// Add request ID tracking middleware
app.use((req, res, next) => {
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

// Apply middleware
app.use(express.json());
app.use(cors());
app.use(httpLogger); // HTTP request logging

// Add basic security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// API routes
app.use("/location/docs", docsRoutes);
app.use("/location/location", locationRoutes);

// Add a healthcheck endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// Error handling middleware (must be after all routes)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
