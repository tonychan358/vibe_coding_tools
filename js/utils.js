/**
 * Utility functions for IdeaApp
 */

export function showLoading(text = "處理中...") {
    document.getElementById('loading-text').innerText = text;
    document.getElementById('loading-overlay').style.display = 'flex';
}

export function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

export function showToast(msg, bgClass = "bg-gray-800") {
    const toast = document.getElementById('toast-msg');
    toast.textContent = msg;
    toast.className = `absolute top-20 left-1/2 transform -translate-x-1/2 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm z-[110] transition-opacity whitespace-nowrap ${bgClass}`;
    toast.style.display = 'block';
    setTimeout(() => toast.classList.remove('opacity-0'), 10);

    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.style.display = 'none', 300);
    }, 3000);
}

export function getDirectImageUrl(driveUrl) {
    if (!driveUrl) return '';

    // If it's already a direct link or base64, return it
    if (driveUrl.startsWith('data:') || driveUrl.includes('googleusercontent.com') || driveUrl.includes('drive.google.com/thumbnail')) {
        return driveUrl;
    }

    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /file\/d\/([a-zA-Z0-9_-]+)/,
        /^([a-zA-Z0-9_-]+)$/ // Pure ID
    ];

    for (let pattern of patterns) {
        const match = driveUrl.match(pattern);
        if (match && match[1]) {
            const fileId = match[1];
            // Method 1: lh3 (Modern & Reliable for PWA)
            // return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;

            // Method 2: Thumbnail API (Very reliable, allows resizing)
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        }
    }
    return driveUrl;
}

export function escapeHTML(str) {
    return (str || '').toString().replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

export async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1080;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
        };
    });
}
