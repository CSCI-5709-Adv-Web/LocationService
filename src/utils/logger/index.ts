import { randomUUID } from "crypto"
import pino from "pino"
import { pinoHttp } from "pino-http"
import type { Request, Response } from "express"

// Determine environment
const isProduction = process.env.NODE_ENV === "production"

// Set default log level to 'info' to hide debug logs
// This can still be overridden by the LOG_LEVEL environment variable if needed
const logLevel = process.env.LOG_LEVEL || "info"

// Create a custom serializer
const customSerializers = {
  ...pino.stdSerializers,
  // Simple serializers without complex redaction
  req: (req: Request) => {
    // Simplified request serializer
    return {
      id: req.id,
      method: req.method,
      url: req.url,
      // Omit sensitive data instead of trying to redact it
    }
  },
  res: (res: Response) => {
    // Simplified response serializer
    return {
      statusCode: res.statusCode,
    }
  },
}

// Base configuration for all environments
const baseLoggerConfig = {
  level: logLevel,
  base: {
    serviceName: "location-service",
    env: process.env.NODE_ENV || "development",
  },
  serializers: customSerializers,
  timestamp: pino.stdTimeFunctions.isoTime,
  // Remove redaction configuration
}

// Configure different transport options based on environment
const transportConfig = isProduction
  ? {
      targets: [
        // In production, write logs to a file with rotation
        {
          target: "pino/file",
          options: { destination: "./logs/app.log" },
          level: logLevel, // Use the same log level here
        },
        // Also send errors to a separate file
        {
          target: "pino/file",
          options: { destination: "./logs/error.log" },
          level: "error",
        },
      ],
    }
  : {
      // In development, use pretty printing to console
      target: "pino-pretty",
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    }

// Create the logger instance
export const logger = pino({
  ...baseLoggerConfig,
  transport: transportConfig,
})

// Performance tracking utility
export const startTimer = () => {
  const start = process.hrtime.bigint()
  return () => {
    const end = process.hrtime.bigint()
    return Number(end - start) / 1_000_000 // Convert nanoseconds to milliseconds
  }
}

// Create the HTTP logger middleware with request ID generation
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error"
    if (res.statusCode >= 400) return "warn"
    return "info"
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${err?.message || "Unknown error"}`
  },
  customProps: (req, res) => {
    return {
      // Fix: Use type assertion to tell TypeScript this property exists
      responseTime: (res as any).responseTime,
      userAgent: req.headers["user-agent"],
      contentLength: res.getHeader("content-length"),
    }
  },
  // Connect the request object to the response for complete request-response log context
  wrapSerializers: true,
})

// Log uncaught exceptions and unhandled rejections
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception, shutting down")
  process.exit(1)
})

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection, shutting down")
  process.exit(1)
})

