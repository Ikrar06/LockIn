// api/login.js
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
  console.log('Login API called:', req.method, req.url);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method tidak diizinkan. Gunakan POST.' });
  }

  try {
    console.log('Processing login request...');
    const { email, verificationKey } = req.body;

    console.log('Login data received:', {
      email: email ? 'provided' : 'missing',
      verificationKey: verificationKey ? 'provided' : 'missing'
    });

    // Validasi input
    if (!email || !verificationKey) {
      console.log('Validation failed: missing required fields');
      return res.status(400).json({ message: 'Email dan verificationKey diperlukan' });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Validation failed: invalid email format');
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    console.log('Looking up user in database...');
    // Cek user di database
    const userDoc = doc(db, 'users', email);
    const userSnap = await getDoc(userDoc);

    if (!userSnap.exists()) {
      console.log('Login failed: user not found');
      return res.status(401).json({ message: 'Incorrect email or Master Password.' });
    }

    const userData = userSnap.data();
    console.log('User found, verifying credentials...');

    // Verifikasi kunci verifikasi
    if (userData.verificationKey !== verificationKey) {
      console.log('Login failed: incorrect verification key');
      return res.status(401).json({ message: 'Incorrect email or Master Password.' });
    }

    console.log('Credentials verified, fetching vault data...');
    // Ambil data vault user
    const vaultDoc = doc(db, 'vaults', email);
    const vaultSnap = await getDoc(vaultDoc);
    
    let encryptedVault = '';
    if (vaultSnap.exists()) {
      const vaultData = vaultSnap.data();
      encryptedVault = vaultData.encryptedData || '';
      console.log('Vault data found:', encryptedVault ? 'has data' : 'empty');
    } else {
      console.log('No vault data found, user has empty vault');
    }

    console.log(`Login successful for user: ${email}`);

    // Return success response with user data
    return res.status(200).json({
      message: 'Login berhasil',
      username: userData.username,
      encryptedVault: encryptedVault,
      lastLogin: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    console.error('Login API error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return res.status(500).json({ 
      message: 'Terjadi kesalahan server saat login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      success: false
    });
  }
}