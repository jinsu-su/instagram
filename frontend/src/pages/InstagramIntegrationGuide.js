"use client"

import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { CheckCircle, ArrowRight, Settings, Shield, Users, Zap } from "lucide-react"

export default function InstagramIntegrationGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              연동 가이드
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Instagram 연동 가이드
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Instagram AI 챗봇 서비스 연동을 위한 단계별 가이드입니다.
            </p>
          </div>

          <div className="space-y-8">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-purple-600" />
                  설정 단계
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 list-decimal list-inside">
                  <li className="text-gray-700">
                    <strong>Google 로그인</strong> 또는 <strong>Facebook 로그인</strong>을 통해 시작
                  </li>
                  <li className="text-gray-700">
                    고객 정보 입력 (이메일, 전화번호, 업종 등)
                  </li>
                  <li className="text-gray-700">
                    Instagram 계정 연동 (페이스북 페이지 또는 Instagram 직접 로그인)
                  </li>
                  <li className="text-gray-700">
                    관리자 승인 대기
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-green-600" />
                  권한 요구사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Instagram Basic Display API 권한</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Instagram Messages API 권한</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Facebook Page 관리 권한</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}



