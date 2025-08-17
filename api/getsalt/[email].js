const admin = require('firebase-admin');

// --- Inisialisasi Firebase Admin ---
if (!admin.apps.length) {
    try {
        const firebaseConfig = {
            type: process.env.FIREBASE_TYPE,
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI,
            token_uri: process.env.FIREBASE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
            universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
        };

        admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
            storageBucket: "gs://lockin-4691a.firebasestorage.app"
        });
        console.log('Firebase initialized successfully in GetSalt');
    } catch (error) {
        console.error("KRITIS: Gagal memuat konfigurasi Firebase di GetSalt.", error);
    }
}

const db = admin.firestore();
const usersCollection = db.collection('users');

module.exports = async function handler(req, res) {
    console.log('GetSalt API called:', req.method, req.url);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request');
        return res.status(200).end();
    }

    // Only allow GET method
    if (req.method !== 'GET') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ message: 'Method tidak diizinkan. Gunakan GET.' });
    }

    try {
        // Ambil email dari dynamic route parameter
        const { email } = req.query;
        console.log('Email parameter received:', email);

        if (!email) {
            console.log('Email parameter missing');
            return res.status(400).json({ message: 'Email parameter diperlukan' });
        }

        // Decode URL jika perlu (untuk menangani karakter khusus dalam email)
        const decodedEmail = decodeURIComponent(email);
        console.log('Decoded email:', decodedEmail);

        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(decodedEmail)) {
            console.log('Invalid email format');
            return res.status(400).json({ message: 'Format email tidak valid' });
        }

        console.log('Looking up user in database using Firebase Admin...');
        
        // Menggunakan Firebase Admin SDK (bukan client SDK)
        const userDoc = await usersCollection.doc(decodedEmail).get();

        if (!userDoc.exists) {
            console.log('User not found:', decodedEmail);
            // Return pesan yang sama seperti di auth.js untuk konsistensi
            return res.status(404).json({ message: 'Incorrect email or Master Password.' });
        }

        const userData = userDoc.data();
        console.log('User found, returning salt');
        
        // Return salt (array of numbers)
        return res.status(200).json({
            salt: userData.salt,
            success: true
        });

    } catch (error) {
        console.error('GetSalt API error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        return res.status(500).json({ 
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            success: false
        });
    }
};