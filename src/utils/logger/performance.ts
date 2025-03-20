import { logger, startTimer } from "."

// Track the execution time of an async function
export const trackPerformance = async <T>(
  operationName: string,
  fn: () => Promise<T>,
  meta: Record<string, any> = {}
)
: Promise<T> =>
{
  const timer = startTimer()

  try {
    const result = await fn()
    const duration = timer()

    logger.debug(
      {
        operation: operationName,
        durationMs: duration,
        success: true,
        ...meta,
      },
      `${operationName} completed in ${duration.toFixed(2)}ms`,
    )

    return result;
  } catch (error: any) {
    const duration = timer()

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
      `${operationName} failed after ${duration.toFixed(2)}ms: ${error.message}`,
    )

    throw error
  }
}

// Track resource consumption
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

