
import { INSTAGRAM_API_BASE_URL } from './config';

const extractErrorMessage = (detail) => {
    if (!detail) return '요청 처리 중 오류가 발생했습니다.';
    if (typeof detail === 'string') return detail;

    if (Array.isArray(detail)) {
        const messages = detail
            .map(item => {
                if (!item) return '';
                if (typeof item === 'string') return item;
                if (typeof item === 'object') {
                    const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
                    const message = item.msg || item.message || JSON.stringify(item);
                    return field ? `${String(field)}: ${String(message)}` : String(message);
                }
                return String(item);
            })
            .filter(msg => typeof msg === 'string' && msg.length > 0);
        const result = messages.join('; ') || '유효성 검사 오류';

        return result;
    }

    if (typeof detail === 'object') {
        const best = detail.detail || detail.message || detail.msg || JSON.stringify(detail);
        const result = typeof best === 'string' ? best : JSON.stringify(best);

        return result;
    }

    const final = String(detail);

    return final;
};


export const translateError = (err) => {
  if (!err) return '요청 처리 중 오류가 발생했습니다.';
  const msg = err.message || String(err);

  // Network / server unreachable
  if (
    msg.toLowerCase().includes('failed to fetch') ||
    msg.toLowerCase().includes('networkerror') ||
    msg.toLowerCase().includes('network request failed') ||
    msg.toLowerCase().includes('load failed')
  ) {
    return '서버와 연결할 수 없습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.';
  }

  // Timeout
  if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')) {
    return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
  }

  // Auth errors
  if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
    return '인증이 만료되었습니다. 다시 로그인해 주세요.';
  }

  // Return as-is if already Korean or from server
  return msg || '요청 처리 중 예기치 못한 오류가 발생했습니다.';
};

export const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('access_token');

    const headers = {
        'ngrok-skip-browser-warning': 'true'
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.headers) {
        Object.entries(options.headers).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
                headers[k] = v;
            } else {
                delete headers[k];
            }
        });
    }

    const url = endpoint.startsWith('http') ? endpoint : `${INSTAGRAM_API_BASE_URL}${endpoint}`;

    const MAX_RETRIES = 2;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
        let response;
        try {
            response = await fetch(url, {
                ...options,
                headers,
            });

            if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
                if (response.status === 401) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('customer_id');
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    return response;
                }

                if (response.status === 422) {
                    const rawBody = await response.json();
                    const safeMessage = extractErrorMessage(rawBody?.detail || rawBody);
                    return {
                        ok: false,
                        status: 422,
                        json: async () => ({ detail: safeMessage, _original: rawBody, _shield_v4: true })
                    };
                }
                return response;
            }

            if (attempt === MAX_RETRIES) return response;

        } catch (fetchErr) {
            if (attempt === MAX_RETRIES) throw fetchErr;
        }

        attempt++;
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 3000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
};

export const safeFetch = async (url, options = {}) => {
    try {
        const res = await apiFetch(url, options);
        return res;
    } catch (err) {
        return {
            ok: false,
            status: 500,
            json: async () => ({ detail: '네트워크 통신 오류가 발생했습니다.' }),
            text: async () => '네트워크 통신 오류가 발생했습니다.',
            headers: new Headers(),
        };
    }
};

export const safeString = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return String(val);

    try {
        if (Array.isArray(val)) {
            if (val.length === 0) return '';
            const first = val[0];
            const extracted = (typeof first === 'object' && first !== null) ?
                (first.msg || first.message || first.detail || JSON.stringify(first)) :
                String(first);
            const res = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
            return String(res);
        }

        if (typeof val === 'object') {
            const best = val.detail || val.message || val.msg || JSON.stringify(val);
            const res = typeof best === 'string' ? best : JSON.stringify(best);
            return String(res);
        }

        return String(val);
    } catch (e) {
        return 'Data Error';
    }
};
