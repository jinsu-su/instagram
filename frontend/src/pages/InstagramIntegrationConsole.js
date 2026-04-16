import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Loader2, Mail, Lock, ArrowRight, Sparkles, Eye, EyeOff } from "lucide-react";
import { apiFetch, safeString, translateError } from '../lib/api';

const InstagramIntegrationConsole = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiFetch(`/auth/login`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '로그인에 실패했습니다.');
      }

      // Save Token (Simplified for MVP: LocalStorage)
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('customer_id', data.user.id);
      localStorage.setItem('user', JSON.stringify(data.user)); // Access user info directly if needed

      // Redirect to Dashboard
      navigate('/dashboard');

    } catch (err) {
      setError(translateError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900 flex items-start justify-center p-6 pt-20 md:pt-28">
      {/* Ambient Background (Matching Home.js) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="shadow-2xl border-white/50 bg-white/70 backdrop-blur-3xl rounded-[3rem] overflow-hidden pt-4 px-6 pb-6 md:pt-6 md:px-8 md:pb-8 animate-in fade-in zoom-in duration-700">
          <CardHeader className="space-y-0 text-center pb-6 p-0">
            <div className="flex flex-col items-center">
              <div className="cursor-pointer" onClick={() => navigate('/')}>
                <img
                  src="/assets/aidm-logo-ultra.png"
                  alt="AIDM"
                  className="h-28 w-auto object-contain"
                />
              </div>
            </div>
            <CardTitle className="text-3xl font-black text-gray-900 tracking-tight leading-none -mt-8">로그인</CardTitle>
            <CardDescription className="text-gray-500 font-bold text-sm"></CardDescription>
          </CardHeader>

          <CardContent className="p-0">
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
                    className="h-14 pl-12 rounded-2xl border-gray-100 bg-white/50 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-gray-700 placeholder:text-gray-300"
                    required
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-black text-gray-400 uppercase tracking-widest text-left block">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-14 pl-12 pr-12 rounded-2xl border-gray-100 bg-white/50 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-gray-700 placeholder:text-gray-300"
                    required
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-indigo-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
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
                  <>로그인 <ArrowRight className="w-5 h-5" /></>
                )}
              </Button>

              <div className="flex justify-center -mt-2">
                <span
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-700 cursor-pointer transition-all hover:underline"
                >
                  비밀번호 찾기
                </span>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="bg-transparent px-4 text-gray-400 font-bold">New to AIDM?</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-14 border-gray-100 hover:bg-gray-50 text-gray-600 rounded-2xl font-black text-lg transition-all"
                type="button"
                onClick={() => navigate('/signup')}
              >
                회원가입 하기
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-gray-400 font-bold">
          © 2026 AIDM Corp. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default InstagramIntegrationConsole;
