// File: frontend/profile.js

if (typeof bufferToBase64 === 'undefined') {
    function bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('profile-form')) return;

    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
        window.location.href = 'auth.html';
        return;
    }

    const profilePreview = document.getElementById('profile-preview');
    const profileUploadInput = document.getElementById('profile-upload');
    const profileForm = document.getElementById('profile-form');
    const saveChangesBtn = document.getElementById('save-profile-btn');

    function populateInitialProfileData() {
        const userName = sessionStorage.getItem('userName') || 'User';
        const photoUrl = sessionStorage.getItem('profilePhotoUrl');
        const joinDateISO = sessionStorage.getItem('userJoinDate');

        document.getElementById('profile-name').textContent = userName;
        document.getElementById('profile-email').textContent = userEmail;
        document.getElementById('username').value = userName;
        document.getElementById('email').value = userEmail;

        if (photoUrl && photoUrl !== 'null' && photoUrl !== 'undefined') {
            profilePreview.src = photoUrl;
        } else {
            profilePreview.src = 'default-avatar.png';
        }

        const joinDateElement = document.getElementById('profile-join-date');
        if (joinDateElement && joinDateISO) {
            const joinDate = new Date(joinDateISO);
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            joinDateElement.textContent = `Joined since ${joinDate.toLocaleDateString('en-US', options)}`;
        }
    }

    async function handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => { profilePreview.src = e.target.result; };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('email', userEmail);
        formData.append('profilePhoto', file);

        try {
            window.utils.tampilkanNotifikasi("Uploading photo...", 'success');
            
            const response = await fetch(`${window.config.API_URL}/profile/upload-photo`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            sessionStorage.setItem('profilePhotoUrl', result.profilePhotoUrl);
            const sidebarAvatar = document.getElementById('sidebar-avatar');
            if (sidebarAvatar) {
                sidebarAvatar.style.backgroundImage = `url(${result.profilePhotoUrl})`;
            }
            window.utils.tampilkanNotifikasi("Profile photo updated successfully!");
        } catch (error) {
            window.utils.tampilkanNotifikasi(`Upload failed: ${error.message}`, 'error');
            profilePreview.src = sessionStorage.getItem('profilePhotoUrl') || 'default-avatar.png';
        }
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        saveChangesBtn.textContent = 'Menyimpan...';
        saveChangesBtn.disabled = true;

        const newUsername = document.getElementById('username').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword && newPassword !== confirmPassword) {
            window.utils.tampilkanNotifikasi("Password baru dan konfirmasi tidak cocok!", 'error');
            saveChangesBtn.textContent = 'Simpan Perubahan';
            saveChangesBtn.disabled = false;
            return;
        }

        const payload = { email: userEmail };
        const usernameBerubah = newUsername !== sessionStorage.getItem('userName');
        if (usernameBerubah) {
            payload.newUsername = newUsername;
        }

        if (newPassword) {
            const saltString = sessionStorage.getItem('userSalt');
            if (!saltString) {
                window.utils.tampilkanNotifikasi("Sesi tidak valid. Silakan login ulang.", 'error');
                return;
            }
            const salt = new Uint8Array(JSON.parse(saltString));
            const { kunciVerifikasi } = await turunkanKunci(newPassword, salt);
            payload.newVerificationKey = bufferToBase64(kunciVerifikasi);
        }

        if (!usernameBerubah && !newPassword) {
            window.utils.tampilkanNotifikasi("Tidak ada perubahan untuk disimpan.", 'sukses');
            saveChangesBtn.textContent = 'Simpan Perubahan';
            saveChangesBtn.disabled = false;
            return;
        }

        try {
            const response = await fetch(`${window.config.API_URL}/profile/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message);

            window.utils.tampilkanNotifikasi("Profil berhasil diperbarui!");

            // ==========================================================
            // PERBAIKAN UTAMA DI SINI:
            // 1. Update sessionStorage dengan nama baru jika ada perubahan
            if (usernameBerubah) {
                sessionStorage.setItem('userName', newUsername);
            }
            
            // 2. Jika password diubah, arahkan ke login. Jika tidak, cukup refresh halaman.
            if (newPassword) {
                alert("Master Password Anda telah diubah. Anda akan diarahkan untuk login kembali.");
                sessionStorage.clear();
                window.location.href = 'auth.html';
            } else {
                // 3. REFRESH HALAMAN agar main-layout.js bisa membaca data baru dan memperbarui UI
                setTimeout(() => window.location.reload(), 1500);
            }
            // ==========================================================

        } catch (error) {
            window.utils.tampilkanNotifikasi(`Gagal menyimpan: ${error.message}`, 'error');
        } finally {
            // Hanya aktifkan kembali tombol jika password tidak diubah
            if (!newPassword) {
                saveChangesBtn.textContent = 'Simpan Perubahan';
                saveChangesBtn.disabled = false;
            }
        }
    }

    if (profileForm) profileForm.addEventListener('submit', handleProfileUpdate);
    if (profileUploadInput) profileUploadInput.addEventListener('change', handlePhotoUpload);

    populateInitialProfileData();
});
