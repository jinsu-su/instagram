
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                <p className="text-slate-600 font-medium text-lg">이메일 인증을 처리 중입니다...</p>
            </div>
        </div>
    );
};

export default VerifyEmail;
