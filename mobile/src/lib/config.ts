// Local dev: point this at your machine's LAN IP (not localhost) so a phone
// on Expo Go can reach the Django backend, e.g. "http://192.168.1.20:8000/api/v1".
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
