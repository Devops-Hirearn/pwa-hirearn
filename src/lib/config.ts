const PRODUCTION_API = "https://api-hirearn.onrender.com/api";

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return PRODUCTION_API;
}

