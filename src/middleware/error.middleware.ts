import type { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger"

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error with contextual information
  logger.error(
    {
      err,
      request: {
        id: req.id,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
      },
      // Log the user info if available
      user: (req as any).user?.id,
    },
    `Error handling request: ${err.message}`,
  )

  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err)
  }

  // Determine appropriate status code
  const statusCode = (err as any).statusCode || 500

  // Create a user-friendly error response
  // In production, don't expose internal error details
  const errorResponse = {
    status: "error",
    message: process.env.NODE_ENV === "production" && statusCode === 500 ? "Internal Server Error" : err.message,
    timestamp: new Date().toISOString(),
    // Only include error details in non-production environments
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
      code: (err as any).code,
    }),
  }

  res.status(statusCode).json(errorResponse)
}

// 404 Not Found handler
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn(
    {
      request: {
        id: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
    },
    `Route not found: ${req.method} ${req.originalUrl}`,
  )

  res.status(404).json({
    status: "error",
    message: "The requested resource was not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  })
}

