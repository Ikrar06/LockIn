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
        console.log(`LOG DIBUAT: Aksi '${aksi}'`);
    } catch (error) {
        console.error("KRITIS: Gagal mencatat log ke Firestore!", error);
    }
}

// Vercel Function Handler
module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method tidak diizinkan. Gunakan POST.' });
    }

    const { email, username, salt, verificationKey, destructionCode } = req.body;
    
    if (!email || !username || !salt || !verificationKey || !destructionCode) {
        return res.status(400).json({ message: 'Registrasi gagal: Semua data harus diisi.' });
    }

    try {
        const userRef = usersCollection.doc(email);
        if ((await userRef.get()).exists) {
            return res.status(409).json({ message: 'Email ini sudah terdaftar.' });
        }

        const keyBuffer = Buffer.from(verificationKey, 'base64');
        const verificationHash = await bcrypt.hash(keyBuffer, 10);
        const destructionHash = await bcrypt.hash(destructionCode, 10);

        await userRef.set({
            username: username,
            salt: salt,
            verification_hash: verificationHash,
            destruction_hash: destructionHash,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await brankasCollection.doc(email).set({
            encrypted_vault: '',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await catatLog('REGISTER_SUCCESS', { 
            userEmail: email, 
            ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({ message: 'Akun berhasil dibuat!', email: email });
        
    } catch (error) {
        console.error("Error di /api/register:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};