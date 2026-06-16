import Constants from "expo-constants";
import { Platform } from "react-native";

export const getBaseUrl = (): string => {
  // On web (browser/Runable preview), use same-origin API via relative URL base
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // If we're served from the Runable preview domain, the API is on port 4200
    const host = window.location.hostname;
    const isRunable = host.includes("runable.site");
    if (isRunable) {
      // Replace port 4300 (mobile) with 4200 (API) in preview URL
      const apiHost = host.replace("-4300.", "-4200.");
      return `https://${apiHost}`;
    }
    // Local dev web
    return "http://localhost:4200";
  }

  // Native device: use configured URL from app.json extra
  const url =
    Constants.expoConfig?.extra?.apiUrl ??
    process.env.EXPO_PUBLIC_API_URL ??
    "http://localhost:4200";
  return url.replace(/\/$/, "");
};

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}/api${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
