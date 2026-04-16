"use client"

// 환경 변수에서 URL 가져오기
// - npm start (개발): .env.development → http://localhost:8000
// - npm run build (배포): .env.production → https://api.aidm.kr
const rawBaseUrl = process.env.REACT_APP_INSTAGRAM_API_BASE_URL || "http://localhost:8000";

export const INSTAGRAM_API_BASE_URL = rawBaseUrl.endsWith("/")
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl

export const isInstagramApiConfigured = INSTAGRAM_API_BASE_URL.length > 0
