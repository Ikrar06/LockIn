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
        saveChangesBtn.textContent = 'Saving...';
        saveChangesBtn.disabled = true;

        const newUsername = document.getElementById('username').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword && newPassword !== confirmPassword) {
            window.utils.tampilkanNotifikasi("New password and confirmation do not match!", 'error');
            saveChangesBtn.textContent = 'Save Changes';
            saveChangesBtn.disabled = false;
            return;
        }

        const payload = { email: userEmail };
        const usernameChanged = newUsername !== sessionStorage.getItem('userName');
        if (usernameChanged) payload.newUsername = newUsername;

        if (newPassword) {
            const saltString = sessionStorage.getItem('userSalt');
            if (!saltString) {
                window.utils.tampilkanNotifikasi("Invalid session. Please log in again.", 'error');
                return;
            }
            const salt = new Uint8Array(JSON.parse(saltString));
            const { kunciVerifikasi } = await turunkanKunci(newPassword, salt);
            payload.newVerificationKey = bufferToBase64(kunciVerifikasi);
        }

        if (!usernameChanged && !newPassword) {
            window.utils.tampilkanNotifikasi("No changes to save.", 'success');
            saveChangesBtn.textContent = 'Save Changes';
            saveChangesBtn.disabled = false;
            return;
        }
    
        try {
            const response = await fetch(`${window.config.API_URL}/profile/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            window.utils.tampilkanNotifikasi("Profile updated successfully!");

            if (usernameChanged) {
                sessionStorage.setItem('userName', newUsername);
            }

            if (newPassword) {
                alert("Your Master Password has been updated. You will be redirected to log in again.");
                sessionStorage.clear();
                window.location.href = 'auth.html';
            } else {
                setTimeout(() => window.location.reload(), 1500);
            }

        } catch (error) {
            window.utils.tampilkanNotifikasi(`Failed to save: ${error.message}`, 'error');
        } finally {
            if (!newPassword) {
                saveChangesBtn.textContent = 'Save Changes';
                saveChangesBtn.disabled = false;
            }
        }
    }

    if (profileForm) profileForm.addEventListener('submit', handleProfileUpdate);
    if (profileUploadInput) profileUploadInput.addEventListener('change', handlePhotoUpload);

    populateInitialProfileData();
});
