
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from "lucide-react";
import { apiFetch } from '../lib/api';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const verify = async () => {
            const token = searchParams.get('token');
            const email = searchParams.get('email');
            if (!token) {
                navigate('/verification-failed?reason=missing_token');
                return;
            }

            try {
                let apiUrl = `/auth/verify?token=${token}`;
                if (email) {
                    apiUrl += `&email=${email}`;
                }
                const response = await apiFetch(apiUrl);
                const data = await response.json();

                if (response.ok) {
                    navigate(`/verification-success?email=${encodeURIComponent(data.email)}`);
                } else {
                    navigate(`/verification-failed?reason=${encodeURIComponent(data.detail || 'invalid_token')}`);
                }
            } catch (err) {
                
                navigate('/verification-failed?reason=server_error');
            } finally {
                setIsProcessing(false);
            }
        };

        verify();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white selection:bg-indigo-100 font-sans relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-r from-indigo-100/40 to-purple-100/40 rounded-full blur-[120px] opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-l from-blue-100/40 to-cyan-100/40 rounded-full blur-[100px] opacity-50"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150"></div>
            </div>
            <div className="text-center space-y-4 relative z-10">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                <p className="text-slate-600 font-medium text-lg">이메일 인증을 처리 중입니다...</p>
            </div>
        </div>
    );
};

export default VerifyEmail;
