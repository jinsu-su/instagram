"use client"

/**
 * Securely detect the production environment and set the appropriate API base URL.
 * This provides a failsafe in case environment variables are missing during the build process.
 */
const getBaseUrl = () => {
    // 1. Explicit override via environment variable (Highest priority)
    const envUrl = process.env.REACT_APP_INSTAGRAM_API_BASE_URL;
    if (envUrl) return envUrl;

    // 2. Security-conscious production fallback
    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        
        // Failsafe: If running on the official production domain or its subdomains, 
        // always target the official production API.
        if (hostname === "aidm.kr" || hostname.endsWith(".aidm.kr") || hostname.endsWith(".pages.dev")) {
            return "https://api.aidm.kr";
        }
    }

    // 3. Development fallback
    return "http://localhost:8000";
};

const rawBaseUrl = getBaseUrl();

export const INSTAGRAM_API_BASE_URL = rawBaseUrl.endsWith("/")
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl;

export const isInstagramApiConfigured = INSTAGRAM_API_BASE_URL.length > 0;
