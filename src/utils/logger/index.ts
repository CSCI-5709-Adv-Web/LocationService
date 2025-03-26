import { randomUUID } from "crypto"
import pino from "pino"
import { pinoHttp } from "pino-http"
import type { Request, Response } from "express"
import { SERVER_CONFIG } from "../../config"

const isProduction = SERVER_CONFIG.NODE_ENV === "production"
const logLevel = SERVER_CONFIG.LOG_LEVEL
const customSerializers = {
  ...pino.stdSerializers,
  req: (req: Request) => {
    return {
      id: req.id,
      method: req.method,
      url: req.url,
    }
  },
  res: (res: Response) => {
    return {
      statusCode: res.statusCode,
    }
  },
}

const baseLoggerConfig = {
  level: logLevel,
  base: {
    serviceName: "location-service",
    env: SERVER_CONFIG.NODE_ENV,
  },
  serializers: customSerializers,
  timestamp: pino.stdTimeFunctions.isoTime,
}

const transportConfig = isProduction
  ? {
      targets: [
        {
          target: "pino/file",
          options: { destination: "./logs/app.log" },
          level: logLevel,
        },
        {
          target: "pino/file",
          options: { destination: "./logs/error.log" },
          level: "error",
        },
      ],
    }
  : {
      target: "pino-pretty",
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    }
export const logger = pino({
  ...baseLoggerConfig,
  transport: transportConfig,
})

export const startTimer = () => {
  const start = process.hrtime.bigint()
  return () => {
    const end = process.hrtime.bigint()
    return Number(end - start) / 1_000_000
  }
}

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
      responseTime: (res as any).responseTime,
      userAgent: req.headers["user-agent"],
      contentLength: res.getHeader("content-length"),
    }
  },
  wrapSerializers: true,
})

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception, shutting down")
  process.exit(1)
})

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection, shutting down")
  process.exit(1)
})

