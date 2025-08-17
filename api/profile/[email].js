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
        console.log('Firebase initialized successfully in Profile Get');
    } catch (error) {
        console.error("KRITIS: Gagal memuat konfigurasi Firebase di Profile Get.", error);
    }
}

const db = admin.firestore();
const usersCollection = db.collection('users');

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method tidak diizinkan. Gunakan GET.' });
    }

    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({ message: 'Email parameter diperlukan' });
        }

        const decodedEmail = decodeURIComponent(email);
        
        const userDoc = await usersCollection.doc(decodedEmail).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ message: "Profil pengguna tidak ditemukan." });
        }
        
        const userData = userDoc.data();
        
        const responsePayload = {
            username: userData.username,
            profilePhotoUrl: userData.profilePhotoUrl || null,
            salt: userData.salt,
            createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : null
        };

        res.status(200).json(responsePayload);

    } catch (error) {
        console.error("Error di GET /api/profile/[email]:", error);
        res.status(500).json({ message: "Terjadi kesalahan server." });
    }
};