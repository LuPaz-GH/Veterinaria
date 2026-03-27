import axios from 'axios';

// ✅ Crear instancia de axios con configuración base
const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ✅ INTERCEPTOR DE REQUEST: Agrega el token JWT automáticamente
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        
        // 🔍 Logging para debug (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            console.log('🔐 [API Interceptor] Token encontrado:', token ? '✅ Sí' : '❌ No');
            console.log('🔐 [API Interceptor] URL:', config.url);
        }
        
        if (token) {
            // Limpiar posibles comillas extra o espacios
            const cleanToken = token.trim().replace(/^["']|["']$/g, '');
            config.headers.Authorization = `Bearer ${cleanToken}`;
            
            if (process.env.NODE_ENV === 'development') {
                console.log('🔐 [API Interceptor] Header Authorization agregado');
            }
        }
        
        return config;
    },
    (error) => {
        console.error('❌ [API Interceptor] Error en request:', error);
        return Promise.reject(error);
    }
);

// ✅ INTERCEPTOR DE RESPONSE: Maneja errores de autenticación
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // 🔍 Logging de errores
        if (process.env.NODE_ENV === 'development') {
            console.error('❌ [API Response] Error:', {
                status: error.response?.status,
                message: error.response?.data?.message,
                url: error.config?.url,
                method: error.config?.method
            });
        }
        
        // Si el error es 401 → token inválido o expirado
        if (error.response?.status === 401) {
            console.warn('⚠️ [API] Token inválido o expirado → limpiando sesión');
            
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Solo redirigir si no estamos ya en login
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        
        // Error 403 → permisos insuficientes
        if (error.response?.status === 403) {
            console.warn('⚠️ [API] Acceso denegado (403) - permisos insuficientes');
        }
        
        return Promise.reject(error);
    }
);

export default api;