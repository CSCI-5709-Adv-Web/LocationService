import { LocationClient, SearchPlaceIndexForTextCommand, CalculateRouteMatrixCommand } from "@aws-sdk/client-location";
import { AWS_CONFIG } from "../config";
import { logger } from "../utils/logger";
import dotenv from 'dotenv';

dotenv.config();

const client = new LocationClient(AWS_CONFIG);

// Convert address to latitude/longitude
const getCoordinates = async (address: string) => {
    try {
        logger.info(`Fetching coordinates for: ${address}`);
        const command = new SearchPlaceIndexForTextCommand({
            IndexName: process.env.AWS_PLACE_INDEX || "Place-Index-1",
            Text: address,
        });

        const response = await client.send(command);

        if (response.Results && response.Results.length > 0) {
            const { Geometry } = response.Results[0].Place;
            return { lat: Geometry?.Point?.[1], lng: Geometry?.Point?.[0] };
        }

        throw new Error("No results found");
    } catch (error) {
        logger.error(`Error fetching coordinates: ${error.message}`);
        throw new Error(`Error fetching coordinates: ${error.message}`);
    }
};

// Calculate shortest road distance using AWS Route Matrix
export const calculateRoute = async (fromAddress: string, toAddress: string) => {

    try {
        logger.info(`Calculating route from ${fromAddress} to ${toAddress}`);

        // Get Coordinates for Both Addresses
        const fromCoords = await getCoordinates(fromAddress);
        const toCoords = await getCoordinates(toAddress);

        // Prepare AWS Route Command
        const command = new CalculateRouteMatrixCommand({
            CalculatorName: process.env.AWS_ROUTE_CALCULATOR || "Route-Calculator-1",
            DeparturePositions: [[fromCoords.lng, fromCoords.lat]],
            DestinationPositions: [[toCoords.lng, toCoords.lat]],
            TravelMode: "Car"
        });

        const response = await client.send(command);

        // Extract Distance & Duration from Response
        if (response.RouteMatrix && response.RouteMatrix.length > 0 && response.RouteMatrix[0].length > 0) {
            const routeData = response.RouteMatrix[0][0]; // First destination result
            return {
                from: { address: fromAddress, ...fromCoords },
                to: { address: toAddress, ...toCoords },
                distanceKm: routeData.Distance || "Unknown",
                durationMinutes: routeData.DurationSeconds ? (routeData.DurationSeconds / 60).toFixed(2) : "Unknown"
            };
        }

        throw new Error("No route found");
    } catch (error) {
        logger.error(`Error calculating route: ${error.message}`);
        throw new Error(`Error calculating route: ${error.message}`);
    }
};
