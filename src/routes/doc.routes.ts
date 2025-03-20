import express from "express"

const router = express.Router()

router.get("/", (req, res) => {
  res.json({
    service: "Location Service API",
    version: "1.0.0",
    endpoints: [
      {
        path: "/api/location/autocomplete",
        method: "GET",
        description:
          "Get address suggestions for autocomplete (Note: Limited functionality if AWS Place Index has IntendedUse set to Storage)",
        query: {
          text: "string (required)",
          maxResults: "number (optional, default: 5)",
          language: "string (optional, default: en)",
        },
      },
      {
        path: "/api/location/geocode",
        method: "POST",
        description: "Convert address to coordinates",
        body: { address: "string" },
      },
      {
        path: "/api/location/matrix",
        method: "POST",
        description: "Calculate distance and duration between two addresses",
        body: { fromAddress: "string", toAddress: "string" },
      },
      {
        path: "/api/location/route",
        method: "POST",
        description: "Get detailed route with waypoints between two addresses",
        body: { fromAddress: "string", toAddress: "string" },
      },
      {
        path: "/api/location/cache",
        method: "DELETE",
        description: "Clear all cache (admin only)",
      },
      {
        path: "/api/location/cache/:prefix",
        method: "DELETE",
        description: "Clear cache entries with a specific prefix (admin only)",
        params: {
          prefix: "string (e.g., coordinates, route, detailedRoute, suggestions)",
        },
      },
      {
        path: "/api/location/cache/stats",
        method: "GET",
        description: "Get cache statistics",
      },
      {
        path: "/api/location/health",
        method: "GET",
        description: "Health check endpoint",
      },
    ],
  })
})

export default router

