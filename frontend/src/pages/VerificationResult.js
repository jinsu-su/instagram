
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

const VerificationResult = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const email = searchParams.get('email');
    const error = searchParams.get('reason');
    const isSuccess = !error;

    return (
        <div className="min-h-screen flex items-center justify-center bg-white selection:bg-indigo-100 font-sans relative overflow-hidden p-4">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150"></div>
            </div>

            <Card className="w-full max-w-md shadow-2xl bg-white/80 backdrop-blur-3xl border-none rounded-[2.5rem] relative z-10">
                <CardHeader className={`text-center pb-2 ${isSuccess ? 'bg-emerald-50/50' : 'bg-rose-50/50'} rounded-t-xl`}>
                    <div className="mx-auto mb-4 p-3 bg-white rounded-full shadow-sm w-fit">
                        {isSuccess ? (
                            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        ) : (
                            <XCircle className="w-12 h-12 text-rose-500" />
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {isSuccess ? '이메일 인증 완료' : '인증 실패'}
                    </CardTitle>
                    <CardDescription>
                        {isSuccess ? (
                            <span>{email} 계정이 인증되었습니다.</span>
                        ) : (
                            <span>유효하지 않거나 만료된 링크입니다.</span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 relative">
                    <div className="text-center space-y-6">
                        <p className="text-slate-600">
                            {isSuccess
                                ? "이제 인증이 완료되었습니다. 로그인하여 AIDM의 모든 기능을 이용해보세요."
                                : "다시 한번 인증 메일을 요청해주세요."}
                        </p>

                        <Button
                            className={`w-full h-12 font-bold text-lg shadow-md transition-all active:scale-95 ${isSuccess
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-slate-800 hover:bg-slate-900 text-white"
                                }`}
                            onClick={() => navigate(isSuccess ? '/login' : '/')}
                        >
                            {isSuccess ? "로그인 하러 가기" : "홈으로 돌아가기"} <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
};

export default VerificationResult;
