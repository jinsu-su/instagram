import { Navigate } from 'react-router-dom';

export function PrivateRoute({ children }) {
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

