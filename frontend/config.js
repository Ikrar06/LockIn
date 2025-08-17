// File: frontend/config.js
// Deteksi environment secara otomatis
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

let API_URL;
if (isProduction) {
    // Untuk production di Vercel - gunakan relative path
    API_URL = '/api';
} else {
    // Untuk development local
    API_URL = 'http://localhost:5000/api';
}

window.config = {
    API_URL: API_URL
};

console.log('Environment:', isProduction ? 'Production' : 'Development');
console.log('API Config loaded:', window.config.API_URL);