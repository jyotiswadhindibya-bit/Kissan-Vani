document.addEventListener('DOMContentLoaded', () => {
    // 🟢 Read the global language key shared by all pages
    const savedLang = localStorage.getItem('kisanGlobalLang') || 'en-IN';
    document.getElementById('login-lang').value = savedLang;
    applyLoginTranslations(savedLang);
});

document.getElementById('login-lang').addEventListener('change', (e) => {
    const lang = e.target.value;
    localStorage.setItem('kisanGlobalLang', lang);
    applyLoginTranslations(lang);
});

function applyLoginTranslations(lang) {
    if (typeof translations === 'undefined') return;
    const t = translations[lang];
    if (!t) return;
    
    // Safely update all IDs
    document.getElementById('backLink').innerText = t.backLink;
    document.getElementById('welcomeTitle').innerText = t.welcomeTitle;
    document.getElementById('welcomeSub').innerText = t.welcomeSub;
    document.getElementById('nameLabel').innerText = t.nameLabel;
    document.getElementById('fullName').placeholder = t.namePlaceholder;
    document.getElementById('phoneLabel').innerText = t.phoneLabel;
    document.getElementById('loginBtn').innerText = t.loginBtn;
}

function handleLogin() {
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const currentLang = localStorage.getItem('kisanGlobalLang') || 'en-IN';

    if (!fullName || fullName.trim() === '') {
        alert(translations[currentLang].nameError);
        return;
    }
    
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
        alert(translations[currentLang].phoneError);
        return;
    }
    
    localStorage.setItem('userName', fullName);
    localStorage.setItem('userPhone', phone);
    
    window.location.href = 'index.html';
}

document.getElementById('loginForm').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleLogin();
    }
});