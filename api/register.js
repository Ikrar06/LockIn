// api/register.js
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  console.log('Register API called:', req.method, req.url);

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
    return res.status(405).json({ 
      message: 'Method tidak diizinkan. Gunakan POST.',
      method: req.method 
    });
  }

  try {
    console.log('Processing registration request...');
    const { email, username, salt, verificationKey, destructionCode } = req.body;

    console.log('Registration data received:', {
      email: email ? 'provided' : 'missing',
      username: username ? 'provided' : 'missing',
      salt: salt ? 'provided' : 'missing',
      verificationKey: verificationKey ? 'provided' : 'missing',
      destructionCode: destructionCode ? 'provided' : 'missing'
    });

    // Validasi input
    if (!email || !username || !salt || !verificationKey || !destructionCode) {
      console.log('Validation failed: missing required fields');
      return res.status(400).json({ 
        message: 'Data tidak lengkap: email, username, salt, verificationKey, dan destructionCode diperlukan' 
      });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Validation failed: invalid email format');
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    // Validasi username
    if (username.length < 3) {
      console.log('Validation failed: username too short');
      return res.status(400).json({ message: 'Username minimal 3 karakter' });
    }

    console.log('Checking if user already exists...');
    // Cek apakah user sudah terdaftar
    const userDoc = db.collection('users').doc(email);
    const userSnap = await userDoc.get();

    if (userSnap.exists) {
      console.log('Registration failed: email already exists');
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    console.log('Creating new user account...');
    // Buat akun baru
    const userData = {
      email: email,
      username: username,
      salt: salt, // Array of numbers dari crypto.getRandomValues
      verificationKey: verificationKey, // Base64 string
      destructionCode: destructionCode, // Hex string
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      profilePicture: null
    };

    await userDoc.set(userData);
    console.log('User document created successfully');

    // Buat vault kosong untuk user
    console.log('Creating empty vault for user...');
    const vaultDoc = db.collection('vaults').doc(email);
    await vaultDoc.set({
      encryptedData: '', // Data vault yang terenkripsi (string kosong untuk akun baru)
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      version: 1
    });
    console.log('Vault document created successfully');

    console.log(`User registered successfully: ${email}`);

    return res.status(201).json({
      message: 'Akun berhasil dibuat!',
      user: { 
        email: email, 
        username: username,
        createdAt: new Date().toISOString()
      },
      success: true
    });

  } catch (error) {
    console.error('Register API error:', error);
    
    // Log detailed error for debugging
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return res.status(500).json({ 
      message: 'Terjadi kesalahan server saat registrasi',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      success: false
    });
  }
}