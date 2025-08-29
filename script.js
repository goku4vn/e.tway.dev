// Handle redirect from 404.html on GitHub Pages
(function() {
    try {
        const saved = sessionStorage.getItem('redirectPath');
        console.log('Redirect check - saved path:', saved);
        if (saved) {
            sessionStorage.removeItem('redirectPath');
            history.replaceState({}, '', saved);
            console.log('Redirect applied - new URL:', window.location.href);
            console.log('Redirect applied - pathname:', window.location.pathname);
        }
    } catch (error) {
        console.log('Redirect error:', error);
    }
})();

// Config có thể ghi đè từ ngoài bằng window.APP_CONFIG
// Mặc định sử dụng R2 public bucket đã cung cấp
const APP_CONFIG = Object.assign({ r2BaseUrl: 'https://pub-86b487dc9c754d3e8b6516019b4359ad.r2.dev' }, window.APP_CONFIG || {});

// Helpers
function getWordFromUrl() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    console.log('getWordFromUrl - pathname:', window.location.pathname, 'extracted path:', path);
    if (path) {
        const decoded = decodeURIComponent(path);
        console.log('getWordFromUrl - decoded path:', decoded);
        // Normalize to lowercase for consistency with filenames
        const normalized = decoded.toLowerCase().trim();
        console.log('getWordFromUrl - normalized path:', normalized);
        return normalized;
    }
    const hash = window.location.hash.slice(1);
    if (hash) {
        console.log('getWordFromUrl - hash:', hash);
        // Normalize hash to lowercase as well
        const normalizedHash = hash.toLowerCase().trim();
        console.log('getWordFromUrl - normalized hash:', normalizedHash);
        return normalizedHash;
    }
    console.log('getWordFromUrl - no path or hash found');
    return '';
}

function isMd5(id) {
    return /^[a-f0-9]{32}$/i.test(id);
}

// Load word data (chỉ dùng R2 nếu id là md5; nếu không có dữ liệu → hiện lỗi)
async function loadWordData(wordId) {
    console.log("Loading word data for wordId:", wordId);
    
    if (!wordId || typeof wordId !== 'string' || wordId.trim() === '') {
        console.log('No valid wordId provided, showing home');
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const content = document.getElementById('content');
        const home = document.getElementById('home');
        
        // Show home intro
        home.classList.remove('hidden');
        loading.classList.add('hidden');
        error.classList.add('hidden');
        content.classList.add('hidden');
        return;
    }
    
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');
    const home = document.getElementById('home');
    
    if (!loading || !error || !content || !home) {
        console.error('Required DOM elements not found:', { loading, error, content, home });
        return;
    }
    
    home.classList.add('hidden');
    // Show loading
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    content.classList.add('hidden');

    try {
        window.currentRequestedWordId = wordId;
        let data = null;

        // Ưu tiên fetch từ nguồn JSON (R2 hoặc local ./words)
        console.log('Calling fetchFromR2 with wordId:', wordId);
        data = await fetchFromR2(wordId);
        console.log('fetchFromR2 returned:', data);

        if (data) {
            console.log('Word data loaded successfully:', data);
            displayWordData(data);
            loading.classList.add('hidden');
            content.classList.remove('hidden');
            error.classList.add('hidden');
            console.log("Displayed successfully");
        } else {
            console.log('No data returned from fetchFromR2');
            throw new Error('NOT_FOUND');
        }
    } catch (e) {
        console.log('Error in loadWordData:', e);
        if (loading && error && content) {
            loading.classList.add('hidden');
            content.classList.add('hidden');
            error.classList.remove('hidden');
        } else {
            console.error('Cannot update UI elements due to missing DOM elements');
        }
    }
}

async function fetchFromR2(id) {
    console.log('fetchFromR2 called with id:', id);
    
    if (!id || typeof id !== 'string') {
        console.error('Invalid id provided to fetchFromR2:', id);
        return null;
    }
    
    // Normalize the id to lowercase for consistency
    const normalizedId = id.toLowerCase().trim();
    console.log('Normalized id:', normalizedId);
    
    try {
        const base = APP_CONFIG.r2BaseUrl.replace(/\/$/, '');
        console.log('R2 base URL:', base);
        
        // First try to fetch from local words directory
        const localUrl = `./words/${normalizedId}.json`;
        console.log('Trying local URL:', localUrl);
        try {
            const res = await fetch(localUrl, { cache: 'no-cache' });
            console.log('Local fetch response:', res.status, res.statusText);
            if (res.ok) {
                const json = await res.json();
                console.log('Loaded from local:', json);
                return normalizeR2Word(json);
            } else {
                console.log('Local fetch failed with status:', res.status);
            }
        } catch (localError) {
            console.log('Local fetch error:', localError);
            // Continue to R2 fetch
        }
        
        // If local fetch fails, try R2 bucket
        const urls = [
            `${base}/words/${normalizedId}.json`
            // `${base}/${normalizedId}.json`
        ];
        for (const url of urls) {
            console.log('Trying R2 URL:', url);
            const res = await fetch(url, { cache: 'no-cache' });
            console.log('R2 response:', res.status, res.statusText);
            if (res.ok) {
                const json = await res.json();
                console.log('Loaded from R2:', json);
                var data = normalizeR2Word(json);
                console.log('Normalized data:', data);
                return data;
            } else {
                console.log('R2 fetch failed with status:', res.status);
            }
        }
        console.log('All fetch attempts failed');
        return null;
    } catch (error) {
        console.log('Fetch error:', error);
        return null;
    }
}

function normalizeR2Word(json) {
    console.log('Normalizing word data:', json);
    const normalized = {
        word: json.word || '',
        vietnamese: json.vietnamese || '',
        ipa: json.ipa || '',
        examples: Array.isArray(json.examples) ? json.examples : [],
        related: Array.isArray(json.related) ? json.related : [],
        audioUrl: json.audioUrl || null,
        image: json.image || null,
        explanations: Array.isArray(json.explanations) ? json.explanations : []
    };
    console.log('Normalized result:', normalized);
    return normalized;
}

// Display word data
function displayWordData(data) {
    console.log('Displaying word data:', data);
    
    const englishWordEl = document.getElementById('englishWord');
    const ipaEl = document.getElementById('ipa');
    
    if (!englishWordEl || !ipaEl) {
        console.error('Required DOM elements not found:', { englishWordEl, ipaEl });
        return;
    }
    
    englishWordEl.textContent = data.word;
    ipaEl.textContent = data.ipa;

    // Update QR image source
    const qrImage = document.getElementById('qrImage');
    if (qrImage) {
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://e.tway.dev/${encodeURIComponent(data.word.toLowerCase())}`;
    } else {
        console.error('QR image element not found');
    }

    // Display explanations dynamically
    const explanationsContainer = document.getElementById('explanations');
    if (explanationsContainer) {
        if (data.explanations && data.explanations.length > 0) {
            explanationsContainer.innerHTML = 
            data.explanations.map((exp, index) => `
                <div class="explanation-item">
                    <h4>Tiếng Việt</h4>
                    <p>${exp.vi}</p>
                </div>
                <div class="explanation-item">
                    <h4>English</h4>
                    <p>${exp.en}</p>
                </div>
            `).join('');
        } else {
            console.error('No explanations found');
        }
    } else {
        console.error('Explanations container not found');
    }

    // Display examples with audio buttons
    const examplesContainer = document.getElementById('examples');
    if (examplesContainer) {
        examplesContainer.innerHTML = data.examples.map((ex, index) => `
            <div class="example-item">
                <strong>${ex.en}</strong><br>
                ${ex.vi}
                <div class="example-audio">
                    <button class="example-play-btn" type="button" aria-label="Phát âm câu ví dụ ${index + 1}" title="Phát âm câu ví dụ ${index + 1}" onclick="playExampleAudio('${ex.en}', ${index})">
                        <div class="example-play-icon"></div>
                    </button>
                    <span style="font-size: 12px; color: #ff9800;">Phát âm câu</span>
                </div>
            </div>
        `).join('');
    } else {
        console.error('Examples container not found');
    }

    // Display related words
    const relatedContainer = document.getElementById('relatedWords');
    if (relatedContainer) {
        relatedContainer.innerHTML = data.related.map(word => `
            <span class="tag" onclick="navigateToWord('${word}')">${word}</span>
        `).join('');
    } else {
        console.error('Related words container not found');
    }
}

// Show current QR code
function showCurrentQR() {
    const currentUrl = window.location.origin + window.location.pathname;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentUrl)}`;
    
    // Tạo popup hiển thị QR code lớn
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        cursor: pointer;
    `;
    
    popup.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 12px; text-align: center;">
            <h3 style="margin: 0 0 15px 0; color: #333;">QR Code cho từ vựng</h3>
            <img src="${qrUrl}" alt="QR Code" style="max-width: 300px; height: auto;">
            <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">Click để đóng</p>
        </div>
    `;
    
    popup.onclick = () => document.body.removeChild(popup);
    document.body.appendChild(popup);
}

// Print vocabulary function
function printVocabulary() {
    const printWindow = window.open('', '_blank');
    const currentData = getCurrentVocabularyData();
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Vocabulary - ${currentData.word}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .vocab-card { 
                    border: 2px solid #333; 
                    border-radius: 10px; 
                    padding: 20px; 
                    max-width: 400px; 
                    margin: 0 auto;
                }
                .header { text-align: center; margin-bottom: 20px; }
                .word { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
                .ipa { font-size: 20px; color: #666; font-style: italic; }
                .section { margin: 15px 0; }
                .section h3 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                .example { margin: 8px 0; padding: 8px; background: #f9f9f9; border-radius: 5px; }
                .related { display: flex; flex-wrap: wrap; gap: 8px; }
                .tag { background: #e9ecef; padding: 4px 8px; border-radius: 15px; font-size: 12px; }
                @media print { body { margin: 0; } .vocab-card { border: none; } }
            </style>
        </head>
        <body>
            <div class="vocab-card">
                <div class="header">
                    <div class="word">${currentData.word}</div>
                    <div class="ipa">${currentData.ipa}</div>
                </div>
                <div class="section">
                    <h3>Giải thích</h3>
                    <p><strong>Tiếng Việt:</strong> ${currentData.vietnamese}</p>
                    <p><strong>English:</strong> ${currentData.english}</p>
                </div>
                <div class="section">
                    <h3>Ví dụ</h3>
                    ${currentData.examples.map(ex => `
                        <div class="example">
                            <strong>${ex.en}</strong><br>
                            ${ex.vi}
                        </div>
                    `).join('')}
                </div>
                <div class="section">
                    <h3>Từ liên quan</h3>
                    <div class="related">
                        ${currentData.related.map(word => `<span class="tag">${word}</span>`).join('')}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
}

// Export to PDF function
function exportToPDF() {
    alert('📄 Tính năng xuất PDF sẽ được triển khai sau!\n\nHiện tại bạn có thể dùng nút "In từ vựng" để in trang.');
}

// Export to Image function
function exportToImage() {
    alert('🖼️ Tính năng xuất ảnh sẽ được triển khai sau!\n\nHiện tại bạn có thể dùng nút "In từ vựng" để in trang.');
}

// Get current vocabulary data
function getCurrentVocabularyData() {
    const explanationsContainer = document.getElementById('explanations');
    const explanationItems = explanationsContainer.querySelectorAll('.explanation-item');
    
    return {
        word: document.getElementById('englishWord').textContent,
        ipa: document.getElementById('ipa').textContent,
        vietnamese: explanationItems[0] ? explanationItems[0].querySelector('p').textContent : '',
        english: explanationItems[1] ? explanationItems[1].querySelector('p').textContent : '',
        examples: Array.from(document.querySelectorAll('.example-item')).map(item => ({
            en: item.querySelector('strong').textContent,
            vi: item.textContent.replace(item.querySelector('strong').textContent, '').trim()
        })),
        related: Array.from(document.querySelectorAll('.tag')).map(tag => tag.textContent)
    };
}

// Play sound function
async function playSound(event) {
    const word = document.getElementById('englishWord').textContent;
    const audioUrl = window.currentWordAudioUrl;
    
    try {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            await audio.play();
        } else if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        }
    } catch (_) {}

    // Visual feedback
    const button = event.currentTarget;
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 200);
}

// Play example audio function
async function playExampleAudio(text, index) {
    try {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
    } catch (_) {}

    // Visual feedback for example play button
    const button = event.currentTarget;
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 200);
}

function navigateToWord(word) {
    const wordLower = String(word).toLowerCase();
    const path = '/' + encodeURIComponent(wordLower);
    history.pushState({}, '', path);
    loadWordData(wordLower);
}

// Request new word
function requestNewWord() {
    alert('🚀 Tính năng này sẽ mở Telegram bot để yêu cầu từ mới!\n\nTelegram: @YourVocabBot\nGõ: /new [từ cần tạo]');
}

// Request new word with default word from URL
function requestNewWordWithDefault() {
    const wordId = getWordFromUrl();
    if (wordId) {
        alert(`🚀 Yêu cầu tạo từ mới: "${wordId}"\n\nTelegram: @YourVocabBot\nGõ: /new ${wordId}`);
    } else {
        requestNewWord();
    }
}

// QR Scan implementation
let qrStream = null;
let qrScanning = false;
let qrDetector = null;
let qrScanRafId = null;

async function openQrScanner() {
    let overlay = document.getElementById('qrOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'qrOverlay';
        overlay.className = 'overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Quét mã QR');
        overlay.innerHTML = `
          <div class="scanner">
            <video id="qrVideo" class="qr-video" autoplay playsinline muted></video>
            <canvas id="qrCanvas" class="hidden"></canvas>
            <p class="scanner-help">Đưa mã QR e.tway.dev vào khung để quét</p>
            <div class="scanner-actions">
              <button class="create-new-btn" type="button" aria-label="Dừng quét" onclick="stopQrScan()">Dừng</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
    }
    const video = document.getElementById('qrVideo');
    overlay.classList.add('show');
    try {
        qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        video.srcObject = qrStream;
        await video.play();
        if (video.readyState < 2) {
            await new Promise(r => video.addEventListener('loadedmetadata', r, { once: true }));
        }
        qrScanning = true;
        if ('BarcodeDetector' in window) {
            try { qrDetector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (_) { qrDetector = null; }
        }
        scanFrame();
    } catch (err) {
        alert('Không thể truy cập camera. Vui lòng cấp quyền camera.');
        stopQrScan();
    }
}

async function ensureJsQR() {
    if (window.jsQR) return true;
    return new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}

async function scanFrame() {
    const overlay = document.getElementById('qrOverlay');
    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');

    if (!qrScanning || overlay.classList.contains('hidden')) return;

    try {
        let value = null;
        if (qrDetector) {
            const codes = await qrDetector.detect(video);
            if (codes && codes.length > 0) {
                value = (codes[0].rawValue || codes[0].rawValueText || '').toString();
            }
        } else {
            const ok = await ensureJsQR();
            if (!ok) return;
            if (video.videoWidth && video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = window.jsQR(imageData.data, canvas.width, canvas.height);
                if (code && code.data) value = code.data.toString();
            }
        }
        if (value && handleQrResult(value)) {
            return; // handled and stopped
        }
    } catch (_) {}

    qrScanRafId = requestAnimationFrame(scanFrame);
}

function handleQrResult(text) {
    // Accept only links to e.tway.dev
    try {
        // Normalize
        let path = '';
        const m = text.match(/^(?:https?:\/\/)?e\.tway\.dev\/?(.*)$/i);
        if (m && typeof m[1] === 'string') {
            path = '/' + m[1].replace(/^\/+/, '');
        } else if (/^[a-f0-9]{32}$/i.test(text)) {
            // Allow bare md5
            path = '/' + text;
        } else {
            alert('Mã QR không thuộc e.tway.dev');
            return false;
        }
        stopQrScan();
        history.pushState({}, '', path);
        const id = getWordFromUrl();
        loadWordData(id);
        return true;
    } catch (_) {
        return false;
    }
}

function stopQrScan() {
    qrScanning = false;
    const overlay = document.getElementById('qrOverlay');
    if (overlay) overlay.classList.remove('show');
    const video = document.getElementById('qrVideo');
    if (qrScanRafId) {
        cancelAnimationFrame(qrScanRafId);
        qrScanRafId = null;
    }
    if (qrStream) {
        qrStream.getTracks().forEach(t => t.stop());
        qrStream = null;
    }
    if (video) {
        video.pause();
        video.srcObject = null;
    }
}

// Track current audio for play button
const originalDisplayWordData = displayWordData;
displayWordData = function(data) {
    window.currentWordAudioUrl = data.audioUrl || null;
    originalDisplayWordData(data);
};

// Export functions to global scope for HTML onclick
window.playSound = playSound;
window.playExampleAudio = playExampleAudio;
window.navigateToWord = navigateToWord;
window.showCurrentQR = showCurrentQR;
window.printVocabulary = printVocabulary;
window.exportToPDF = exportToPDF;
window.exportToImage = exportToImage;
window.requestNewWord = requestNewWord;
window.requestNewWordWithDefault = requestNewWordWithDefault;
window.openQrScanner = openQrScanner;
window.stopQrScan = stopQrScan;

// Initialize on load
window.addEventListener('load', () => {
    console.log('Window load event fired');
    const wordId = getWordFromUrl();
    console.log('Initial wordId from load event:', wordId);
    loadWordData(wordId);
});

// Handle hash changes
window.addEventListener('hashchange', () => {
    console.log('Hash change event fired');
    const wordId = getWordFromUrl();
    console.log('WordId from hash change:', wordId);
    loadWordData(wordId);
});

// Handle back/forward
window.addEventListener('popstate', () => {
    console.log('Popstate event fired');
    const wordId = getWordFromUrl();
    console.log('WordId from popstate:', wordId);
    loadWordData(wordId);
});

// Add some fun interactions
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    // Make stars twinkle on click
    document.querySelectorAll('.star').forEach(star => {
        star.style.cursor = 'pointer';
        star.addEventListener('click', () => {
            star.style.animation = 'none';
            setTimeout(() => {
                star.style.animation = '';
            }, 10);
        });
    });
});
