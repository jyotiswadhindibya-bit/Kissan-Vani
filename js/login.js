// 1. Initialize Page Language on Load
document.addEventListener('DOMContentLoaded', () => {
    // Get the language saved from the Dashboard, default to English
    const savedLang = localStorage.getItem('userLanguage') || 'en-IN';
    
    // Apply translations to the Login Page
    applyLoginTranslations(savedLang);
});

// 2. Translation Logic for Login Elements
function applyLoginTranslations(lang) {
    // Ensure translations object from translations.js is available
    if (typeof translations === 'undefined') return;

    const elements = document.querySelectorAll('[data-key]');
    elements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[lang] && translations[lang][key]) {
            // If it's an input field, update the placeholder
            if (el.tagName === 'INPUT') {
                el.placeholder = translations[lang][key];
            } else {
                el.innerText = translations[lang][key];
            }
        }
    });
}

// 3. Updated Login Functionality
function handleLogin() {
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const currentLang = localStorage.getItem('userLanguage') || 'en-IN';

    // Validate full name
    if (!fullName || fullName.trim() === '') {
        alert(getAlertMessage('nameError', currentLang));
        return;
    }
    
    // Validate phone number
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
        alert(getAlertMessage('phoneError', currentLang));
        return;
    }
    
    // Store user data
    localStorage.setItem('userName', fullName);
    localStorage.setItem('userPhone', phone);
    
    // Redirect back to dashboard (index.html or dashboard.html)
    window.location.href = 'index.html'; 
}

// Helper for translated alerts
function getAlertMessage(type, lang) {
    const alerts = {
        'en-IN': { nameError: 'Please enter your name', phoneError: 'Invalid 10-digit phone' },
        'hi-IN': { nameError: 'कृपया अपना नाम दर्ज करें', phoneError: 'अवैध 10-अंकीय फोन' },
        'or-IN': { nameError: 'ଦୟାକରି ଆପଣଙ୍କର ନାମ ପ୍ରବେଶ କରନ୍ତୁ', phoneError: 'ଅବୈଧ 10-ଅଙ୍କ ବିଶିଷ୍ଟ ଫୋନ୍' }
    };
    return alerts[lang][type];
}

// Event Listeners
document.getElementById('loginForm').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleLogin();
    }
});