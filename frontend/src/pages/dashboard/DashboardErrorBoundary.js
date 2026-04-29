import React from 'react';

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {

  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#e11d48', marginBottom: '16px' }}>화면 렌더링 오류</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            일시적인 오류가 발생했습니다. 페이지를 새로고침해주세요.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '16px' }}>
            {String(this.state.error?.message || '')}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            style={{ padding: '12px 32px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;
