const container = document.getElementById('container');
const switchToLogin = document.getElementById('switchToLogin');
const switchToSignup = document.getElementById('switchToSignup');

switchToLogin.addEventListener('click', () => {
    container.classList.remove('mode-signup');
    container.classList.add('mode-login');
});

switchToSignup.addEventListener('click', () => {
    container.classList.remove('mode-login');
    container.classList.add('mode-signup');
});