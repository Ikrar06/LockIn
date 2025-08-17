/**
 * Mengubah ArrayBuffer atau Uint8Array menjadi string Base64.
 * Aman untuk semua browser modern.
 */
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Mengubah string Base64 kembali menjadi ArrayBuffer.
 * Ini adalah fungsi kunci untuk memperbaiki error Anda.
 */
function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Menghasilkan salt acak yang aman.
 * @returns {Uint8Array}
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
    const masterKey = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(masterPassword), { name: "PBKDF2" }, false, ["deriveBits"]);
    const derivedBits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 480000, hash: "SHA-256" }, masterKey, 512);
    const kunciEnkripsi = derivedBits.slice(0, 32);
    const kunciVerifikasi = derivedBits.slice(32);
    return { kunciEnkripsi, kunciVerifikasi };
}

/**
 * Mengenkripsi data dan mengembalikan hasilnya sebagai objek berisi string Base64.
 * @param {ArrayBuffer} kunciEnkripsi
 * @param {string} dataPolos
 * @returns {Promise<{ct: string, iv: string}>}
 */
async function enkripsi(kunciEnkripsi, dataPolos) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const kunciAES = await window.crypto.subtle.importKey("raw", kunciEnkripsi, "AES-GCM", false, ["encrypt"]);
    const dataTerenkripsiBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, kunciAES, new TextEncoder().encode(dataPolos));
    return {
        ct: bufferToBase64(dataTerenkripsiBuffer), // ct = ciphertext
        iv: bufferToBase64(iv)
    };
}

/**
 * Mendekripsi data dari paket berisi string Base64.
 * @param {ArrayBuffer} kunciEnkripsi
 * @param {{ct: string, iv: string}} paketData
 * @returns {Promise<string|null>}
 */
async function dekripsi(kunciEnkripsi, paketData) {
    try {
        // UBAH KEMBALI DARI BASE64 KE BINER SEBELUM PROSES DEKRIPSI
        const ivBuffer = base64ToArrayBuffer(paketData.iv);
        const ciphertextBuffer = base64ToArrayBuffer(paketData.ct);
        
        const kunciAES = await window.crypto.subtle.importKey("raw", kunciEnkripsi, "AES-GCM", false, ["decrypt"]);
        
        // Sekarang, kedua argumen adalah tipe data biner yang benar (ArrayBuffer)
        const dataTerdekripsi = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBuffer }, 
            kunciAES, 
            ciphertextBuffer
        );

        return new TextDecoder().decode(dataTerdekripsi);
    } catch (e) {
        console.error("Gagal melakukan dekripsi!", e);
        return null;
    }
}