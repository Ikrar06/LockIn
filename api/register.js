// api/register.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    const { email, username, salt, verificationKey, destructionCode } = req.body;

    // Validasi input
    if (!email || !username || !salt || !verificationKey || !destructionCode) {
      return res.status(400).json({ 
        message: 'Data tidak lengkap: email, username, salt, verificationKey, dan destructionCode diperlukan' 
      });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    // Cek apakah user sudah terdaftar
    const userDoc = doc(db, 'users', email);
    const userSnap = await getDoc(userDoc);

    if (userSnap.exists()) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    // Buat akun baru
    const userData = {
      email: email,
      username: username,
      salt: salt, // Array of numbers dari crypto.getRandomValues
      verificationKey: verificationKey, // Base64 string
      destructionCode: destructionCode, // Hex string
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(userDoc, userData);

    // Buat vault kosong untuk user
    const vaultDoc = doc(db, 'vaults', email);
    await setDoc(vaultDoc, {
      encryptedData: '', // Data vault yang terenkripsi (string kosong untuk akun baru)
      lastUpdated: new Date().toISOString()
    });

    console.log(`User registered successfully: ${email}`);

    return res.status(200).json({
      message: 'Akun berhasil dibuat',
      user: { 
        email: email, 
        username: username,
        createdAt: userData.createdAt
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}