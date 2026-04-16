import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2, Mail, ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { apiFetch, safeString, translateError } from '../lib/api';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await apiFetch(`/auth/forgot-password`, {
                method: 'POST',
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || '요청 처리에 실패했습니다.');
            }

            setIsSubmitted(true);
        } catch (err) {
            setError(translateError(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900 flex items-start justify-center p-6 pt-24 md:pt-32">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                <Card className="shadow-2xl border-white/50 bg-white/70 backdrop-blur-3xl rounded-[3rem] overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in duration-700">
                    <CardHeader className="space-y-4 text-center pb-6 p-0">
                        <div className="flex flex-col items-center mb-2">
                            <div className="cursor-pointer" onClick={() => navigate('/')}>
                                <img
                                    src="/assets/aidm-logo-ultra.png"
                                    alt="AIDM"
                                    className="h-20 w-auto object-contain"
                                />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-black text-gray-900 tracking-tight leading-none -mt-8">비밀번호 찾기</CardTitle>
                        <CardDescription className="text-gray-500 font-bold text-sm">
                            {isSubmitted ? '이메일을 확인해주세요' : '가입하신 이메일 주소를 입력해주세요'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        {!isSubmitted ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold animate-pulse">
                                        {safeString(error)}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-black text-gray-400 uppercase tracking-widest text-left block">Email Address</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            className="h-14 pl-12 rounded-2xl border-gray-100 bg-white/50 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-gray-700"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl shadow-gray-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>링크 발송하기 <ArrowRight className="w-5 h-5" /></>
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors pt-2"
                                >
                                    <ArrowLeft className="w-4 h-4" /> 로그인으로 돌아가기
                                </button>
                            </form>
                        ) : (
                            <div className="text-center space-y-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-gray-900 font-black text-lg">이메일 발송 완료!</p>
                                    <p className="text-gray-500 font-medium text-sm leading-relaxed">
                                        {email} 주소로 비밀번호 재설정 링크를 보냈습니다.<br />
                                        메일이 오지 않았다면 스팸함을 확인해주세요.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full h-14 border-gray-100 hover:bg-gray-50 text-gray-600 rounded-2xl font-black text-lg transition-all"
                                    onClick={() => navigate('/login')}
                                >
                                    로그인 화면으로 이동
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ForgotPassword;
