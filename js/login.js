// Login page functionality

function handleLogin() {
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    
    // Validate full name
    if (!fullName || fullName.trim() === '') {
        alert('Please enter your full name');
        return;
    }
    
    // Validate phone number
    if (!phone || phone.length !== 10) {
        alert('Please enter a valid 10-digit phone number');
        return;
    }
    
    // Check if phone contains only numbers
    if (!/^\d+$/.test(phone)) {
        alert('Phone number should contain only digits');
        return;
    }
    
    // Store user data in localStorage
    localStorage.setItem('userName', fullName);
    localStorage.setItem('userPhone', phone);
    
    console.log('Login successful! Redirecting to main page...');
    
    // Redirect to main app page
    window.location.href = 'index.html';
}

// Allow Enter key to submit
document.getElementById('loginForm').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleLogin();
    }
});