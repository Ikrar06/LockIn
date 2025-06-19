// kripto.js
// Berkas ini berisi semua fungsi inti untuk keamanan aplikasi kita.
// Semua operasi kriptografi terjadi di browser pengguna, bukan di server.

/**
 * ===================================================================
 * FUNGSI-FUNGSI PEMBANTU (HELPER FUNCTIONS)
 * ===================================================================
 */

// Mengubah ArrayBuffer (hasil dari beberapa operasi kripto) menjadi string Hex
function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}


/**
 * ===================================================================
 * FUNGSI UTAMA KRIPTOGRAFI
 * ===================================================================
 */

/**
 * Menghasilkan salt acak yang aman.
 * @returns {Uint8Array} - Sebuah salt dengan panjang 16 byte.
 */
function buatSalt() {
  // window.crypto.getRandomValues adalah cara standar dan aman untuk
  // menghasilkan angka acak di browser.
  return window.crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Menurunkan kunci dari Master Password menggunakan PBKDF2.
 * Ini adalah "Mesin Pengaduk Ajaib" kita.
 * @param {string} masterPassword - Master Password yang diketik pengguna.
 * @param {Uint8Array} salt - Salt yang unik untuk pengguna tersebut.
 * @returns {Promise<{kunciEnkripsi: ArrayBuffer, kunciVerifikasi: ArrayBuffer}>} - Sebuah objek yang berisi Kunci Enkripsi dan Kunci Verifikasi.
 */
async function turunkanKunci(masterPassword, salt) {
  // 1. Impor Master Password mentah menjadi format yang bisa diproses oleh Web Crypto API.
  const masterKey = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  // 2. Gunakan algoritma PBKDF2 untuk "mengaduk" Master Password dan Salt.
  const bitTurunan = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 480000, // Jumlah iterasi yang tinggi sangat penting untuk keamanan!
      hash: "SHA-256", // Algoritma hash yang digunakan di dalam PBKDF2.
    },
    masterKey,
    512 // Kita minta 512 bit (64 byte) total.
  );

  // 3. Kita bagi hasil 64 byte tersebut menjadi dua kunci masing-masing 32 byte.
  const kunciEnkripsi = bitTurunan.slice(0, 32); // 32 byte pertama untuk enkripsi.
  const kunciVerifikasi = bitTurunan.slice(32);   // 32 byte sisanya untuk verifikasi login.

  return { kunciEnkripsi, kunciVerifikasi };
}

/**
 * Menghasilkan hash SHA-256 dari Kunci Verifikasi.
 * Ini adalah "Gambar Buram" yang akan dikirim ke server.
 * @param {ArrayBuffer} kunci - Kunci Verifikasi yang telah diturunkan.
 * @returns {Promise<string>} - Hash dalam format string heksadesimal.
 */
async function hashKunci(kunci) {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", kunci);
  return bufferToHex(hashBuffer);
}

/**
 * Mengenkripsi data (misal: JSON dari brankas) menggunakan Kunci Enkripsi.
 * Menggunakan mode AES-GCM yang aman.
 * @param {ArrayBuffer} kunciEnkripsi - Kunci Emas Ajaib kita.
 * @param {string} dataPolos - Data yang ingin dienkripsi (dalam bentuk string).
 * @returns {Promise<{ciphertext: ArrayBuffer, iv: Uint8Array}>} - Objek berisi data terenkripsi dan IV-nya.
 */
async function enkripsi(kunciEnkripsi, dataPolos) {
  // IV (Initialization Vector) harus unik untuk setiap enkripsi.
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const kunciAES = await window.crypto.subtle.importKey("raw", kunciEnkripsi, "AES-GCM", false, ["encrypt"]);
  
  const dataTerenkripsi = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    kunciAES,
    new TextEncoder().encode(dataPolos)
  );

  return { ciphertext: dataTerenkripsi, iv: iv };
}

/**
 * Mendekripsi data menggunakan Kunci Enkripsi.
 * @param {ArrayBuffer} kunciEnkripsi - Kunci Emas Ajaib kita.
 * @param {{ciphertext: ArrayBuffer, iv: Uint8Array}} dataTerenkripsi - Objek yang berisi data terenkripsi dan IV-nya.
 * @returns {Promise<string|null>} - Data asli dalam bentuk string, atau null jika gagal.
 */
async function dekripsi(kunciEnkripsi, dataTerenkripsi) {
  try {
    const kunciAES = await window.crypto.subtle.importKey("raw", kunciEnkripsi, "AES-GCM", false, ["decrypt"]);
    
    const dataTerdekripsi = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: dataTerenkripsi.iv },
      kunciAES,
      dataTerenkripsi.ciphertext
    );

    return new TextDecoder().decode(dataTerdekripsi);
  } catch (e) {
    // Error ini biasanya berarti kunci salah atau data telah diubah/korup.
    console.error("Gagal melakukan dekripsi!", e);
    return null;
  }
}