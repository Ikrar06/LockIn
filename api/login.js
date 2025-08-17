// api/login.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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
    const { email, verificationKey } = req.body;

    // Validasi input
    if (!email || !verificationKey) {
      return res.status(400).json({ message: 'Email dan verificationKey diperlukan' });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    // Cek user di database
    const userDoc = doc(db, 'users', email);
    const userSnap = await getDoc(userDoc);

    if (!userSnap.exists()) {
      return res.status(401).json({ message: 'Incorrect email or Master Password.' });
    }

    const userData = userSnap.data();

    // Verifikasi kunci verifikasi
    if (userData.verificationKey !== verificationKey) {
      return res.status(401).json({ message: 'Incorrect email or Master Password.' });
    }

    // Ambil data vault user
    const vaultDoc = doc(db, 'vaults', email);
    const vaultSnap = await getDoc(vaultDoc);
    
    let encryptedVault = '';
    if (vaultSnap.exists()) {
      encryptedVault = vaultSnap.data().encryptedData || '';
    }

    console.log(`User logged in successfully: ${email}`);

    return res.status(200).json({
      message: 'Login berhasil',
      username: userData.username,
      encryptedVault: encryptedVault,
      lastLogin: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}