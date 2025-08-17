// api/vault.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email parameter diperlukan' });
  }

  try {
    // Validasi user exists
    const userDoc = doc(db, 'users', email);
    const userSnap = await getDoc(userDoc);

    if (!userSnap.exists()) {
      return res.status(401).json({ message: 'User tidak ditemukan' });
    }

    const vaultDoc = doc(db, 'vaults', email);

    switch (req.method) {
      case 'GET':
        // Ambil data vault
        const vaultSnap = await getDoc(vaultDoc);
        const encryptedData = vaultSnap.exists() ? vaultSnap.data().encryptedData : '';
        
        return res.status(200).json({
          encryptedData: encryptedData,
          lastUpdated: vaultSnap.exists() ? vaultSnap.data().lastUpdated : null
        });

      case 'POST':
      case 'PUT':
        // Simpan/update data vault
        const { encryptedData: newEncryptedData, verificationKey } = req.body;

        if (!newEncryptedData || !verificationKey) {
          return res.status(400).json({ message: 'encryptedData dan verificationKey diperlukan' });
        }

        // Verifikasi user dengan verificationKey
        const userData = userSnap.data();
        if (userData.verificationKey !== verificationKey) {
          return res.status(401).json({ message: 'Unauthorized: Invalid verification key' });
        }

        const vaultData = {
          encryptedData: newEncryptedData,
          lastUpdated: new Date().toISOString()
        };

        await setDoc(vaultDoc, vaultData, { merge: true });

        return res.status(200).json({
          message: 'Vault berhasil disimpan',
          lastUpdated: vaultData.lastUpdated
        });

      case 'DELETE':
        // Hapus vault (emergency deletion)
        const { verificationKey: deleteVerificationKey, destructionCode } = req.body;

        if (!deleteVerificationKey || !destructionCode) {
          return res.status(400).json({ message: 'verificationKey dan destructionCode diperlukan' });
        }

        // Verifikasi user
        const deleteUserData = userSnap.data();
        if (deleteUserData.verificationKey !== deleteVerificationKey || 
            deleteUserData.destructionCode !== destructionCode) {
          return res.status(401).json({ message: 'Unauthorized: Invalid credentials' });
        }

        // Hapus vault data
        await setDoc(vaultDoc, {
          encryptedData: '',
          lastUpdated: new Date().toISOString(),
          deleted: true
        });

        return res.status(200).json({
          message: 'Vault berhasil dihapus',
          deletedAt: new Date().toISOString()
        });

      default:
        return res.status(405).json({ message: 'Method tidak diizinkan' });
    }

  } catch (error) {
    console.error('Vault operation error:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}