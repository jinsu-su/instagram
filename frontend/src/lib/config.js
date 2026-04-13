"use client"

// 환경 변수에서 URL 가져오기 (우선순위: 환경 변수 > 기본값)
const envUrl = process.env.REACT_APP_INSTAGRAM_API_BASE_URL
  ? process.env.REACT_APP_INSTAGRAM_API_BASE_URL.trim()
  : null

// 로컬 개발 환경 감지
const isLocalhost = typeof window !== "undefined" && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === ""
)

// ngrok 환경 감지
const isNgrok = typeof window !== "undefined" &&
  window.location.hostname.includes("ngrok-free.app")

const defaultLocalUrl = "http://localhost:8000";

const rawBaseUrl = (() => {
  // 1. Priority: Environment variable
  if (envUrl) return envUrl;

  // 2. Secondary: If we are on Localhost, use the default local API port
  if (isLocalhost) {
    return defaultLocalUrl;
  }

  // 3. Fallback: If on any other domain (including ngrok), use current window origin as base
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return defaultLocalUrl;
})()

export const INSTAGRAM_API_BASE_URL = rawBaseUrl.endsWith("/")
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl

export const isInstagramApiConfigured = INSTAGRAM_API_BASE_URL.length > 0


