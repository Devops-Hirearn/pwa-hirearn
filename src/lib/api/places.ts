import { apiRequest } from "./client";

export type PlacePrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export async function placesAutocomplete(input: string) {
  if (!input.trim() || input.trim().length < 2) {
    return { success: true as const, predictions: [] as PlacePrediction[] };
  }
  return apiRequest<{ success: boolean; predictions: PlacePrediction[] }>(
    "/places/autocomplete?input=" + encodeURIComponent(input.trim()),
  );
}

export async function placeDetails(placeId: string) {
  return apiRequest<{
    success: boolean;
    place: {
      placeId: string;
      formattedAddress: string;
      coordinates: { latitude: number; longitude: number } | null;
      city: string;
      state: string;
      pincode: string;
    };
  }>("/places/details?place_id=" + encodeURIComponent(placeId));
}
