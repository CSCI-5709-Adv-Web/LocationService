import express from "express"
import {
  getAddressSuggestions,
  getCoordinates,
  calculateRoute,
  getDetailedRoute,
} from "../controllers/location.controller"
import { clearAllCache, clearCacheByPrefix, getCacheStats } from "../controllers/cache.controller"
import { authorize } from "../middleware/auth.middleware"

const router = express.Router()

router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "location-service",
    version: "1.0.0",
    endpoints: ["/autocomplete", "/geocode", "/matrix", "/route", "/health"],
  })
})

router.get("/autocomplete", authorize(["location.read"]), getAddressSuggestions)
router.post("/geocode", authorize(["location.read"]), getCoordinates)
router.post("/matrix", authorize(["location.read"]), calculateRoute)
router.post("/route", authorize(["location.read"]), getDetailedRoute)
router.delete("/cache", authorize(["location.admin"]), clearAllCache)
router.delete("/cache/:prefix", authorize(["location.admin"]), clearCacheByPrefix)
router.get("/cache/stats", authorize(["location.admin"]), getCacheStats)
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "location-service" })
})

export default router

