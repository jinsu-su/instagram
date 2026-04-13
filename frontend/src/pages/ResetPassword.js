import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2, Lock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { apiFetch, safeString } from '../lib/api';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState('');
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const t = params.get('token');
        if (!t) {
            setError('유효하지 않은 접근입니다. 다시 비밀번호 비밀번호 초기화 메일을 요청해주세요.');
        } else {
            setToken(t);
        }
    }, [location]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password.length < 8) {
            setError('비밀번호는 최소 8자 이상이어야 합니다.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiFetch(`/auth/reset-password`, {
                method: 'POST',
                body: JSON.stringify({
                    token,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || '비밀번호 재설정에 실패했습니다.');
            }

            setIsSuccess(true);
        } catch (err) {
            setError(err.message);
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
                        <CardTitle className="text-2xl font-black text-gray-900 tracking-tight leading-none -mt-8">비밀번호 재설정</CardTitle>
                        <CardDescription className="text-gray-500 font-bold text-sm">
                            {isSuccess ? '변경이 완료되었습니다' : '실서비스 수준의 강력한 비밀번호를 권장합니다'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        {!isSuccess ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold animate-pulse flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{safeString(error)}</span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="password" title="새 비밀번호 *필수 항목" className="text-xs font-black text-gray-400 uppercase tracking-widest text-left block">New Password</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            placeholder="새 비밀번호 입력"
                                            className="h-14 pl-12 rounded-2xl border-gray-100 bg-white/50 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-gray-700"
                                            required
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" title="새 비밀번호 재 입력 *필수 항목" className="text-xs font-black text-gray-400 uppercase tracking-widest text-left block">Confirm Password</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="비밀번호 재입력"
                                            className="h-14 pl-12 rounded-2xl border-gray-100 bg-white/50 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-gray-700"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl shadow-gray-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                                    disabled={isLoading || !token}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>비밀번호 저장하기 <ArrowRight className="w-5 h-5" /></>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center space-y-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-gray-900 font-black text-lg">변경 완료!</p>
                                    <p className="text-gray-500 font-medium text-sm leading-relaxed">
                                        비밀번호가 안전하게 변경되었습니다.<br />
                                        이제 새로운 비밀번호로 로그인해주세요.
                                    </p>
                                </div>
                                <Button
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02]"
                                    onClick={() => navigate('/login')}
                                >
                                    로그인하러 가기
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ResetPassword;
