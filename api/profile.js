// api/profile.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email parameter diperlukan' });
    }

    // Cek user exists
    const userDoc = doc(db, 'users', email);
    const userSnap = await getDoc(userDoc);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (req.method === 'GET') {
      // Ambil profile data
      const userData = userSnap.data();
      
      return res.status(200).json({
        email: userData.email,
        username: userData.username,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        profilePicture: userData.profilePicture || null
      });
    }

    if (req.method === 'PUT') {
      // Update profile
      const { 
        verificationKey, 
        username, 
        profilePicture,
        newSalt,
        newVerificationKey 
      } = req.body;

      if (!verificationKey) {
        return res.status(400).json({ message: 'verificationKey diperlukan untuk verifikasi' });
      }

      // Verifikasi user
      const userData = userSnap.data();
      if (userData.verificationKey !== verificationKey) {
        return res.status(401).json({ message: 'Unauthorized: Invalid verification key' });
      }

      // Prepare update data
      const updateData = {
        updatedAt: new Date().toISOString()
      };

      // Update username jika provided
      if (username && username !== userData.username) {
        updateData.username = username;
      }

      // Update profile picture jika provided
      if (profilePicture !== undefined) {
        updateData.profilePicture = profilePicture;
      }

      // Update master password (salt dan verificationKey baru)
      if (newSalt && newVerificationKey) {
        updateData.salt = newSalt;
        updateData.verificationKey = newVerificationKey;
      }

      // Update document
      await updateDoc(userDoc, updateData);

      return res.status(200).json({
        message: 'Profile berhasil diupdate',
        updatedFields: Object.keys(updateData),
        updatedAt: updateData.updatedAt
      });
    }

  } catch (error) {
    console.error('Profile operation error:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}