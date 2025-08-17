const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

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
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error("KRITIS: Gagal memuat konfigurasi Firebase.", error);
    }
}

const db = admin.firestore();
const usersCollection = db.collection('users');
const brankasCollection = db.collection('brankas');
const logsCollection = db.collection('activity_logs');

// Fungsi Pencatatan Log
async function catatLog(aksi, detail = {}) {
    try {
        await logsCollection.add({
            action: aksi,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ...detail
        });
    } catch (error) {
        console.error("KRITIS: Gagal mencatat log ke Firestore!", error);
    }
}

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method tidak diizinkan. Gunakan POST.' });
    }

    const { email, verificationKey } = req.body;
    
    if (!email || !verificationKey) {
        return res.status(400).json({ message: 'Login gagal: Data tidak lengkap.' });
    }

    try {
        const userDoc = await usersCollection.doc(email).get();

        if (!userDoc.exists) {
            await catatLog('LOGIN_FAIL', { 
                email: email, 
                ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown', 
                reason: 'User not found' 
            });
            return res.status(401).json({ message: 'Incorrect email or Master Password.' });
        }
        
        const userData = userDoc.data();
        const keyBuffer = Buffer.from(verificationKey, 'base64');
        const isMatch = await bcrypt.compare(keyBuffer, userData.verification_hash);

        if (!isMatch) {
            await catatLog('LOGIN_FAIL', { 
                userEmail: email, 
                ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown', 
                reason: 'Password mismatch' 
            });
            return res.status(401).json({ message: 'Incorrect email or Master Password.' });
        }

        const brankasDoc = await brankasCollection.doc(email).get();
        
        const responsePayload = {
            message: 'Login berhasil',
            username: userData.username,
            encryptedVault: brankasDoc.exists ? brankasDoc.data().encrypted_vault : ''
        };

        await catatLog('LOGIN_SUCCESS', { 
            userEmail: email, 
            ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown' 
        });
        
        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error("ERROR KRITIS DI ENDPOINT LOGIN:", error);
        return res.status(500).json({ message: 'Terjadi kesalahan internal pada server.' });
    }
};