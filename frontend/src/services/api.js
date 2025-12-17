const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
    constructor(){
        this.baseUrl = API_BASE_URL;
        this.isRefreshing = false;
        this.failedQueue = [];
    }

    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        }

        if (includeAuth) {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // NEW: Process queued requests after refresh
    processQueue(error, token = null) {
        this.failedQueue.forEach(prom => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(token);
            }
        });
        this.failedQueue = [];
    }

    // NEW: Refresh token logic
    async refreshToken() {
        const refresh = localStorage.getItem('refresh');
        if (!refresh) {
            throw new Error('No refresh token');
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        if (!response.ok) {
            throw new Error('Refresh failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access);
        return data.access;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(options.auth !== false),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            // IMPROVED: Handle 401 with token refresh
            if (response.status === 401 && options.auth !== false) {
                // Don't retry refresh endpoint itself
                if (endpoint === '/auth/refresh/') {
                    localStorage.clear();
                    window.location.href = '/login';
                    throw new Error('Session expired');
                }

                // If already refreshing, queue this request
                if (this.isRefreshing) {
                    return new Promise((resolve, reject) => {
                        this.failedQueue.push({ resolve, reject });
                    })
                    .then(token => {
                        config.headers['Authorization'] = `Bearer ${token}`;
                        return fetch(url, config).then(res => res.json());
                    })
                    .catch(err => {
                        throw err;
                    });
                }

                // Try to refresh token
                this.isRefreshing = true;

                try {
                    const newToken = await this.refreshToken();
                    this.isRefreshing = false;
                    this.processQueue(null, newToken);

                    // Retry original request with new token
                    config.headers['Authorization'] = `Bearer ${newToken}`;
                    const retryResponse = await fetch(url, config);
                    
                    if (!retryResponse.ok) {
                        const error = await retryResponse.json();
                        throw new Error(error.message || 'Request failed');
                    }
                    
                    return await retryResponse.json();
                } catch (refreshError) {
                    this.isRefreshing = false;
                    this.processQueue(refreshError, null);
                    
                    // Refresh failed - logout
                    localStorage.clear();
                    window.location.href = '/login';
                    throw new Error('Session expired');
                }
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET'});
    }

    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async patch(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: "DELETE"});
    }
}

export const api = new ApiService();
export default api;