import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import InstagramMetaOnboardPage from './pages/InstagramMetaOnboard';
import InstagramIntegrationConsolePage from './pages/InstagramIntegrationConsole';
import SignupPage from './pages/SignupPage';
import InstagramAIChatbotPage from './pages/InstagramAIChatbot';
import InstagramIntegrationGuidePage from './pages/InstagramIntegrationGuide';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Home from './pages/Home';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerificationResult from './pages/VerificationResult';
import VerifyEmail from './pages/VerifyEmail';
import Pricing from './pages/Pricing';
import { PrivateRoute, PublicRoute } from './components/PrivateRoute';
import { useEffect } from 'react';

function App() {
  // Handle double slashes in URL (common in email links)
  // We do this EARLY before the Router/Routes can trigger a fallback redirect
  const { pathname, search } = window.location;
  if (pathname.startsWith('//')) {
    const normalizedPath = pathname.replace(/^\/\/+/, '/');
    window.location.replace(normalizedPath + search);
    return null; // Return null to prevent rendering with the malformed URL
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing Home Page (Root) */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Home />
              </PublicRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <PublicRoute>
                <Pricing />
              </PublicRoute>
            }
          />

          {/* Login / Integration Console */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <InstagramIntegrationConsolePage />
              </PublicRoute>
            }
          />

          {/* Signup Page */}
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          {/* 보호된 라우트: 로그인 필요 */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <PrivateRoute>
                <Inbox />
              </PrivateRoute>
            }
          />

          {/* OAuth 콜백 페이지 */}
          <Route path="/onboard/meta" element={<InstagramMetaOnboardPage />} />

          {/* 공개 라우트 */}
          <Route path="/instagram-integration-console" element={<InstagramIntegrationConsolePage />} />
          <Route path="/instagram-ai-chatbot" element={<InstagramAIChatbotPage />} />
          <Route path="/instagram-integration-guide" element={<InstagramIntegrationGuidePage />} />

          {/* Email Verification Result */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verification-success" element={<VerificationResult />} />
          <Route path="/verification-failed" element={<VerificationResult />} />

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;


