import { Navigate } from 'react-router-dom';

export function PrivateRoute({ children }) {
  // NEW: Immediate token extraction from URL (for Google Login redirect optimization)
  // This must happen BEFORE the customerId/accessToken check below
  const queryParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = queryParams.get('access_token');
  const cidFromUrl = queryParams.get('customer_id');

  if (tokenFromUrl) {
    localStorage.setItem('access_token', tokenFromUrl);
  }
  if (cidFromUrl) {
    localStorage.setItem('customer_id', cidFromUrl);
  }

  const customerId = localStorage.getItem('customer_id');
  const accessToken = localStorage.getItem('access_token');

  if (!customerId || !accessToken) {
    // 하나라도 없으면 로그인 페이지로 및 상태 초기화
    localStorage.removeItem('customer_id');
    localStorage.removeItem('access_token');
    return <Navigate to="/" replace />;
  }

  return children;
}

export function PublicRoute({ children }) {
  const customerId = localStorage.getItem('customer_id');
  const accessToken = localStorage.getItem('access_token');

  if (customerId && accessToken) {
    // 이미 로그인되어 있으면 대시보드로
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

