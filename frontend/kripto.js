// kripto.js



// Mengubah ArrayBuffer (hasil dari beberapa operasi kripto) menjadi string Hex
function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Menghasilkan salt acak yang aman.
 * @returns {Uint8Array} - Sebuah salt dengan panjang 16 byte.
 */
function buatSalt() {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Menurunkan kunci dari Master Password menggunakan PBKDF2.
 * @param {string} masterPassword 
 * @param {Uint8Array} salt
 * @returns {Promise<{kunciEnkripsi: ArrayBuffer, kunciVerifikasi: ArrayBuffer}>} 
 */
async function turunkanKunci(masterPassword, salt) {
  const masterKey = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bitTurunan = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 480000, 
      hash: "SHA-256", 
    },
    masterKey,
    512 
  );
  const kunciEnkripsi = bitTurunan.slice(0, 32); 
  const kunciVerifikasi = bitTurunan.slice(32);   

  return { kunciEnkripsi, kunciVerifikasi };
}

/**
 * Menghasilkan hash SHA-256 dari Kunci Verifikasi.
 * @param {ArrayBuffer} kunci 
 * @returns {Promise<string>}
 */
async function hashKunci(kunci) {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", kunci);
  return bufferToHex(hashBuffer);
}

/**
 * Mengenkripsi data (misal: JSON dari brankas) menggunakan Kunci Enkripsi.
 * Menggunakan mode AES-GCM yang aman.
 * @param {ArrayBuffer} kunciEnkripsi
 * @param {string} dataPolos
 * @returns {Promise<{ciphertext: ArrayBuffer, iv: Uint8Array}>}
 */
async function enkripsi(kunciEnkripsi, dataPolos) {
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
 * Mendekripsi data menggunakan Kunci Enkripsi
 * @param {ArrayBuffer} kunciEnkripsi
 * @param {{ciphertext: ArrayBuffer, iv: Uint8Array}} dataTerenkripsi
 * @returns {Promise<string|null>}
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