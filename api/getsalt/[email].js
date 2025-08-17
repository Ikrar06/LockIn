// api/getsalt/[email].js
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    // Ambil email dari dynamic route parameter
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email parameter diperlukan' });
    }

    // Decode URL jika perlu (untuk menangani karakter khusus dalam email)
    const decodedEmail = decodeURIComponent(email);

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(decodedEmail)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    // Cek user di database
    const userDoc = doc(db, 'users', decodedEmail);
    const userSnap = await getDoc(userDoc);

    if (!userSnap.exists()) {
      // Return pesan yang sama seperti di auth.js untuk konsistensi
      return res.status(404).json({ message: 'Incorrect email or Master Password.' });
    }

    const userData = userSnap.data();
    
    // Return salt (array of numbers)
    return res.status(200).json({
      salt: userData.salt
    });

  } catch (error) {
    console.error('GetSalt error:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}