import app from "./express-app"
import { logger } from "./utils/logger"
import { startResourceMonitoring } from "./utils/performance"
import os from "os"
import { SERVER_CONFIG } from "./config"

const PORT = SERVER_CONFIG.PORT
const logSystemInfo = () => {
  const numCPUs = os.cpus().length
  const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) // GB
  const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2) // GB
  logger.info(
    {
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: numCPUs,
        totalMemoryGB: totalMemory,
        freeMemoryGB: freeMemory,
        uptime: os.uptime(),
      },
    },
    `Starting Location Service with Node ${process.version} on ${os.platform()} (${numCPUs} CPUs, ${totalMemory}GB RAM)`,
  )
}
const startServer = () => {
  try {
    logSystemInfo()
    startResourceMonitoring(60000)
    const server = app.listen(PORT, () => {
      logger.info(`Location Service running on port ${PORT}`)
      logger.info(`Environment: ${SERVER_CONFIG.NODE_ENV}`)
      logger.info(`Log level: ${logger.level}`)
    })
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use. Please choose a different port.`)
        process.exit(1)
      } else {
        logger.error({ err: error }, `Failed to start server: ${error.message}`)
        process.exit(1)
      }
    })
    const shutdown = () => {
      logger.info("Shutting down gracefully...")
      server.close(() => {
        logger.info("Server closed successfully")
        process.exit(0)
      })
      setTimeout(() => {
        logger.error("Could not close connections in time, forcefully shutting down")
        process.exit(1)
      }, 10000)
    }
    process.on("SIGTERM", shutdown)
    process.on("SIGINT", shutdown)
  } catch (error) {
    logger.fatal({ err: error }, `Failed to start Location Service: ${error.message}`)
    process.exit(1)
  }
}
startServer()

