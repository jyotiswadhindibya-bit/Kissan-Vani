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
        clearImg: "Tap the mic to ask a question",
        micDenied: "⚠️ Mic blocked! Please allow access in browser settings.",
        micError: "⚠️ Mic error. Please try again."
    },
    "hi-IN": {
        welcome: (name) => `नमस्ते ${name}! मैं किसान वाणी हूँ, आपका डिजिटल साथी। आज मैं आपकी कैसे मदद कर सकता हूँ?`,
        listening: "सुन रहा हूँ...",
        imgAttached: "📷 फोटो जुड़ गई है। पूछने के लिए माइक दबाएं!",
        analyzing: "फसल की फोटो जांची जा रही है...",
        consulting: "एआई विशेषज्ञ से सलाह ले रहा हूँ...",
        tapAgain: "दोबारा पूछने के लिए माइक दबाएं",
        error: "सर्वर से जुड़ने में त्रुटि।",
        clearImg: "प्रश्न पूछने के लिए माइक पर टैप करें",
        micDenied: "⚠️ माइक ब्लॉक है! कृपया ब्राउज़र सेटिंग में अनुमति दें।",
        micError: "⚠️ माइक में त्रुटि। कृपया पुनः प्रयास करें।"
    },
    "or-IN": {
        welcome: (name) => `ନମସ୍କାର ${name}! ମୁଁ କିଷାନ ବାଣୀ, ଆପଣଙ୍କର ଡିଜିଟାଲ୍ ସାଥୀ। ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?`,
        listening: "ଶୁଣୁଛି...",
        imgAttached: "📷 ଫଟୋ ସଂଲଗ୍ନ ହୋଇଛି। ପଚାରିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ!",
        analyzing: "ଫସଲ ଫଟୋ ଯାଞ୍ଚ କରାଯାଉଛି...",
        consulting: "ଏଆଇ ବିଶେଷଜ୍ଞଙ୍କ ସହ ପରାମର୍ଶ କରାଯାଉଛି...",
        tapAgain: "ପୁଣି ପଚାରିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ",
        error: "ସର୍ଭର ସହିତ ସଂଯୋଗ କରିବାରେ ତ୍ରୁଟି।",
        clearImg: "ପ୍ରଶ୍ନ ପଚାରିବାକୁ ମାଇକ୍ ଟ୍ୟାପ୍ କରନ୍ତୁ",
        micDenied: "⚠️ ମାଇକ୍ ଅବରୋଧ ହୋଇଛି! ଦୟାକରି ବ୍ରାଉଜର୍ ସେଟିଂସରେ ଅନୁମତି ଦିଅନ୍ତୁ।",
        micError: "⚠️ ମାଇକ୍ ତ୍ରୁଟି। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।"
    }
};

function getStatus(key) {
    const lang = localStorage.getItem('kisanGlobalLang') || 'en-IN';
    return statusDict[lang][key];
}

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

const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send-btn'); 
const textInput = document.getElementById('text-input'); 
const statusText = document.getElementById('status-text');
const chatBox = document.getElementById('chat-box');
const langSelect = document.getElementById('language');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

let selectedImageBase64 = null;

// ==========================================
// 🎙️ ROBUST MICROPHONE LOGIC
// ==========================================
let recognition;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; // Stops automatically after you finish a sentence
    
    // Triggered the exact moment the mic successfully turns on
    recognition.onstart = () => {
        micBtn.classList.add('listening');
        statusText.innerText = getStatus('listening');
    };

    // Triggered when you finish speaking
    recognition.onresult = (event) => {
        micBtn.classList.remove('listening');
        const transcript = event.results[0][0].transcript;
        textInput.value = transcript; 
        handleSubmission(); 
    };

    // Triggered if the mic closes due to silence or finishes naturally
    recognition.onend = () => {
        micBtn.classList.remove('listening');
        // Only reset text if it was still showing "Listening..."
        if (statusText.innerText === getStatus('listening')) {
            statusText.innerText = getStatus('tapAgain');
        }
    };

    // 🟢 THE FIX: Smart Error Handling
    recognition.onerror = (event) => {
        micBtn.classList.remove('listening');
        console.warn("Speech Recognition Error:", event.error);
        
        if (event.error === 'not-allowed') {
            statusText.innerText = getStatus('micDenied');
        } else if (event.error === 'no-speech') {
            statusText.innerText = getStatus('tapAgain');
        } else {
            statusText.innerText = getStatus('micError');
        }
    };
} else {
    console.warn("Speech Recognition is not supported in this browser.");
}

// Button Click Event
micBtn.addEventListener('click', () => {
    if (!recognition) {
        alert("Voice input is not supported in your browser. Please use Google Chrome.");
        return;
    }

    if (micBtn.classList.contains('listening')) {
        recognition.stop();
        micBtn.classList.remove('listening');
        statusText.innerText = getStatus('tapAgain');
    } else {
        recognition.lang = langSelect.value;
        try { 
            recognition.start(); 
        } catch (e) {
            console.warn("Mic already starting...");
        }
    }
});

// ==========================================
// 💬 CHAT SUBMISSION LOGIC
// ==========================================
async function handleSubmission() {
    const userText = textInput.value.trim();
    
    if (!userText && !selectedImageBase64) {
        statusText.innerText = getStatus('clearImg');
        return;
    }

    const displayMsg = userText || (selectedImageBase64 ? "Analyzing uploaded image..." : "");
    const userBubble = addMessage(displayMsg, 'user-msg');
    
    const loadingText = selectedImageBase64 ? getStatus('analyzing') : getStatus('consulting');
    statusText.innerText = loadingText;
    const loadingBubble = addMessage("⏳ " + loadingText, 'bot-msg');

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

        if (data.translatedQuery && data.translatedQuery !== "Error") {
            userBubble.innerText = data.translatedQuery;
        }

        addMessage(data.reply, 'bot-msg');
        statusText.innerText = getStatus('tapAgain');
        
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

sendBtn.addEventListener('click', handleSubmission);

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmission();
});

// ==========================================
// 📷 IMAGE LOGIC & UTILITIES
// ==========================================
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