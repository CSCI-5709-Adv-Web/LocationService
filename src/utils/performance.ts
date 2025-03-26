import { logger } from "./logger"

// Track the execution time of an async function
export const trackPerformance = async <T>(
  operationName: string,
  fn: () => Promise<T>,
  meta: Record<string, any> = {}
)
: Promise<T> =>
{
  const startTime = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - startTime
    logger.debug(
      {
        operation: operationName,
        durationMs: duration,
        success: true,
        ...meta,
      },
      `${operationName} completed in ${duration}ms`,
    )
    return result
  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error(
      {
        operation: operationName,
        durationMs: duration,
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
        },
        ...meta,
      },
      `${operationName} failed after ${duration}ms: ${error.message}`,
    )
    throw error
  }
}

export const logResourceUsage = (label = "Resource usage") => {
  const memoryUsage = process.memoryUsage()
  logger.debug(
    {
      memoryUsage: {
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + " MB",
        heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + " MB",
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + " MB",
        external: (memoryUsage.external / 1024 / 1024).toFixed(2) + " MB",
      },
      cpuUsage: process.cpuUsage(),
    },
    label,
  )
}

// Schedule periodic resource monitoring
export const startResourceMonitoring = (intervalMs = 60000) => {
  const interval = setInterval(() => {
    logResourceUsage()
  }, intervalMs)

  // Don't prevent the process from exiting
  interval.unref()

  return () => clearInterval(interval)
}

