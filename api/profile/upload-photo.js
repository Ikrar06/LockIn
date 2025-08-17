const admin = require('firebase-admin');
const multer = require('multer');

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
        console.log('Firebase initialized successfully in Profile Upload Photo');
    } catch (error) {
        console.error("KRITIS: Gagal memuat konfigurasi Firebase di Profile Upload Photo.", error);
    }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const usersCollection = db.collection('users');
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

// Setup Multer for file upload
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

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

    // Use multer middleware
    upload.single('profilePhoto')(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: err.message });
        }

        const { email } = req.body;
        const file = req.file;

        if (!email || !file) {
            return res.status(400).json({ message: 'Email dan file foto diperlukan.' });
        }

        try {
            const filePath = `profile-pictures/${email}/${Date.now()}_${file.originalname}`;
            const blob = bucket.file(filePath);
            
            const blobStream = blob.createWriteStream({
                resumable: false,
                metadata: { 
                    contentType: file.mimetype 
                }
            });

            blobStream.on('error', (streamErr) => {
                console.error("Error di BlobStream:", streamErr);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Gagal mengunggah file ke bucket.' });
                }
            });

            blobStream.on('finish', async () => {
                try {
                    // Make the file public
                    await blob.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

                    // Update user profile with new photo URL
                    await usersCollection.doc(email).update({ 
                        profilePhotoUrl: publicUrl 
                    });
                    
                    // Log the activity
                    await catatLog('PROFILE_PHOTO_UPDATED', { 
                        userEmail: email, 
                        ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown' 
                    });
                    
                    if (!res.headersSent) {
                        res.status(200).json({ 
                            message: 'Foto profil berhasil diperbarui', 
                            profilePhotoUrl: publicUrl 
                        });
                    }
                } catch (innerError) {
                    console.error("Error saat membuat publik atau menyimpan ke Firestore:", innerError);
                    if (!res.headersSent) {
                        res.status(500).json({ message: "Gagal memproses file setelah diunggah." });
                    }
                }
            });

            // Upload the file
            blobStream.end(file.buffer);

        } catch (error) {
            console.error("Error utama di /api/profile/upload-photo:", error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Terjadi kesalahan tak terduga pada server.' });
            }
        }
    });
};