import { pinoHttp } from "pino-http";
import pino from "pino";

export const logger = pino({
  level: "info",
  base: {
    serviceName: "location-service",
  },
  serializers: pino.stdSerializers,
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  transport: {
    target: "pino-pretty", // Pretty logging in development; can switch to Sentry for production
    options: { colorize: true },
    level: "info",
  },
});

export const httpLogger = pinoHttp({
  level: "error",
  logger,
});
