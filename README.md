# KeamananDigital

![image](https://github.com/user-attachments/assets/d3f3ae16-8104-4971-ba5c-a802c3bdef72)

## Deskripsi Singkat

LockIn adalah sebuah aplikasi web pengelola kata sandi (password manager) yang aman, dirancang untuk dapat diakses dari browser manapun tanpa mengorbankan privasi pengguna. Proyek ini dibangun dengan fokus utama pada **arsitektur Zero-Knowledge**, di mana semua proses enkripsi dan dekripsi data terjadi di sisi klien (browser), sehingga server tidak pernah mengetahui isi data sensitif pengguna.

## Fitur Utama

* **Dashboard Keamanan:** Memberikan ringkasan visual mengenai kekuatan dan keamanan kata sandi yang tersimpan, lengkap dengan grafik dan skor keamanan.
* **Bank Kata Sandi:** Fungsionalitas penuh untuk menambah, melihat, memperbarui, dan menghapus kredensial.
* **Generator Kata Sandi:** Alat bantu untuk membuat kata sandi yang kuat dan unik sesuai kebutuhan.
* **Enkripsi Sisi Klien:** Semua data sensitif dienkripsi di browser pengguna sebelum dikirim ke server menggunakan Web Crypto API.
* **Manajemen Profil:** Pengguna dapat mengubah username, foto profil, serta Master Password mereka.
* **Penghapusan Data Darurat:** Fitur keamanan untuk menghapus total data brankas dari server jika diperlukan.

## Arsitektur Keamanan: Zero-Knowledge

Keamanan LockIn tidak bergantung pada kepercayaan kepada server, melainkan pada implementasi kriptografi di sisi klien yang kuat.

1.  **Penurunan Kunci:** Master Password pengguna tidak pernah dikirim ke server. Password tersebut, dikombinasikan dengan `salt` unik, digunakan untuk menghasilkan `kunciEnkripsi` dan `kunciVerifikasi` di browser melalui fungsi `turunkanKunci()` di `kripto.js`.
2.  **Verifikasi Tanpa Password:** Hanya `kunciVerifikasi` yang digunakan untuk proses otentikasi dengan server.
3.  **Enkripsi & Dekripsi Lokal:** `kunciEnkripsi` hanya ada di memori browser selama sesi aktif dan digunakan untuk mengenkripsi/mendekripsi seluruh data brankas menggunakan algoritma AES-256-GCM.
4.  **Data di Server:** Server (dalam hal ini, Firebase) hanya menyimpan "gumpalan" data yang sudah terenkripsi. Artinya, bahkan jika server berhasil diretas, data pengguna tetap aman dan tidak bisa dibaca.

## Tumpukan Teknologi (Tech Stack)

* **Front-End:**
    * HTML5, CSS3, JavaScript (Vanilla JS)
    * **Web Crypto API:** Untuk semua operasi kriptografi.
    * **Fetch API:** Untuk komunikasi dengan backend.
* **Back-End & Cloud:**
    * **Firebase:** Digunakan sebagai backend utama.
        * **Firestore:** Sebagai database untuk menyimpan data akun (email, salt, verificationKey) dan brankas terenkripsi.
        * **Firebase Storage:** Untuk menyimpan file yang diunggah seperti foto profil.

## Cara Menjalankan Proyek

1.  **Prasyarat:**
    * Sebuah web server sederhana untuk menyajikan file statis (misalnya: `live-server` dari ekstensi VS Code).
    * Konfigurasi proyek Firebase di backend.

2.  **Konfigurasi Frontend:**
    * Pastikan file `config.js` menunjuk ke URL API backend Anda yang benar.

3.  **Menjalankan:**
    * Sajikan direktori `frontend` menggunakan web server.
    * Buka browser dan akses alamat yang diberikan oleh web server (misalnya: `http://127.0.0.1:5500`).

---
*Proyek ini dibuat sebagai bagian dari Tugas Akhir Mata Kuliah Keamanan Digital.*
