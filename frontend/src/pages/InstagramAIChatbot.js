"use client"

import { useState } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import {
  MessageSquare,
  Brain,
  Zap,
  Shield,
  Globe,
  Database,
  Settings,
  CheckCircle,
  Code,
  Users,
  Smartphone,
  Sparkles,
} from "lucide-react"

export default function InstagramAIChatbotPage() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showErrorMessage, setShowErrorMessage] = useState(false)

  const features = [
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Instagram DM 통합",
      description: "Instagram Direct Message API를 통해 사용자 메시지를 실시간으로 수신하고 응답합니다.",
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "Google Gemini AI",
      description: "최신 Google Gemini AI 기술을 활용하여 사용자의 의도와 요구사항을 정확히 파악합니다.",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "실시간 응답",
      description: "사용자 질문에 대해 즉시 AI가 분석하여 맞춤형 응답을 제공합니다.",
    },
    {
      icon: <Settings className="h-8 w-8" />,
      title: "맞춤형 서비스",
      description: "각 클라이언트의 비즈니스 도메인에 맞게 서비스를 커스터마이징하여 제공합니다.",
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "벡터 검색",
      description: "Google Gemini의 임베딩 기술과 벡터 검색을 활용하여 관련 정보를 효율적으로 검색합니다.",
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "앱 설치 불필요",
      description: "사용자는 별도의 앱 설치나 회원가입 없이 Instagram DM만으로 서비스를 이용할 수 있습니다.",
    },
  ]

  const useCases = [
    {
      title: "도서 추천 서비스",
      description: "도서관이나 서점에서 사용자의 취향에 맞는 도서를 추천하는 AI 챗봇",
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      title: "상품 추천 서비스",
      description: "온라인 쇼핑몰에서 사용자의 요구사항에 맞는 상품을 추천하는 AI 챗봇",
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      title: "고객 지원 서비스",
      description: "FAQ 및 일반적인 고객 문의에 대해 자동으로 응답하는 AI 챗봇",
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      title: "정보 제공 서비스",
      description: "특정 도메인의 정보를 검색하고 제공하는 AI 챗봇",
      icon: <Sparkles className="h-6 w-6" />,
    },
  ]

  const howItWorks = [
    {
      step: "1",
      title: "메시지 수신",
      description: "사용자가 Instagram DM을 통해 질문이나 요청을 보냅니다.",
      icon: <Smartphone className="h-6 w-6" />,
    },
    {
      step: "2",
      title: "AI 분석",
      description: "Google Gemini AI가 메시지 내용을 분석하여 사용자의 의도와 요구사항을 파악합니다.",
      icon: <Brain className="h-6 w-6" />,
    },
    {
      step: "3",
      title: "정보 검색",
      description: "클라이언트의 데이터베이스나 지식베이스에서 관련 정보를 벡터 검색으로 찾아냅니다.",
      icon: <Database className="h-6 w-6" />,
    },
    {
      step: "4",
      title: "맞춤형 응답",
      description: "AI가 생성한 맞춤형 응답을 Instagram DM으로 자동 전송합니다.",
      icon: <MessageSquare className="h-6 w-6" />,
    },
  ]

  const handleFormSubmit = (e) => {
    e.preventDefault()

    const formData = new FormData(e.target)
    const name = formData.get('name')
    const email = formData.get('email')
    const phone = formData.get('phone')
    const message = formData.get('message')

    const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfZS-RExYpdFAiqMr7mrcEH0qw39EYZLK-rx2m6qTqbpILCbA/formResponse'

    const submitData = new FormData()
    submitData.append('entry.1633623509', name)
    submitData.append('entry.1944370376', email)
    submitData.append('entry.95499541', phone)
    submitData.append('entry.839337160', `[Instagram AI 챗봇 서비스 문의] ${message}`)

    fetch(formUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: submitData
    }).then(() => {
      setShowSuccessMessage(true)
      e.target.reset()
      setTimeout(() => setShowSuccessMessage(false), 5000)
    }).catch(() => {
      setShowErrorMessage(true)
      setTimeout(() => setShowErrorMessage(false), 5000)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              AI 기반 챗봇 서비스
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Instagram AI 챗봇 서비스
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Instagram Direct Message API와 Google Gemini AI를 활용하여 각 비즈니스에 맞춘 맞춤형 챗봇 서비스를 제공합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Service Overview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">서비스 개요</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              우리 비즈니스는 Instagram Direct Message API를 통해 수신한 사용자 메시지를 Google Gemini AI를 활용하여 분석하고,
              각 클라이언트의 비즈니스에 맞춘 맞춤형 AI 챗봇 서비스를 제공합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-purple-600" />
                  플랫폼 데이터 사용
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Instagram Graph API를 통해 수신한 메시지 텍스트 데이터만 사용합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>사용자의 메시지 내용을 AI 모델로 분석하여 의도를 파악합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>분석된 정보를 기반으로 클라이언트의 데이터베이스에서 검색 및 추천을 수행합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>사용자에게 AI가 생성한 맞춤형 응답을 Instagram DM으로 응답합니다.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-pink-600" />
                  클라이언트 사용 방법
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>비즈니스 소유자는 자신의 비즈니스 도메인에 맞는 데이터베이스와 서비스 로직을 설정합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>사용자들은 Instagram 계정을 통해 클라이언트의 서비스 계정으로 DM을 보냅니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>별도의 앱 설치나 회원가입 없이 Instagram DM만으로 서비스를 이용할 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>실시간으로 AI가 분석하여 각 비즈니스 도메인에 맞는 맞춤형 응답을 제공합니다.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">주요 기능</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              최신 AI 기술과 Instagram API를 결합한 강력한 챗봇 서비스
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-purple-600 mb-4">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">작동 방식</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              간단한 4단계로 사용자에게 맞춤형 응답을 제공합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, index) => (
              <Card key={index} className="border-2 relative">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-purple-600">{step.icon}</div>
                    <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
                      {step.step}
                    </Badge>
                  </div>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">적용 사례</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              다양한 비즈니스 도메인에 적용 가능한 맞춤형 AI 챗봇 서비스
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-pink-600">{useCase.icon}</div>
                    <CardTitle>{useCase.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">기술 스택</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              최신 기술을 활용한 안정적이고 확장 가능한 서비스
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Instagram Graph API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Instagram Direct Message API를 통해 사용자 메시지를 실시간으로 수신하고 응답합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Google Gemini AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Google Gemini의 임베딩 기술과 벡터 검색을 활용하여 사용자 의도를 분석하고 관련 정보를 검색합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Google Cloud Run
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  클라우드 기반 서비스로 안정적이고 확장 가능한 인프라를 제공합니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">문의하기</h2>
            <p className="text-lg text-gray-600">
              Instagram AI 챗봇 서비스에 대한 문의사항을 남겨주세요.
            </p>
          </div>

          <Card className="border-2">
            <CardContent className="pt-6">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름 *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일 *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    연락처
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    문의 내용 *
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                {showSuccessMessage && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    문의가 성공적으로 전송되었습니다. 빠른 시일 내에 연락드리겠습니다.
                  </div>
                )}
                {showErrorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    전송 중 오류가 발생했습니다. 다시 시도해주세요.
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  문의하기
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-cyan-300/40 bg-gray-50/95">
        <div className="max-w-7xl mx-auto px-4">
          {/* 로고 및 회사 정보 */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-4">
            <div className="flex items-center gap-2 -ml-28 md:-ml-28 -ml-8">
              <img src="/main_logo.png" alt="AISP Logo" className="h-16 w-32 md:h-24 md:w-48 object-contain" />
            </div>

            {/* 사업자 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">사업자명:</span>
                  <span>에이아이에스피</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">대표자:</span>
                  <span>신현섭</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">사업자 등록번호:</span>
                  <span>426-87-03520</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">TEL:</span>
                  <span>010-3769-7009</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">E-mail:</span>
                  <span>aispshs@aisp.ai.kr</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-800 flex-shrink-0">주소:</span>
                  <span className="text-xs leading-relaxed">경기도 남양주시 순화궁로 249, 지식산업센터-2동 엠821호<br />(별내동, 별내역 파라곤스퀘어)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 저작권 정보 */}
          <div className="pt-3 border-t border-cyan-300/40 text-center text-gray-800 text-xs">
            © 2025 AISP. All rights reserved. | 미래를 만드는 AI 로봇 기술
          </div>
        </div>
      </footer>
    </div>
  )
}

