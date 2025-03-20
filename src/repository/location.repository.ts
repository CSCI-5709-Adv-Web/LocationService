import { getCoordinates, calculateRoute, getDetailedRoute, getAddressSuggestions } from "../service/location.service";
import { Location } from "../types";
import { GeocodeResponse } from "../types/location.type";

export const findCoordinates = async (address: string): Promise<GeocodeResponse> => {
    return await getCoordinates(address);
};

export const calculateRouteMatrix = async (fromAddress: string, toAddress: string) => {
    return await calculateRoute(fromAddress, toAddress);
};

export const getRouteDetails = async (fromAddress: string, toAddress: string) => {
    return await getDetailedRoute(fromAddress, toAddress);
};

export const getAddressAutocomplete = async (text: string, maxResults: number = 5, language: string = 'en') => {
    return await getAddressSuggestions(text, maxResults, language);
};