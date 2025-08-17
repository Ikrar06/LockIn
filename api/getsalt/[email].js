// api/getsalt/[email].js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBYour_API_Key_Here",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "lockin-4691a.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "lockin-4691a",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "lockin-4691a.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export default async function handler(req, res) {
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

    console.log('Looking up user in database...');
    // Cek user di database
    const userDoc = doc(db, 'users', decodedEmail);
    const userSnap = await getDoc(userDoc);

    if (!userSnap.exists()) {
      console.log('User not found:', decodedEmail);
      // Return pesan yang sama seperti di auth.js untuk konsistensi
      return res.status(404).json({ message: 'Incorrect email or Master Password.' });
    }

    const userData = userSnap.data();
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
}