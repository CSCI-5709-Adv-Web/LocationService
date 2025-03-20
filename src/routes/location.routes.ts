import express from "express"
import {
  findCoordinates,
  calculateRouteMatrix,
  getRouteDetails,
  getAddressAutocomplete,
} from "../repository/location.repository"
import { logger } from "../utils/logger"
import { redis } from "../config/redis"

const router = express.Router()

// Address Autocomplete API
router.get("/autocomplete", async (req, res) => {
  try {
    const { text, maxResults, language } = req.query

    if (!text) {
      return res.status(400).json({ error: "Search text is required" })
    }

    // Parse maxResults as number or use default
    const limit = maxResults ? Number.parseInt(maxResults as string, 10) : 5

    // Validate maxResults is a positive number
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: "maxResults must be a positive number" })
    }

    const suggestions = await getAddressAutocomplete(text as string, limit, language as string)

    // Even if we get an empty array due to unsupported operation, return it as a valid response
    res.json(suggestions)
  } catch (error) {
    logger.error(`Autocomplete error: ${error.message}`)
    // Return an empty array instead of an error when the feature is not supported
    if (error.message && error.message.includes("IntendedUse") && error.message.includes("Storage")) {
      res.json([])
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// Geocoding API
router.post("/geocode", async (req, res) => {
  try {
    const { address } = req.body
    if (!address) {
      return res.status(400).json({ error: "Address is required" })
    }

    const coordinates = await findCoordinates(address)
    res.json(coordinates)
  } catch (error) {
    logger.error(`Geocoding error: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

// Route Calculation API
router.post("/matrix", async (req, res) => {
  try {
    const { fromAddress, toAddress } = req.body
    if (!fromAddress || !toAddress) {
      return res.status(400).json({ error: "Both 'fromAddress' and 'toAddress' are required" })
    }

    const routeData = await calculateRouteMatrix(fromAddress, toAddress)
    res.json(routeData)
  } catch (error) {
    logger.error(`Route matrix error: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

// Detailed Route API
router.post("/route", async (req, res) => {
  try {
    const { fromAddress, toAddress } = req.body
    if (!fromAddress || !toAddress) {
      return res.status(400).json({ error: "Both 'fromAddress' and 'toAddress' are required" })
    }

    const detailedRoute = await getRouteDetails(fromAddress, toAddress)
    res.json(detailedRoute)
  } catch (error) {
    logger.error(`Detailed route error: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

// Cache management endpoints (admin only)
router.delete("/cache", async (req, res) => {
  try {
    // In a production environment, you should add authentication here
    await redis.flushall()
    logger.info("Cache cleared successfully")
    res.json({ message: "Cache cleared successfully" })
  } catch (error) {
    logger.error(`Cache clear error: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

router.delete("/cache/:prefix", async (req, res) => {
  try {
    const { prefix } = req.params
    // In a production environment, you should add authentication here

    if (!prefix) {
      return res.status(400).json({ error: "Cache prefix is required" })
    }

    // Get all keys with the given prefix
    const keys = await redis.keys(`${prefix}:*`)

    if (keys.length === 0) {
      return res.json({ message: `No cache keys found with prefix ${prefix}` })
    }

    // Delete all keys with the given prefix
    const deleted = await redis.del(...keys)

    logger.info(`Deleted ${deleted} cache keys with prefix ${prefix}`)
    res.json({ message: `Deleted ${deleted} cache keys with prefix ${prefix}` })
  } catch (error) {
    logger.error(`Cache delete error: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

// Cache statistics endpoint
router.get("/cache/stats", async (req, res) => {
  try {
    // Get cache statistics
    const info = await redis.info()
    const dbSize = await redis.dbsize()

    // Get counts of different cache types
    const coordinatesCount = (await redis.keys("coordinates:*")).length
    const routeCount = (await redis.keys("route:*")).length
    const detailedRouteCount = (await redis.keys("detailedRoute:*")).length
    const suggestionsCount = (await redis.keys("suggestions:*")).length

    res.json({
      totalKeys: dbSize,
      typeCounts: {
        coordinates: coordinatesCount,
        routes: routeCount,
        detailedRoutes: detailedRouteCount,
        suggestions: suggestionsCount,
      },
      redisInfo: info,
    })
  } catch (error) {
    logger.error(`Cache stats error: ${error.message}`)
    res.status(500).json({ error: error.message })
  }
})

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "location-service" })
})

export default router

