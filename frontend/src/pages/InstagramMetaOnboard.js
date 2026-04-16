"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { AlertCircle, CheckCircle2, Loader2, LogIn, RefreshCw, Users, Zap, Globe } from "lucide-react"
import { INSTAGRAM_API_BASE_URL, isInstagramApiConfigured } from "../lib/config"
import { apiFetch, safeString } from "../lib/api"

const FacebookLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill="#fff"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

export default function InstagramMetaOnboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const apiBaseUrl = useMemo(() => INSTAGRAM_API_BASE_URL, [])

  const customerIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("customer_id") || ""
  }, [location.search])

  const [customerId, setCustomerId] = useState(customerIdFromQuery)

  const [customerStatus, setCustomerStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState(null)


  const [instagramOptionsVisible, setInstagramOptionsVisible] = useState(false)
  const [instagramOptionsLoading, setInstagramOptionsLoading] = useState(false)
  const [instagramOptionsError, setInstagramOptionsError] = useState(null)
  const [instagramOptions, setInstagramOptions] = useState([])
  const [selectedInstagramPage, setSelectedInstagramPage] = useState("")  // 하위 호환성 유지
  const [selectedInstagramPages, setSelectedInstagramPages] = useState([])  // 여러 계정 선택 지원
  const [linkingInstagram, setLinkingInstagram] = useState(false)
  const [instagramLinkSuccess, setInstagramLinkSuccess] = useState(null)
  const [pageIdMissing, setPageIdMissing] = useState(false)
  const [manualPageId, setManualPageId] = useState("")
  const [updatingPageId, setUpdatingPageId] = useState(false)
  const [autoNavigated, setAutoNavigated] = useState(false)

  // 검수용: 웹훅 구독 상태 및 페이지 인사이트
  const [webhookStatus, setWebhookStatus] = useState(null)
  const [webhookLoading, setWebhookLoading] = useState(false)
  const [pageInsights, setPageInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  // 영어 UI 옵션 (검수용)
  const [useEnglish, setUseEnglish] = useState(false)

  const buildUrl = useCallback((path) => {
    if (!apiBaseUrl) {
      throw new Error("Instagram API base URL is not configured.")
    }
    return `${apiBaseUrl}${path}`
  }, [apiBaseUrl])

  const fetchJson = useCallback(async (path, options = {}) => {
    try {
      const response = await apiFetch(path, options);

      const contentType = response.headers.get("content-type") || ""
      const parseResponse = async () => {
        if (contentType.includes("application/json")) {
          return response.json()
        }
        const text = await response.text()
        try {
          return JSON.parse(text)
        } catch {
          return { message: text }
        }
      }

      if (!response.ok) {
        const errorPayload = await parseResponse()
        const detail = errorPayload?.detail || errorPayload?.message || JSON.stringify(errorPayload)
        throw new Error(detail || `Request failed (HTTP ${response.status})`)
      }

      return parseResponse()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(`Could not connect to API server. (${path})`)
      }
      throw error
    }
  }, [])



  const loadCustomerStatus = useCallback(async (id) => {
    setStatusLoading(true)
    setStatusError(null)
    try {
      const data = await fetchJson(`/admin/customers/${id}`)
      setCustomerStatus(data)
    } catch (error) {
      setStatusError(error.message || "Failed to load customer status.")
      setCustomerStatus(null)
    } finally {
      setStatusLoading(false)
    }
  }, [fetchJson])

  const loadInstagramOptions = useCallback(async () => {
    if (!customerId) {
      return
    }
    setInstagramOptionsLoading(true)
    setInstagramOptionsError(null)
    try {
      const data = await fetchJson(`/instagram/accounts/options`)
      if (data && data.error && data.error.code === "MISSING_META_SCOPES") {
        const missing = Array.isArray(data.error.missing_scopes) ? data.error.missing_scopes.join(", ") : ""
        setInstagramOptionsError(
          `Meta has not granted page permissions to this login token. (Missing: ${missing}) ` +
          "Therefore, the list of Pages/Instagram Business accounts cannot be retrieved. " +
          "Please ensure individual permissions are set to Advanced Access and the app is in Live mode, then rerequest and try again."
        )
        setInstagramOptions([])
        setSelectedInstagramPage("")
        setSelectedInstagramPages([])
        return
      }
      const options = Array.isArray(data.options) ? data.options : []
      setInstagramOptions(options)
      const currentOption = options.find((option) => option.is_current)
      setSelectedInstagramPage(currentOption ? currentOption.page_id : "")

      // Instagram 계정이 연결되어 있으면 웹훅 상태와 인사이트 로드
      if (currentOption || options.length > 0) {
        void loadWebhookStatus()
        void loadPageInsights()
      }
    } catch (error) {
      setInstagramOptionsError(error.message || "Failed to load Instagram account options.")
      setInstagramOptions([])
    } finally {
      setInstagramOptionsLoading(false)
    }
  }, [customerId, fetchJson])

  // 검수용: 웹훅 구독 상태 로드 (pages_manage_metadata 사용 사례)
  const loadWebhookStatus = useCallback(async () => {
    if (!customerId) return
    setWebhookLoading(true)
    try {
      const data = await fetchJson(`/instagram/accounts/webhook-status`)
      setWebhookStatus(data)
    } catch (error) {
      
      setWebhookStatus(null)
    } finally {
      setWebhookLoading(false)
    }
  }, [customerId, fetchJson])

  // 검수용: 페이지 인사이트 로드 (pages_read_engagement 사용 사례)
  const loadPageInsights = useCallback(async () => {
    if (!customerId) return
    setInsightsLoading(true)
    try {
      const data = await fetchJson(`/instagram/accounts/page-insights`)
      setPageInsights(data)
    } catch (error) {
      
      setPageInsights(null)
    } finally {
      setInsightsLoading(false)
    }
  }, [customerId, fetchJson])

  useEffect(() => {
    setCustomerId(customerIdFromQuery)

    // customer_id를 로컬 스토리지에 저장
    if (customerIdFromQuery) {
      localStorage.setItem("customer_id", customerIdFromQuery)
    }

    const params = new URLSearchParams(location.search)
    if (params.get("instagram_linked") === "true") {
      setInstagramLinkSuccess("Instagram account successfully linked.")
      params.delete("instagram_linked")
      navigate({ search: params.toString() }, { replace: true })
    }
    if (params.get("page_id_missing") === "true") {
      setPageIdMissing(true)
      setInstagramLinkSuccess("Instagram account linked! Facebook login is required to receive messages.")
    }
  }, [customerIdFromQuery, navigate])

  useEffect(() => {
    if (!isInstagramApiConfigured || !customerId) {
      return
    }
    void loadCustomerStatus(customerId)
  }, [customerId, isInstagramApiConfigured, loadCustomerStatus])



  useEffect(() => {
    setInstagramLinkSuccess(null)
    setInstagramOptionsVisible(false)
    setInstagramOptions([])
    setSelectedInstagramPage("")
    setInstagramOptionsError(null)
  }, [customerId])

  useEffect(() => {
    if (customerStatus?.instagram_account) {
      setInstagramOptionsVisible(false)
      // Instagram 계정이 있지만 page_id가 없으면 pageIdMissing 유지
      if (customerStatus.instagram_account && !customerStatus.instagram_account.page_id) {
        setPageIdMissing(true)
      } else if (customerStatus.instagram_account && customerStatus.instagram_account.page_id) {
        // page_id가 있으면 pageIdMissing 해제
        setPageIdMissing(false)
      }

      // Instagram 계정이 연결되어 있으면 웹훅 상태와 인사이트 자동 로드
      if (customerId) {
        void loadWebhookStatus()
        void loadPageInsights()
      }

      // page_id까지 확보된 경우 대시보드로 자동 이동
      if (!autoNavigated && customerStatus.instagram_account.page_id) {
        setAutoNavigated(true)
        navigate('/dashboard')
      }
    }
  }, [customerStatus, customerId, loadWebhookStatus, loadPageInsights, autoNavigated, navigate])

  const handleStartInstagramSelection = () => {
    if (!customerId) {
      setInstagramOptionsError("Invalid customer information.")
      return
    }
    setInstagramLinkSuccess(null)
    setInstagramOptionsVisible(true)
    setInstagramOptions([])
    setSelectedInstagramPage("")
    void loadInstagramOptions()
  }

  const handleLinkInstagramAccount = async () => {
    if (!customerId) {
      setInstagramOptionsError("Invalid customer information.")
      return
    }
    // 여러 계정 선택 지원: selectedInstagramPages 우선, 없으면 selectedInstagramPage 사용 (하위 호환성)
    const pageIdsToLink = selectedInstagramPages.length > 0 ? selectedInstagramPages : (selectedInstagramPage ? [selectedInstagramPage] : [])
    if (pageIdsToLink.length === 0) {
      setInstagramOptionsError("Please select an Instagram account to link.")
      return
    }
    setLinkingInstagram(true)
    setInstagramOptionsError(null)
    try {
      await fetchJson(`/instagram/accounts/link`, {
        method: "POST",
        body: JSON.stringify({
          customer_id: customerId,
          page_ids: pageIdsToLink,  // 여러 계정 지원: 배열로 전송
        }),
      })
      setInstagramLinkSuccess("Instagram account successfully linked.")

      // customer_id를 localStorage에 저장
      localStorage.setItem('customer_id', customerId)

      await loadCustomerStatus(customerId)
      await loadInstagramOptions()
      // 웹훅 상태와 인사이트 다시 로드 (약간의 지연 후)
      setTimeout(() => {
        void loadWebhookStatus()
        void loadPageInsights()
      }, 1000)

      // 3초 후 대시보드로 자동 이동
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)
    } catch (error) {
      setInstagramOptionsError(error.message || "An error occurred while linking Instagram account.")
    } finally {
      setLinkingInstagram(false)
    }
  }

  const handleInstagramDirectLogin = async () => {
    if (!customerId) {
      setInstagramOptionsError("Invalid customer information.")
      return
    }
    try {
      const redirect = await fetchJson(`/auth/instagram-basic/login?customer_id=${customerId}`)
      if (redirect.authorization_url) {
        window.location.href = redirect.authorization_url
      } else {
        setInstagramOptionsError("Failed to retrieve Instagram login URL.")
      }
    } catch (error) {
      setInstagramOptionsError(error.message || "An error occurred during Instagram login.")
    }
  }

  const handleUpdatePageId = async () => {
    if (!customerId) {
      setInstagramOptionsError("Invalid customer information.")
      return
    }
    if (!manualPageId.trim()) {
      setInstagramOptionsError("Please enter Facebook Page ID.")
      return
    }
    setUpdatingPageId(true)
    setInstagramOptionsError(null)
    try {
      await fetchJson(`/instagram/accounts/page-id?page_id=${encodeURIComponent(manualPageId.trim())}`, {
        method: "PATCH",
      })
      setInstagramLinkSuccess("Facebook Page ID updated! Ready to receive messages.")
      setPageIdMissing(false)
      setManualPageId("")
      await loadCustomerStatus(customerId)
    } catch (error) {
      setInstagramOptionsError(error.message || "An error occurred while updating Page ID.")
    } finally {
      setUpdatingPageId(false)
    }
  }



  const handleStartMetaLogin = async () => {
    try {
      // 일반 OAuth 방식 (response_type=code) 사용
      // Facebook Login for Business 방식에서는 일부 권한(pages_read_engagement 등)이 토큰에 포함되지 않을 수 있음
      const data = await fetchJson("/auth/meta/login?use_business_login=false")
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        setInstagramOptionsError("Failed to retrieve login URL.")
      }
    } catch (error) {
      setInstagramOptionsError(error.message || "An error occurred while starting Meta login.")
    }
  }

  if (!isInstagramApiConfigured) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-white selection:bg-indigo-100 font-sans">
        {/* Ambient Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150"></div>
        </div>
        <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
          <Card className="max-w-xl w-full shadow-2xl bg-white/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>인스타그램 API 설정 필요</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                `.env` 파일의 `REACT_APP_INSTAGRAM_API_BASE_URL` 값을 설정하고 개발 서버를 재시작하면 콘솔 및 온보딩 화면이 활성화됩니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white selection:bg-indigo-100 font-sans">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 relative z-10">
        {/* 헤더 - 로고만 표시 */}
        <div className="flex items-center justify-between">
          <div className="animate-float">
            <img
              src="/assets/aidm-logo.svg"
              alt="AIDM"
              className="h-12 w-auto drop-shadow-2xl filter hover:drop-shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all duration-300"
              draggable="false"
            />
          </div>
          <div className="flex items-center gap-3">
            {/* 검수용: 영어 UI 토글 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseEnglish(!useEnglish)}
              className="shadow-lg hover:shadow-xl transition-all"
            >
              <Globe className="h-4 w-4 mr-2" />
              {useEnglish ? "한국어" : "English"}
            </Button>
            <Link to="/instagram-integration-console">
              <Button variant="outline" className="shadow-lg hover:shadow-xl transition-all hover:scale-105">
                {useEnglish ? "Home" : "Home"}
              </Button>
            </Link>
          </div>
        </div>



        {statusLoading && !customerStatus && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
            <Card className="relative bg-white/80 backdrop-blur-xl shadow-2xl">
              <CardContent className="py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="text-gray-700 font-medium">고객 정보를 불러오는 중...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {statusError && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-pink-600 rounded-3xl blur-xl opacity-30"></div>
            <Card className="relative bg-white/80 backdrop-blur-xl shadow-2xl">
              <CardContent>
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{safeString(statusError)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {customerStatus && !statusLoading && (
          <>
            {/* 프로필 이미지 및 이름 표시 */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition duration-1000 animate-pulse"></div>
              <Card className="relative bg-white/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center gap-6">
                    {customerStatus.profile_picture ? (() => {
                      // 백엔드에서 이미 고해상도 이미지를 가져왔으므로 원본 URL 사용
                      // 프론트엔드에서 URL을 수정하지 않고 그대로 사용
                      let imageUrl = customerStatus.profile_picture
                      // &amp;를 &로 변환 (HTML 엔티티 처리)
                      imageUrl = imageUrl.replace(/&amp;/g, '&')

                      return (
                        <div className="relative" style={{ width: '160px', height: '160px' }}>
                          <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg" style={{
                            WebkitBackfaceVisibility: 'hidden',
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0)',
                            willChange: 'transform'
                          }}>
                            <img
                              src={imageUrl}
                              alt="Profile"
                              style={{
                                width: '160px',
                                height: '160px',
                                objectFit: 'cover',
                                objectPosition: '50% 50%',
                                imageRendering: 'auto',
                                display: 'block',
                                WebkitBackfaceVisibility: 'hidden',
                                backfaceVisibility: 'hidden',
                                transform: 'translateZ(0)',
                                willChange: 'transform',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale'
                              }}
                              loading="eager"
                              decoding="async"
                              draggable="false"
                              onError={(e) => {
                                
                                e.target.style.display = 'none'
                                e.target.parentElement.parentElement.nextElementSibling.style.display = 'flex'
                              }}
                              onLoad={(e) => {
                                const img = e.target
                                
                                
                                
                                
                                // 고해상도 이미지인지 확인
                                if (img.naturalWidth >= 500 && img.naturalHeight >= 500) {
                                  
                                } else if (img.naturalWidth >= 320 && img.naturalHeight >= 320) {
                                  
                                } else {
                                  
                                }
                              }}
                            />
                          </div>
                        </div>
                      )
                    })() : (
                      <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300 shadow-lg">
                        <Users className="h-20 w-20 text-gray-400" />
                      </div>
                    )}
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-900">{customerStatus.name || "User"}</h2>
                      {/* 디버깅용 - 나중에 제거 가능 */}
                      {process.env.NODE_ENV === 'development' && (
                        <p className="text-xs text-gray-400 mt-1">
                          Profile Picture: {customerStatus.profile_picture ? 'Yes' : 'No'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

              <>
                {pageIdMissing ? (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                    <Card className="relative bg-white/80 backdrop-blur-xl shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Instagram Messaging Setup</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-6">
                          {/* Instagram 계정 정보 표시 */}
                          {customerStatus?.instagram_account && (
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                              <div className="flex items-center gap-3 mb-3">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                <div>
                                  <p className="font-bold text-lg text-gray-900">
                                    {useEnglish ? "Instagram Account Connected!" : "Instagram 계정 연동 완료!"}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {customerStatus.instagram_account.instagram_user_id ? (
                                      <>계정 ID: <span className="font-mono">{customerStatus.instagram_account.instagram_user_id}</span></>
                                    ) : (
                                      "Instagram 계정이 연결되었습니다"
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 메시지 수신을 위한 안내 */}
                          <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-lg">
                            <div className="flex items-start gap-3 mb-4">
                              <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-bold text-lg text-blue-900 mb-2">
                                  Instagram 메시지 수신을 위한 추가 설정이 필요합니다
                                </p>
                                <div className="text-sm text-blue-800 space-y-2">
                                  <p>
                                    Instagram DM을 받으려면 <strong className="font-semibold">Facebook Page ID</strong>가 필요합니다.
                                  </p>
                                  <p className="text-xs bg-blue-100 p-2 rounded mt-2">
                                    💡 <strong>왜 필요한가요?</strong> Instagram 메시지는 Facebook Page를 통해 전달됩니다.
                                    Facebook OAuth로 연결된 페이지 정보를 가져와야 메시지를 받을 수 있습니다.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Facebook OAuth 버튼 (주요 액션) */}
                            <div className="mt-4 space-y-3">
                              <Button
                                onClick={handleStartMetaLogin}
                                className="w-full py-6 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform transition-all hover:scale-105"
                                size="lg"
                              >
                                <FacebookLogo className="w-5 h-5 mr-2" />
                                Facebook 로그인으로 Page ID 가져오기
                              </Button>

                              {/* 수동 입력 (보조 옵션) */}
                              <details className="mt-3">
                                <summary className="text-sm text-blue-700 cursor-pointer hover:text-blue-900 font-medium mb-2">
                                  또는 수동으로 Page ID 입력하기
                                </summary>
                                <div className="mt-3 space-y-3 pt-3 border-t border-blue-200">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Facebook Page ID
                                    </label>
                                    <input
                                      type="text"
                                      value={manualPageId}
                                      onChange={(e) => setManualPageId(e.target.value)}
                                      placeholder="예: 123456789012345"
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="mt-2 text-xs text-gray-500">
                                      Facebook Page 설정 → 일반 → Page ID에서 확인하거나, Meta 개발자 대시보드에서 확인할 수 있습니다.
                                    </p>
                                  </div>
                                  <Button
                                    onClick={handleUpdatePageId}
                                    disabled={updatingPageId || !manualPageId.trim()}
                                    variant="outline"
                                    className="w-full"
                                  >
                                    {updatingPageId ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        업데이트 중...
                                      </>
                                    ) : (
                                      "Page ID 업데이트"
                                    )}
                                  </Button>
                                </div>
                              </details>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : !customerStatus.instagram_account ? (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                    <Card className="relative bg-white/80 backdrop-blur-xl shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">인스타그램 계정 연동</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-gray-600">
                          고객 정보가 저장되었습니다. 연동을 완료하려면 관리하시는 인스타그램 비즈니스 계정을 선택해 주세요.
                        </p>
                        {instagramLinkSuccess && (
                          <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                            {instagramLinkSuccess}
                          </div>
                        )}
                        {instagramOptionsError && (
                          <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>{safeString(instagramOptionsError)}</span>
                          </div>
                        )}
                        {pageIdMissing ? (
                          <div className="space-y-6">
                            {/* Instagram 계정 정보 표시 */}
                            {customerStatus?.instagram_account && (
                              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-3 mb-3">
                                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                                  <div>
                                    <p className="font-bold text-lg text-gray-900">
                                      {useEnglish ? "Instagram Account Connected!" : "Instagram 계정 연동 완료!"}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {customerStatus.instagram_account.instagram_user_id ? (
                                        <>계정 ID: <span className="font-mono">{customerStatus.instagram_account.instagram_user_id}</span></>
                                      ) : (
                                        "Instagram 계정이 연결되었습니다"
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 검수용: 웹훅 구독 상태 표시 (pages_manage_metadata 사용 사례) */}
                            {customerStatus?.instagram_account && (
                              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-bold text-lg text-gray-900">
                                      {useEnglish ? "Webhook Subscription Status" : "웹훅 구독 상태"}
                                    </h3>
                                  </div>
                                  <Badge className={webhookStatus?.webhook_subscribed ? "bg-green-500" : "bg-yellow-500"}>
                                    {useEnglish
                                      ? (webhookStatus?.webhook_subscribed ? "Subscribed" : "Not Subscribed")
                                      : (webhookStatus?.webhook_subscribed ? "구독됨" : "구독 안 됨")
                                    }
                                  </Badge>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <p className="text-gray-700">
                                    <strong>{useEnglish ? "Permission Used: " : "사용 권한: "}</strong>
                                    <code className="bg-gray-100 px-2 py-1 rounded">pages_manage_metadata</code>
                                  </p>
                                  <p className="text-gray-600 italic">
                                    {useEnglish
                                      ? "This permission is used to subscribe to page webhooks for receiving Instagram message events."
                                      : "이 권한은 Instagram 메시지 이벤트를 수신하기 위해 페이지 웹훅을 구독하는 데 사용됩니다."
                                    }
                                  </p>
                                  {webhookLoading ? (
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>{useEnglish ? "Checking status..." : "상태 확인 중..."}</span>
                                    </div>
                                  ) : webhookStatus ? (
                                    <div className="mt-3 space-y-1">
                                      <p className="text-xs text-gray-500">
                                        {useEnglish ? "Page ID: " : "페이지 ID: "}
                                        <span className="font-mono">{webhookStatus.page_id}</span>
                                      </p>
                                      {webhookStatus.subscribed_fields && webhookStatus.subscribed_fields.length > 0 && (
                                        <p className="text-xs text-gray-500">
                                          {useEnglish ? "Subscribed Fields: " : "구독 필드: "}
                                          {webhookStatus.subscribed_fields.join(", ")}
                                        </p>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {/* 검수용: 페이지 인사이트 표시 (pages_read_engagement 사용 사례) */}
                            {customerStatus?.instagram_account && (
                              <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                  <Users className="h-5 w-5 text-green-600" />
                                  <h3 className="font-bold text-lg text-gray-900">
                                    {useEnglish ? "Page Engagement Insights" : "페이지 인사이트"}
                                  </h3>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <p className="text-gray-700">
                                    <strong>{useEnglish ? "Permission Used: " : "사용 권한: "}</strong>
                                    <code className="bg-gray-100 px-2 py-1 rounded">pages_read_engagement</code>
                                  </p>
                                  <p className="text-gray-600 italic">
                                    {useEnglish
                                      ? "This permission is used to read page engagement data (posts, followers, likes, comments) to help page managers understand message context and prioritize responses."
                                      : "이 권한은 페이지 인사이트 데이터(게시물, 팔로워, 좋아요, 댓글)를 읽어 페이지 관리자가 메시지 맥락을 이해하고 응답 우선순위를 결정하는 데 사용됩니다."
                                    }
                                  </p>
                                  {insightsLoading ? (
                                    <div className="flex items-center gap-2 text-gray-600 mt-3">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>{useEnglish ? "Loading insights..." : "인사이트 로딩 중..."}</span>
                                    </div>
                                  ) : pageInsights ? (
                                    <div className="mt-3 space-y-2">
                                      {pageInsights.followers_count !== undefined && (
                                        <div className="p-3 bg-white rounded-lg">
                                          <p className="text-sm font-semibold text-gray-700">
                                            {useEnglish ? "Followers: " : "팔로워: "}
                                            <span className="text-lg text-green-600">{pageInsights.followers_count.toLocaleString()}</span>
                                          </p>
                                        </div>
                                      )}
                                      {pageInsights.recent_posts && pageInsights.recent_posts.length > 0 && (
                                        <div className="p-3 bg-white rounded-lg">
                                          <p className="text-sm font-semibold text-gray-700 mb-2">
                                            {useEnglish ? "Recent Posts Engagement: " : "최근 게시물 인사이트: "}
                                          </p>
                                          <div className="space-y-2">
                                            {pageInsights.recent_posts.slice(0, 3).map((post, idx) => (
                                              <div key={idx} className="text-xs text-gray-600 border-l-2 border-green-300 pl-2">
                                                <p className="truncate">{post.message || `Post ${idx + 1}`}</p>
                                                <div className="flex gap-3 mt-1">
                                                  <span>👍 {post.likes_count || 0}</span>
                                                  <span>💬 {post.comments_count || 0}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {pageInsights.error && (
                                        <p className="text-xs text-red-600 italic">
                                          {useEnglish ? "Note: " : "참고: "}{String(pageInsights.error)}
                                        </p>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )}

                            {/* 메시지 수신을 위한 안내 */}
                            <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-lg">
                              <div className="flex items-start gap-3 mb-4">
                                <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-bold text-lg text-blue-900 mb-2">
                                    Instagram 메시지 수신을 위한 추가 설정이 필요합니다
                                  </p>
                                  <div className="text-sm text-blue-800 space-y-2">
                                    <p>
                                      Instagram DM을 받으려면 <strong className="font-semibold">Facebook Page ID</strong>가 필요합니다.
                                    </p>
                                    <p className="text-xs bg-blue-100 p-2 rounded mt-2">
                                      💡 <strong>왜 필요한가요?</strong> Instagram 메시지는 Facebook Page를 통해 전달됩니다.
                                      Facebook OAuth로 연결된 페이지 정보를 가져와야 메시지를 받을 수 있습니다.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Facebook OAuth 버튼 (주요 액션) */}
                              <div className="mt-4 space-y-3">
                                <Button
                                  onClick={handleStartMetaLogin}
                                  className="w-full py-6 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform transition-all hover:scale-105"
                                  size="lg"
                                >
                                  <FacebookLogo className="w-5 h-5 mr-2" />
                                  Facebook 로그인으로 Page ID 가져오기
                                </Button>

                                {/* 수동 입력 (보조 옵션) */}
                                <details className="mt-3">
                                  <summary className="text-sm text-blue-700 cursor-pointer hover:text-blue-900 font-medium mb-2">
                                    또는 수동으로 Page ID 입력하기
                                  </summary>
                                  <div className="mt-3 space-y-3 pt-3 border-t border-blue-200">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Facebook Page ID
                                      </label>
                                      <input
                                        type="text"
                                        value={manualPageId}
                                        onChange={(e) => setManualPageId(e.target.value)}
                                        placeholder="예: 123456789012345"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      />
                                      <p className="mt-2 text-xs text-gray-500">
                                        Facebook Page 설정 → 일반 → Page ID에서 확인하거나, Meta 개발자 대시보드에서 확인할 수 있습니다.
                                      </p>
                                    </div>
                                    <Button
                                      onClick={handleUpdatePageId}
                                      disabled={updatingPageId || !manualPageId.trim()}
                                      variant="outline"
                                      className="w-full"
                                    >
                                      {updatingPageId ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          업데이트 중...
                                        </>
                                      ) : (
                                        "Page ID 업데이트"
                                      )}
                                    </Button>
                                  </div>
                                </details>
                              </div>
                            </div>
                          </div>
                        ) : !instagramOptionsVisible ? (
                          <div className="space-y-3">
                            <Button className="w-full" onClick={handleStartInstagramSelection}>
                              페이스북 페이지에서 계정 선택
                            </Button>
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={handleInstagramDirectLogin}
                            >
                              인스타그램 로그인으로 연동
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {instagramOptionsLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="ml-2 text-sm text-gray-600">인스타그램 계정을 불러오는 중...</span>
                              </div>
                            ) : (
                              <>
                                {instagramOptions.length > 0 ? (
                                  <div className="space-y-3">
                                    {selectedInstagramPages.length > 0 && (
                                      <p className="text-sm text-blue-600 font-medium">
                                        {selectedInstagramPages.length}개의 계정이 선택되었습니다
                                      </p>
                                    )}
                                    {instagramOptions.map((option) => (
                                      <label
                                        key={option.page_id}
                                        className={`flex items-center gap-3 p-3 border rounded cursor-pointer hover:border-blue-500 ${(selectedInstagramPages.includes(option.page_id) || selectedInstagramPage === option.page_id) ? "border-blue-500 bg-blue-50" : ""
                                          }`}
                                      >
                                        <input
                                          type="checkbox"
                                          name="instagramPage"
                                          value={option.page_id}
                                          checked={selectedInstagramPages.includes(option.page_id) || selectedInstagramPage === option.page_id}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              // 체크박스 선택: 배열에 추가
                                              if (!selectedInstagramPages.includes(option.page_id)) {
                                                setSelectedInstagramPages([...selectedInstagramPages, option.page_id])
                                              }
                                              // 하위 호환성: selectedInstagramPage도 업데이트
                                              setSelectedInstagramPage(option.page_id)
                                            } else {
                                              // 체크박스 해제: 배열에서 제거
                                              setSelectedInstagramPages(selectedInstagramPages.filter(id => id !== option.page_id))
                                              // 마지막 선택된 항목이면 selectedInstagramPage도 초기화
                                              if (selectedInstagramPage === option.page_id && selectedInstagramPages.length === 1) {
                                                setSelectedInstagramPage("")
                                              }
                                            }
                                          }}
                                        />
                                        <div className="flex-1">
                                          <p className="font-semibold">
                                            {option.instagram_username || option.page_name}
                                          </p>
                                          <p className="text-sm text-gray-500">{option.page_name}</p>
                                        </div>
                                        {option.is_current && (
                                          <Badge variant="default">Currently Selected</Badge>
                                        )}
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">
                                    No linkable Instagram Business accounts found. Please connect an Instagram Professional account to your Page and try again.
                                  </p>
                                )}
                              </>
                            )}
                            <div className="flex flex-col md:flex-row gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => loadInstagramOptions()}
                                disabled={instagramOptionsLoading}
                                className="flex-1"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                목록 새로고침
                              </Button>
                              <Button
                                type="button"
                                onClick={handleLinkInstagramAccount}
                                disabled={linkingInstagram || (selectedInstagramPages.length === 0 && !selectedInstagramPage)}
                                className="flex-1"
                              >
                                {linkingInstagram ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    연동 중...
                                  </>
                                ) : (
                                  "연동 확정"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={handleInstagramDirectLogin}
                                className="flex-1"
                              >
                                Switch to Instagram Login
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition duration-1000 animate-pulse"></div>
                    <Card className="relative bg-white/80 backdrop-blur-xl shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">연동 완료</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-green-600 mb-4">
                          <CheckCircle2 className="h-6 w-6" />
                          <p className="text-xl font-bold">인스타그램 계정 연동이 모두 완료되었습니다!</p>
                        </div>
                        <p className="text-gray-700 mb-6 text-lg">
                          이제 인스타그램 DM을 통해 메시지를 수신할 수 있습니다.
                        </p>
                        <p className="text-gray-600 text-center text-base font-medium">
                          AIDM 서비스 이용 승인을 기다려주세요.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
          </>
        )}
      </div>
    </div>
  )
}

