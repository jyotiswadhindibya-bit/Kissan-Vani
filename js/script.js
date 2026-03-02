// ==========================================
// 0. MULTILINGUAL DICTIONARY FOR JS
// ==========================================
const statusDict = {
    "en-IN": {
        welcome: (name) => `Welcome ${name}! I am Kisan Vani, your Digital Saathi. How can I help you today?`,
        listening: "Listening... (Sun raha hoon)...",
        imgAttached: "📷 Image attached. Tap Mic to ask!",
        analyzing: "Analyzing Crop Image...",
        consulting: "Consulting AI Expert...",
        tapAgain: "Tap mic to ask again",
        error: "Error connecting to server.",
        clearImg: "Tap the mic to ask a question"
    },
    "hi-IN": {
        welcome: (name) => `नमस्ते ${name}! मैं किसान वाणी हूँ, आपका डिजिटल साथी। आज मैं आपकी कैसे मदद कर सकता हूँ?`,
        listening: "सुन रहा हूँ...",
        imgAttached: "📷 फोटो जुड़ गई है। पूछने के लिए माइक दबाएं!",
        analyzing: "फसल की फोटो जांची जा रही है...",
        consulting: "एआई विशेषज्ञ से सलाह ले रहा हूँ...",
        tapAgain: "दोबारा पूछने के लिए माइक दबाएं",
        error: "सर्वर से जुड़ने में त्रुटि।",
        clearImg: "प्रश्न पूछने के लिए माइक पर टैप करें"
    },
    "or-IN": {
        welcome: (name) => `ନମସ୍କାର ${name}! ମୁଁ କିଷାନ ବାଣୀ, ଆପଣଙ୍କର ଡିଜିଟାଲ୍ ସାଥୀ। ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?`,
        listening: "ଶୁଣୁଛି...",
        imgAttached: "📷 ଫଟୋ ସଂଲଗ୍ନ ହୋଇଛି। ପଚାରିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ!",
        analyzing: "ଫସଲ ଫଟୋ ଯାଞ୍ଚ କରାଯାଉଛି...",
        consulting: "ଏଆଇ ବିଶେଷଜ୍ଞଙ୍କ ସହ ପରାମର୍ଶ କରାଯାଉଛି...",
        tapAgain: "ପୁଣି ପଚାରିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ",
        error: "ସର୍ଭର ସହିତ ସଂଯୋଗ କରିବାରେ ତ୍ରୁଟି।",
        clearImg: "ପ୍ରଶ୍ନ ପଚାରିବାକୁ ମାଇକ୍ ଟ୍ୟାପ୍ କରନ୍ତୁ"
    }
};

function getStatus(key) {
    const lang = localStorage.getItem('kisanGlobalLang') || 'en-IN';
    return statusDict[lang][key];
}

// ==========================================
// 1. WELCOME MESSAGE & LOGOUT
// ==========================================
window.addEventListener('DOMContentLoaded', function() {
    const userName = localStorage.getItem('userName');
    if (userName) {
        setTimeout(() => {
            const welcomeMsg = getStatus('welcome')(userName);
            addMessage(welcomeMsg, 'bot-msg');
        }, 500);
    }
});

function logout() {
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    return true; 
}

// ==========================================
// 2. VOICE, CAMERA & CHAT LOGIC
// ==========================================
const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send-btn'); // Ensure you have this in HTML
const textInput = document.getElementById('text-input'); // Ensure you have this in HTML
const statusText = document.getElementById('status-text');
const chatBox = document.getElementById('chat-box');
const langSelect = document.getElementById('language');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

let selectedImageBase64 = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// --- 1. CORE SUBMISSION LOGIC (The "Brain") ---
// This handles Text, Voice, and Images independently or together
async function handleSubmission() {
    const userText = textInput.value.trim();
    
    // Validation: Need at least text or an image
    if (!userText && !selectedImageBase64) {
        statusText.innerText = "Please provide text or an image.";
        return;
    }

    // UI: Show User Message
    const displayMsg = userText || (selectedImageBase64 ? "Analyzing uploaded image..." : "");
    const userBubble = addMessage(displayMsg, 'user-msg');
    
    // UI: Show Loading State
    const loadingText = selectedImageBase64 ? getStatus('analyzing') : getStatus('consulting');
    statusText.innerText = loadingText;
    const loadingBubble = addMessage("⏳ " + loadingText, 'bot-msg');

    // Clear inputs immediately for better UX
    textInput.value = "";
    const currentImage = selectedImageBase64;
    if (currentImage) clearImage();

    try {
        const response = await fetch('/api/chat', {  
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: userText, 
                language: langSelect.options[langSelect.selectedIndex].text, 
                image: currentImage 
            })
        });

        const data = await response.json();
        
        if (chatBox.contains(loadingBubble)) chatBox.removeChild(loadingBubble);

        // Show AI Response
        addMessage(data.reply, 'bot-msg');
        statusText.innerText = getStatus('tapAgain');
        
        // Handle Voice Synthesis
        let voiceLang = langSelect.value;
        if (voiceLang === 'or-IN') voiceLang = 'hi-IN'; 
        speak(data.spokenReply || data.reply, voiceLang);

    } catch (error) {
        console.error(error);
        if (chatBox.contains(loadingBubble)) chatBox.removeChild(loadingBubble);
        statusText.innerText = getStatus('error');
        addMessage("⚠️ Connection error. Please try again.", 'bot-msg');
    }
}

// --- 2. INPUT HANDLERS ---

// Text Send Button
sendBtn.addEventListener('click', handleSubmission);

// Enter key for Text Input
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmission();
});

// Voice Input
micBtn.addEventListener('click', () => {
    if (micBtn.classList.contains('listening')) {
        recognition.stop();
    } else {
        recognition.lang = langSelect.value;
        try { recognition.start(); } catch (e) {}
        micBtn.classList.add('listening');
        statusText.innerText = getStatus('listening');
    }
});

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    textInput.value = transcript; // Put voice into text box
    handleSubmission(); // Auto-submit after voice
};

// Image/Camera Input
imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImageBase64 = e.target.result.split(',')[1]; 
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
            statusText.innerText = getStatus('imgAttached');
        };
        reader.readAsDataURL(file);
    }
});

// --- 3. UTILITY FUNCTIONS ---

window.clearImage = function() {
    selectedImageBase64 = null;
    imageInput.value = "";
    imagePreviewContainer.classList.add('hidden');
    statusText.innerText = getStatus('clearImg');
};

function addMessage(text, className) {
    const div = document.createElement('div');
    div.classList.add('msg', className);
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight; 
    return div;
}

function speak(text, lang) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0; 
    window.speechSynthesis.speak(utterance);
}

// Ensure mic button resets on end/error
recognition.onend = () => micBtn.classList.remove('listening');
recognition.onerror = () => micBtn.classList.remove('listening');