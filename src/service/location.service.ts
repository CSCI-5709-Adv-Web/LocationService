import {
  LocationClient,
  SearchPlaceIndexForTextCommand,
  CalculateRouteMatrixCommand,
  CalculateRouteCommand,
  SearchPlaceIndexForSuggestionsCommand,
  type SearchPlaceIndexForSuggestionsCommandInput,
} from "@aws-sdk/client-location";
import { AWS_CONFIG } from "../config";
import { logger } from "../utils/logger";
import { trackPerformance } from "../utils/logger/performance";
import {
  generateCacheKey,
  getCachedData,
  setCachedData,
} from "../config/redis";
import type { GeocodeResponse } from "../types/location.type";
import dotenv from "dotenv";

dotenv.config();

const client = new LocationClient(AWS_CONFIG);

// Cache TTL values (in seconds)
const CACHE_TTL = {
  SUGGESTIONS: 24 * 60 * 60, // 24 hours
  COORDINATES: 30 * 24 * 60 * 60, // 30 days
  ROUTES: 7 * 24 * 60 * 60, // 7 days
};

// Type definitions for our cached data
interface AddressSuggestion {
  text: string;
  placeId: string;
  description: string;
}

interface RouteData {
  from: {
    address: string;
    lat: number;
    lng: number;
  };
  to: {
    address: string;
    lat: number;
    lng: number;
  };
  distanceKm: number | string;
  durationMinutes: string;
}

interface DetailedRouteData {
  from: {
    address: string;
    lat: number;
    lng: number;
  };
  to: {
    address: string;
    lat: number;
    lng: number;
  };
  summary: {
    distance: number | string;
    durationMinutes: string;
  };
  legs: Array<{
    distance: number | undefined;
    durationMinutes: string;
    steps: Array<{
      distance: number | undefined;
      durationSeconds: number | undefined;
      startPosition: number[] | undefined;
      endPosition: number[] | undefined;
    }>;
  }>;
  route: {
    geometry: number[][];
  };
}

export const getAddressSuggestions = async (
  text: string,
  maxResults = 5,
  language = "en"
): Promise<AddressSuggestion[]> => {
  return trackPerformance(
    "GetAddressSuggestions",
    async () => {
      try {
        // Generate cache key
        const cacheKey = generateCacheKey("suggestions", {
          text,
          maxResults,
          language,
        });

        // Try to get from cache first
        const cachedResult = await getCachedData<AddressSuggestion[]>(cacheKey);
        if (cachedResult) {
          logger.debug(`Cache hit for address suggestions: ${text}`);
          return cachedResult;
        }

        logger.debug(`Cache miss for address suggestions: ${text}`);
        logger.debug(`Fetching address suggestions for: ${text}`);

        const params: SearchPlaceIndexForSuggestionsCommandInput = {
          IndexName: process.env.AWS_PLACE_INDEX || "Place-Index-1",
          Text: text,
          MaxResults: maxResults,
          Language: language,
          FilterCountries: ["CAN"], // Restrict to Canada
        };

        const command = new SearchPlaceIndexForSuggestionsCommand(params);
        const response = await client.send(command);

        const results: AddressSuggestion[] = [];
        if (response.Results && response.Results.length > 0) {
          response.Results.forEach((result) => {
            if (result.Text) {
              results.push({
                text: result.Text,
                placeId: result.PlaceId || "",
                description: result.Text, // Use Text as fallback if Description doesn't exist
              });
            }
          });

          // Cache the results
          await setCachedData(cacheKey, results, CACHE_TTL.SUGGESTIONS);
        }

        return results;
      } catch (error) {
        // Handle IntendedUse limitation
        if (
          error.name === "ValidationException" &&
          error.message.includes("IntendedUse") &&
          error.message.includes("Storage")
        ) {
          logger.warn(
            `Place index with IntendedUse set to Storage doesn't support suggestions. Using search as fallback.`
          );

          // Fallback to SearchPlaceIndexForText
          try {
            const command = new SearchPlaceIndexForTextCommand({
              IndexName: process.env.AWS_PLACE_INDEX || "Place-Index-1",
              Text: text,
              MaxResults: maxResults,
              FilterCountries: ["CAN"],
              FilterBBox: [-66.4, 43.3, -59.8, 47.0],
            });

            const response = await client.send(command);

            const results: AddressSuggestion[] = [];
            if (response.Results && response.Results.length > 0) {
              response.Results.forEach((result) => {
                if (result.Place && result.Place.Label) {
                  results.push({
                    text: result.Place.Label,
                    placeId: result.PlaceId || "",
                    description: result.Place.Label,
                  });
                }
              });
            }

            return results;
          } catch (fallbackError) {
            logger.error({ err: fallbackError }, `Fallback search also failed`);
            return [];
          }
        }

        logger.error(
          { err: error },
          `Address suggestions failed: ${error.message}`
        );
        return [];
      }
    },
    { text, maxResults }
  );
};

// Get address suggestions for autocomplete
// export const getAddressSuggestions = async (
//   text: string,
//   maxResults = 5,
//   language = "en",
// ): Promise<AddressSuggestion[]> => {
//   return trackPerformance(
//     "GetAddressSuggestions",
//     async () => {
//       try {
//         // Generate cache key
//         const cacheKey = generateCacheKey("suggestions", { text, maxResults, language })

//         // Try to get from cache first
//         const cachedResult = await getCachedData<AddressSuggestion[]>(cacheKey)
//         if (cachedResult) {
//           logger.debug(`Cache hit for address suggestions: ${text}`)
//           return cachedResult
//         }

//         logger.debug(`Cache miss for address suggestions: ${text}`)
//         logger.debug(`Fetching address suggestions for: ${text}`)

//         const params: SearchPlaceIndexForSuggestionsCommandInput = {
//           IndexName: process.env.AWS_PLACE_INDEX || "Place-Index-1",
//           Text: text,
//           MaxResults: maxResults,
//           Language: language,
//         }

//         const command = new SearchPlaceIndexForSuggestionsCommand(params)
//         const response = await client.send(command)

//         const results: AddressSuggestion[] = []
//         if (response.Results && response.Results.length > 0) {
//           response.Results.forEach((result) => {
//             if (result.Text) {
//               results.push({
//                 text: result.Text,
//                 placeId: result.PlaceId || "",
//                 description: result.Text, // Use Text as fallback if Description doesn't exist
//               })
//             }
//           })

//           // Cache the results
//           await setCachedData(cacheKey, results, CACHE_TTL.SUGGESTIONS)
//         }

//         return results
//       } catch (error) {
//         // Check if the error is related to IntendedUse limitation
//         if (
//           error.name === "ValidationException" &&
//           error.message.includes("IntendedUse") &&
//           error.message.includes("Storage")
//         ) {
//           logger.warn(
//             `Place index with IntendedUse set to Storage doesn't support suggestions. Using search as fallback.`,
//           )

//           // Fallback to using SearchPlaceIndexForText as an alternative
//           try {
//             const command = new SearchPlaceIndexForTextCommand({
//               IndexName: process.env.AWS_PLACE_INDEX || "Place-Index-1",
//               Text: text,
//               MaxResults: maxResults,
//             })

//             const response = await client.send(command)

//             const results: AddressSuggestion[] = []
//             if (response.Results && response.Results.length > 0) {
//               response.Results.forEach((result) => {
//                 if (result.Place && result.Place.Label) {
//                   results.push({
//                     text: result.Place.Label,
//                     placeId: result.PlaceId || "",
//                     description: result.Place.Label,
//                   })
//                 }
//               })
//             }

//             return results
//           } catch (fallbackError) {
//             logger.error({ err: fallbackError }, `Fallback search also failed`)
//             return []
//           }
//         }

//         // For other errors, log and return empty array
//         logger.error({ err: error }, `Address suggestions failed: ${error.message}`)
//         return []
//       }
//     },
//     { text, maxResults },
//   )
// }

// Convert address to latitude/longitude
export const getCoordinates = async (
  address: string
): Promise<GeocodeResponse> => {
  return trackPerformance(
    "GetCoordinates",
    async () => {
      // Generate cache key
      const cacheKey = generateCacheKey("coordinates", { address });

      // Try to get from cache first
      const cachedResult = await getCachedData<GeocodeResponse>(cacheKey);
      if (
        cachedResult &&
        typeof cachedResult.lat === "number" &&
        typeof cachedResult.lng === "number"
      ) {
        logger.debug(`Cache hit for coordinates: ${address}`);
        return cachedResult;
      }

      logger.debug(`Cache miss for coordinates: ${address}`);
      logger.debug(`Fetching coordinates for: ${address}`);

      const command = new SearchPlaceIndexForTextCommand({
        IndexName: process.env.AWS_PLACE_INDEX || "Place-Index-1",
        Text: address,
      });

      const response = await client.send(command);

      if (response.Results && response.Results.length > 0) {
        const { Geometry } = response.Results[0].Place;

        if (!Geometry?.Point || Geometry.Point.length < 2) {
          throw new Error("Invalid geometry data received");
        }

        const coordinates: GeocodeResponse = {
          lat: Geometry.Point[1],
          lng: Geometry.Point[0],
        };

        // Cache the coordinates
        await setCachedData(cacheKey, coordinates, CACHE_TTL.COORDINATES);

        return coordinates;
      }

      throw new Error("No results found");
    },
    { address }
  );
};

// Calculate shortest road distance using AWS Route Matrix
export const calculateRoute = async (
  fromAddress: string,
  toAddress: string
): Promise<RouteData> => {
  return trackPerformance(
    "CalculateRouteMatrix",
    async () => {
      // Generate cache key
      const cacheKey = generateCacheKey("route", { fromAddress, toAddress });

      // Try to get from cache first
      const cachedResult = await getCachedData<RouteData>(cacheKey);
      if (
        cachedResult &&
        cachedResult.from &&
        cachedResult.to &&
        typeof cachedResult.from.lat === "number" &&
        typeof cachedResult.from.lng === "number" &&
        typeof cachedResult.to.lat === "number" &&
        typeof cachedResult.to.lng === "number"
      ) {
        logger.debug(`Cache hit for route: ${fromAddress} to ${toAddress}`);
        return cachedResult;
      }

      logger.debug(`Cache miss for route: ${fromAddress} to ${toAddress}`);
      logger.debug(
        `Calculating route matrix from ${fromAddress} to ${toAddress}`
      );

      // Get Coordinates for Both Addresses
      const fromCoords = await getCoordinates(fromAddress);
      const toCoords = await getCoordinates(toAddress);

      // Prepare AWS Route Command
      const command = new CalculateRouteMatrixCommand({
        CalculatorName:
          process.env.AWS_ROUTE_CALCULATOR || "Route-Calculator-1",
        DeparturePositions: [[fromCoords.lng, fromCoords.lat]],
        DestinationPositions: [[toCoords.lng, toCoords.lat]],
        TravelMode: "Car",
      });

      const response = await client.send(command);

      // Extract Distance & Duration from Response
      if (
        response.RouteMatrix &&
        response.RouteMatrix.length > 0 &&
        response.RouteMatrix[0].length > 0
      ) {
        const routeData = response.RouteMatrix[0][0]; // First destination result
        const result: RouteData = {
          from: { address: fromAddress, ...fromCoords },
          to: { address: toAddress, ...toCoords },
          distanceKm: routeData.Distance || "Unknown",
          durationMinutes: routeData.DurationSeconds
            ? (routeData.DurationSeconds / 60).toFixed(2)
            : "Unknown",
        };

        // Cache the route data
        await setCachedData(cacheKey, result, CACHE_TTL.ROUTES);

        return result;
      }

      throw new Error("No route found");
    },
    { fromAddress, toAddress }
  );
};

// Get detailed route with waypoints using AWS Calculate Route
export const getDetailedRoute = async (
  fromAddress: string,
  toAddress: string
): Promise<DetailedRouteData> => {
  return trackPerformance(
    "GetDetailedRoute",
    async () => {
      // Generate cache key
      const cacheKey = generateCacheKey("detailedRoute", {
        fromAddress,
        toAddress,
      });

      // Try to get from cache first
      const cachedResult = await getCachedData<DetailedRouteData>(cacheKey);
      if (
        cachedResult &&
        cachedResult.from &&
        cachedResult.to &&
        typeof cachedResult.from.lat === "number" &&
        typeof cachedResult.from.lng === "number" &&
        typeof cachedResult.to.lat === "number" &&
        typeof cachedResult.to.lng === "number"
      ) {
        logger.debug(
          `Cache hit for detailed route: ${fromAddress} to ${toAddress}`
        );
        return cachedResult;
      }

      logger.debug(
        `Cache miss for detailed route: ${fromAddress} to ${toAddress}`
      );
      logger.debug(
        `Calculating detailed route from ${fromAddress} to ${toAddress}`
      );

      // Get Coordinates for Both Addresses
      const fromCoords = await getCoordinates(fromAddress);
      const toCoords = await getCoordinates(toAddress);

      // Prepare AWS Calculate Route Command
      const command = new CalculateRouteCommand({
        CalculatorName:
          process.env.AWS_ROUTE_CALCULATOR || "Route-Calculator-1",
        DeparturePosition: [fromCoords.lng, fromCoords.lat],
        DestinationPosition: [toCoords.lng, toCoords.lat],
        TravelMode: "Car",
        IncludeLegGeometry: true, // Include the actual path geometry
      });

      const response = await client.send(command);

      // Process the response to extract route details
      const result: DetailedRouteData = {
        from: { address: fromAddress, ...fromCoords },
        to: { address: toAddress, ...toCoords },
        summary: {
          distance: response.Summary?.Distance || "Unknown",
          durationMinutes: response.Summary?.DurationSeconds
            ? (response.Summary.DurationSeconds / 60).toFixed(2)
            : "Unknown",
        },
        legs:
          response.Legs?.map((leg) => ({
            distance: leg.Distance,
            durationMinutes: leg.DurationSeconds
              ? (leg.DurationSeconds / 60).toFixed(2)
              : "Unknown",
            steps:
              leg.Steps?.map((step) => ({
                distance: step.Distance,
                durationSeconds: step.DurationSeconds,
                startPosition: step.StartPosition,
                endPosition: step.EndPosition,
              })) || [],
          })) || [],
        route: {
          geometry:
            response.Legs?.flatMap((leg) => leg.Geometry?.LineString || []) ||
            [],
        },
      };

      // Cache the detailed route data
      await setCachedData(cacheKey, result, CACHE_TTL.ROUTES);

      return result;
    },
    { fromAddress, toAddress }
  );
};
