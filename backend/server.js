const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const multer = require('multer');

// --- Inisialisasi Firebase Admin (Tidak Berubah) ---
try {
    const serviceAccount = require('./firebase-secret-key.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "gs://lockin-4691a.firebasestorage.app" // GANTI DENGAN STORAGE BUCKET ANDA
    });
} catch (error) {
    console.error("KRITIS: Gagal memuat file kunci Firebase.", error);
    process.exit(1);
}

// Dapatkan akses ke layanan Firebase
const db = admin.firestore();
const bucket = admin.storage().bucket();
const usersCollection = db.collection('users');
const brankasCollection = db.collection('brankas');
const logsCollection = db.collection('activity_logs');

// --- Setup Express & Multer ---
const app = express();
const PORT = 5000;
const upload = multer({ storage: multer.memoryStorage() }); // Simpan file di memori sementara

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

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

        // Simpan data profil ke collection 'users'
        await userRef.set({
            username: username,
            salt: salt,
            verification_hash: verificationHash,
            destruction_hash: destructionHash,
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

app.get('/profile/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const userDoc = await usersCollection.doc(email).get();
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
        console.error("Error di GET /profile/:email:", error);
        res.status(500).json({ message: "Terjadi kesalahan server." });
    }
});
app.post('/profile/update', async (req, res) => {
    const { email, newUsername, newVerificationKey } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email diperlukan.' });
    }

    try {
        const userRef = usersCollection.doc(email);
        const doc = await userRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        const dataToUpdate = {};
        let logAction = 'PROFILE_UPDATE';

        // Jika ada username baru, siapkan untuk diupdate
        if (newUsername) {
            dataToUpdate.username = newUsername;
        }

        // Jika ada password baru, siapkan hash baru untuk diupdate
        if (newVerificationKey) {
            const keyBuffer = Buffer.from(newVerificationKey, 'base64');
            dataToUpdate.verification_hash = await bcrypt.hash(keyBuffer, 10);
            logAction = 'PASSWORD_CHANGE_SUCCESS'; // Aksi log lebih spesifik
        }
        
        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'Tidak ada data untuk diubah.' });
        }
        
        await userRef.update(dataToUpdate);
        await catatLog(logAction, { userEmail: email, ipAddress: req.ip });

        res.status(200).json({ message: 'Profil berhasil diperbarui.', updatedUsername: dataToUpdate.username });

    } catch (error) {
        console.error("Error di /profile/update:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});
app.post('/profile/upload-photo', upload.single('profilePhoto'), async (req, res) => {
    console.log("Menerima permintaan ke /profile/upload-photo...");

    // Ambil data dari form-data
    const { email } = req.body;
    const file = req.file;

    // PENGAMAN 1: Pastikan file dan email ada.
    if (!email || !file) {
        console.error("Upload gagal: email atau file tidak ada.");
        return res.status(400).json({ message: 'Email dan file foto diperlukan.' });
    }

    console.log(`Menerima file '${file.originalname}' untuk email '${email}'.`);

    try {
        const filePath = `profile-pictures/${email}/${Date.now()}_${file.originalname}`;
        const blob = bucket.file(filePath);
        const blobStream = blob.createWriteStream({
            resumable: false, // Penting untuk buffer
            metadata: {
                contentType: file.mimetype,
                // Tambahkan metadata lain jika perlu
            }
        });

        blobStream.on('error', (err) => {
            console.error("Error di BlobStream:", err);
            // Jangan kirim respons lagi jika sudah dikirim
            if (!res.headersSent) {
                res.status(500).json({ message: 'Gagal mengunggah file ke bucket.' });
            }
        });

        blobStream.on('finish', async () => {
            console.log("File berhasil diunggah ke Firebase Storage.");
            try {
                // Buat file bisa diakses publik untuk mendapatkan URL
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                console.log(`URL publik file: ${publicUrl}`);

                // Simpan URL ke Firestore
                await usersCollection.doc(email).update({ profilePhotoUrl: publicUrl });
                console.log("URL berhasil disimpan ke Firestore.");

                await catatLog('PROFILE_PHOTO_UPDATED', { userEmail: email, ipAddress: req.ip });
                
                // Kirim kembali URL baru ke frontend
                if (!res.headersSent) {
                    res.status(200).json({ message: 'Foto profil berhasil diperbarui', profilePhotoUrl: publicUrl });
                }
            } catch (innerError) {
                console.error("Error saat membuat publik atau menyimpan ke Firestore:", innerError);
                if (!res.headersSent) {
                    res.status(500).json({ message: "Gagal memproses file setelah diunggah." });
                }
            }
        });

        // Akhiri stream dengan buffer file dari multer
        blobStream.end(file.buffer);

    } catch (error) {
        console.error("Error utama di /profile/upload-photo:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Terjadi kesalahan tak terduga pada server.' });
        }
    }

});
app.post('/vault/remote-wipe', async (req, res) => {
    const { email, destructionCode } = req.body;
    if (!email || !destructionCode) {
        return res.status(400).json({ message: 'Email dan Kode Penghancur diperlukan.' });
    }

    try {
        const userDoc = await usersCollection.doc(email).get();
        if (!userDoc.exists) {
            // Kita sengaja tidak memberitahu jika emailnya salah untuk keamanan
            return res.status(403).json({ message: 'Email atau Kode Penghancur salah.' });
        }

        const userData = userDoc.data();
        
        // Bandingkan kode yang dimasukkan dengan hash di database
        const isMatch = await bcrypt.compare(destructionCode, userData.destruction_hash);

        if (!isMatch) {
            await catatLog('REMOTE_WIPE_FAIL', { userEmail: email, ipAddress: req.ip, reason: 'Wrong destruction code' });
            return res.status(403).json({ message: 'Email atau Kode Penghancur salah.' });
        }

        // --- JIKA KODE BENAR, LAKUKAN PENGHANCURAN ---
        await brankasCollection.doc(email).update({ encrypted_vault: '' });
        
        await catatLog('REMOTE_WIPE_SUCCESS', { userEmail: email, ipAddress: req.ip });

        res.status(200).json({ message: 'Semua data di dalam brankas Anda telah berhasil dihapus secara permanen.' });

    } catch (error) {
        console.error("Error di /vault/remote-wipe:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});
// --- 5. Jalankan Server ---
app.listen(PORT, () => {
  console.log(`Server backend berjalan dan mendengarkan di http://localhost:${PORT}`);
});