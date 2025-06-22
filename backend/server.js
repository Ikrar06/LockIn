// --- 1. Impor Pustaka ---
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

// --- 2. Inisialisasi Firebase Admin ---
// JANGAN PERNAH UNGGAH FILE KUNCI INI KE GITHUB!
try {
    const serviceAccount = require('./firebase-secret-key.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("KRITIS: Gagal memuat file kunci Firebase. Pastikan file 'firebase-secret-key.json' ada dan path-nya benar.", error);
    process.exit(1);
}

// Dapatkan akses ke Firestore dan buat referensi ke collection
const db = admin.firestore();
const usersCollection = db.collection('users');
const brankasCollection = db.collection('brankas');
const logsCollection = db.collection('activity_logs');

// --- 3. Setup Aplikasi Express ---
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1); // Diperlukan agar req.ip berfungsi di belakang Nginx

// --- 4. Fungsi Pencatatan Log (Accounting) ---
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

// ======================================================================
// ENDPOINT API
// ======================================================================

app.post('/register', async (req, res) => {
    const { email, username, salt, verificationKey } = req.body;
    if (!email || !username || !salt || !verificationKey) {
        return res.status(400).json({ message: 'Registrasi gagal: Data tidak lengkap.' });
    }

    try {
        const userRef = usersCollection.doc(email);
        if ((await userRef.get()).exists) {
            return res.status(409).json({ message: 'Email ini sudah terdaftar.' });
        }

        const keyBuffer = Buffer.from(verificationKey, 'base64');
        const verificationHash = await bcrypt.hash(keyBuffer, 10);

        // Simpan data profil ke collection 'users'
        await userRef.set({
            username: username,
            salt: salt,
            verification_hash: verificationHash,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Buat brankas kosong untuk pengguna baru di collection 'brankas'
        await brankasCollection.doc(email).set({
            encrypted_vault: '',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await catatLog('REGISTER_SUCCESS', { 
            userEmail: email, 
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        res.status(201).json({ message: 'Akun berhasil dibuat!', email: email });
    } catch (error) {
        console.error("Error di /register:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

app.get('/getsalt/:email', async (req, res) => {
    try {
        const doc = await usersCollection.doc(req.params.email).get();
        if (!doc.exists) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }
        res.status(200).json({ salt: doc.data().salt });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

app.post('/login', async (req, res) => {
    const { email, verificationKey } = req.body;
    if (!email || !verificationKey) {
        return res.status(400).json({ message: 'Login gagal: Data tidak lengkap.' });
    }

    try {
        const userDoc = await usersCollection.doc(email).get();

        if (!userDoc.exists) {
            await catatLog('LOGIN_FAIL', { email: email, ipAddress: req.ip, reason: 'User not found' });
            return res.status(401).json({ message: 'Email atau Master Password salah.' });
        }
        
        const userData = userDoc.data();
        const keyBuffer = Buffer.from(verificationKey, 'base64');
        const isMatch = await bcrypt.compare(keyBuffer, userData.verification_hash);

        if (!isMatch) {
            await catatLog('LOGIN_FAIL', { userEmail: email, ipAddress: req.ip, reason: 'Password mismatch' });
            return res.status(401).json({ message: 'Email atau Master Password salah.' });
        }

        // Ambil brankas secara terpisah
        const brankasDoc = await brankasCollection.doc(email).get();
        
        // Buat objek balasan yang bersih
        const responsePayload = {
            message: 'Login berhasil',
            username: userData.username,
            encryptedVault: brankasDoc.exists ? brankasDoc.data().encrypted_vault : ''
        };

        // Catat log SEBELUM mengirim balasan
        await catatLog('LOGIN_SUCCESS', { userEmail: email, ipAddress: req.ip });
        
        // Kirim balasan yang sudah bersih
        console.log(`Pengguna berhasil login: ${email}. Mengirim data brankas.`);
        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error("========================================");
        console.error("!!!   ERROR KRITIS DI ENDPOINT LOGIN   !!!");
        console.error("========================================");
        console.error(error);
        return res.status(500).json({ message: 'Terjadi kesalahan internal pada server.' });
    }
});

app.post('/vault/sync', async (req, res) => {
    // Di aplikasi nyata, 'email' harus didapat dari sesi/token yang terverifikasi
    const { email, encryptedVault } = req.body;
    if (!email || encryptedVault === undefined) {
        return res.status(400).json({ message: 'Sinkronisasi gagal: Data tidak lengkap.' });
    }

    try {
        const brankasRef = brankasCollection.doc(email);
        await brankasRef.update({
            encrypted_vault: encryptedVault,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await catatLog('VAULT_UPDATE', { userEmail: email, ipAddress: req.ip });
        res.status(200).json({ message: 'Brankas berhasil disimpan ke cloud.' });
    } catch (error) {
        console.error("Error di /vault/sync:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});
app.get('/vault/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const doc = await brankasCollection.doc(email).get();
        if (!doc.exists) {
            return res.status(404).json({ message: "Brankas tidak ditemukan." });
        }
        res.status(200).json({ encryptedVault: doc.data().encrypted_vault });
    } catch (error) {
        console.error("Error di GET /vault/:email", error);
        res.status(500).json({ message: "Terjadi kesalahan server." });
    }
});

// --- 5. Jalankan Server ---
app.listen(PORT, () => {
  console.log(`Server backend berjalan dan mendengarkan di http://localhost:${PORT}`);
});