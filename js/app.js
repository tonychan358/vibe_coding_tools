/**
 * Main application logic for IdeaApp
 */
import * as api from './api.js';
import * as ui from './ui.js';
import * as utils from './utils.js';

let allIdeas = [];
let allCategories = [];
let uploadedImagesBase64 = [];
let currentFilter = 'all';

const GAS_URL = window.GAS_URL; // From index.html

export async function init() {
    setupPWA();

    // Initial UI state
    document.getElementById('api-key-input').value = localStorage.getItem('geminiApiKey') || '';

    // Dark mode init
    if (localStorage.getItem('darkMode') === 'true' ||
        (!localStorage.hasOwnProperty('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    if (!GAS_URL || GAS_URL === "YOUR_GAS_WEB_APP_URL") {
        utils.showToast("⚠️ 請先在 HTML 中填寫您的 GAS URL！", "bg-red-500");
    }

    await loadData(true);

    // Event Listeners
    document.getElementById('search-input').addEventListener('input', (e) => {
        searchIdeas(e.target.value.toLowerCase());
    });

    document.getElementById('image-upload').addEventListener('change', handleImageUpload);

    // Globalize functions needed by HTML onclick
    window.switchView = ui.switchView;
    window.filterLibrary = (cat) => {
        currentFilter = cat;
        updateCategoriesUI();
        const filtered = cat === 'all' ? allIdeas : allIdeas.filter(i => i['分類'] === cat);
        ui.renderCards(filtered, 'library-container', '', openViewModal);
    };
    window.fetchData = () => loadData(false);
    window.submitIdea = submitIdea;
    window.aiSummarize = aiSummarize;
    window.saveSettings = saveSettings;
    window.addNewCategory = addNewCategory;
    window.toggleDarkMode = toggleDarkMode;
    window.closeViewModal = () => document.getElementById('view-modal').classList.add('hidden');
    window.closeEditModal = () => document.getElementById('edit-modal').classList.add('hidden');
    window.submitEdit = submitEdit;
}

async function loadData(isSilent = false) {
    const data = await api.fetchData(GAS_URL, isSilent);
    if (data) {
        allIdeas = data.ideas;
        allCategories = data.categories;
        updateCategoriesUI();
        window.filterLibrary(currentFilter);
    }
}

function updateCategoriesUI() {
    const addSelect = document.getElementById('add-category');
    const editSelect = document.getElementById('edit-category');
    const tabsContainer = document.getElementById('library-tabs');

    const optionsHtml = allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    addSelect.innerHTML = optionsHtml;
    editSelect.innerHTML = optionsHtml;

    let tabsHtml = `<button class="tab-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="filterLibrary('all')">全部</button>`;
    allCategories.forEach(cat => {
        const shortName = cat.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+/, '').trim() || cat;
        tabsHtml += `<button class="tab-btn ${currentFilter === cat ? 'active' : ''}" onclick="filterLibrary('${cat}')">${shortName}</button>`;
    });
    tabsContainer.innerHTML = tabsHtml;
}

async function handleImageUpload(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    const container = document.getElementById('add-preview-container');
    container.innerHTML = '';
    uploadedImagesBase64 = [];
    container.classList.remove('hidden');

    for (let file of files) {
        const base64 = await utils.compressImage(file);
        uploadedImagesBase64.push(base64);
        const img = document.createElement('img');
        img.src = base64;
        img.className = 'w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm preview-item';
        container.appendChild(img);
    }
}

async function submitIdea() {
    const category = document.getElementById('add-category').value;
    const content = document.getElementById('add-content').value;
    const url = document.getElementById('add-url').value;

    if (!content && !url && uploadedImagesBase64.length === 0) {
        utils.showToast("請至少輸入內容、連結或圖片", "bg-red-500");
        return;
    }

    // Optimistic UI
    const tempId = Date.now();
    const newItem = {
        '時間_ID': tempId,
        '分類': category,
        '內容描述': content,
        '來源連結': url,
        '圖片連結': '',
        '時間_顯示': '同步中...'
    };
    allIdeas.unshift(newItem);
    window.filterLibrary(currentFilter);
    ui.switchView('library', document.querySelectorAll('.nav-item')[1]);

    const btn = document.getElementById('submit-btn');
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i><span>同步中...</span>';
    btn.disabled = true;

    const result = await api.submitIdeaAPI(GAS_URL, {
        action: 'addIdea',
        category, content, url,
        images: uploadedImagesBase64
    });

    if (result.status === 'success') {
        document.getElementById('add-content').value = '';
        document.getElementById('add-url').value = '';
        document.getElementById('add-preview-container').innerHTML = '';
        document.getElementById('add-preview-container').classList.add('hidden');
        uploadedImagesBase64 = [];
        utils.showToast("✅ 儲存成功", "bg-green-600");
        await loadData(true);
    } else {
        allIdeas = allIdeas.filter(i => i['時間_ID'] !== tempId);
        window.filterLibrary(currentFilter);
        utils.showToast("❌ 失敗：" + result.message, "bg-red-500");
    }
    btn.innerHTML = origHtml;
    btn.disabled = false;
}

function searchIdeas(keyword) {
    if (!keyword) {
        document.getElementById('search-container').innerHTML = `<div class="text-center py-20 text-gray-400"><p>輸入關鍵字開始尋找</p></div>`;
        return;
    }
    const results = allIdeas.filter(idea =>
        (idea['內容描述'] || '').toLowerCase().includes(keyword) ||
        (idea['來源連結'] || '').toLowerCase().includes(keyword) ||
        (idea['分類'] || '').toLowerCase().includes(keyword)
    );
    ui.renderCards(results, 'search-container', keyword, openViewModal);
}

function openViewModal(id) {
    const idea = allIdeas.find(i => i['時間_ID'] == id);
    if (!idea) return;

    document.getElementById('view-category').innerText = idea['分類'];
    document.getElementById('view-time').innerText = idea['時間_顯示'] || '';
    document.getElementById('view-text').innerHTML = utils.escapeHTML(idea['內容描述'] || '');

    const imgContainer = document.getElementById('view-images');
    imgContainer.innerHTML = '';
    if (idea['圖片連結']) {
        const urls = idea['圖片連結'].split(/[\n,]/).filter(u => u.trim());
        urls.forEach(url => {
            imgContainer.innerHTML += `<img src="${utils.getDirectImageUrl(url.trim())}" class="w-full rounded-xl border">`;
        });
    }

    const linkContainer = document.getElementById('view-link-container');
    if (idea['來源連結']) {
        linkContainer.innerHTML = `<a href="${idea['來源連結']}" target="_blank" class="flex justify-center items-center gap-2 font-bold text-blue-600 bg-blue-50 border p-3 rounded-xl w-full"><i class="ph ph-arrow-square-out"></i> 開啟連結</a>`;
    } else linkContainer.innerHTML = '';

    document.getElementById('view-edit-btn').onclick = () => { window.closeViewModal(); openEditModal(id); };
    document.getElementById('view-delete-btn').onclick = () => deleteIdea(id);
    document.getElementById('view-modal').classList.remove('hidden');
}

function openEditModal(id) {
    const idea = allIdeas.find(i => i['時間_ID'] == id);
    if (!idea) return;
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-category').value = idea['分類'];
    document.getElementById('edit-content').value = idea['內容描述'] || '';
    document.getElementById('edit-url').value = idea['來源連結'] || '';
    document.getElementById('edit-modal').classList.remove('hidden');
}

async function submitEdit() {
    const id = document.getElementById('edit-id').value;
    const payload = {
        action: 'updateIdea',
        id,
        category: document.getElementById('edit-category').value,
        content: document.getElementById('edit-content').value,
        url: document.getElementById('edit-url').value
    };
    utils.showLoading("更新中...");
    window.closeEditModal();
    const result = await api.submitIdeaAPI(GAS_URL, payload);
    if (result.status === 'success') {
        utils.showToast("✅ 更新成功", "bg-green-600");
        await loadData(true);
    } else utils.showToast("❌ 失敗", "bg-red-500");
    utils.hideLoading();
}

async function deleteIdea(id) {
    if (!confirm("確定刪除？")) return;
    const backup = [...allIdeas];
    allIdeas = allIdeas.filter(i => i['時間_ID'] != id);
    window.filterLibrary(currentFilter);
    window.closeViewModal();
    utils.showToast("🗑️ 刪除中...", "bg-gray-700");

    const result = await api.submitIdeaAPI(GAS_URL, { action: 'deleteIdea', id });
    if (result.status === 'success') {
        utils.showToast("✅ 已刪除", "bg-gray-800");
        await loadData(true);
    } else {
        allIdeas = backup;
        window.filterLibrary(currentFilter);
        utils.showToast("❌ 刪除失敗", "bg-red-500");
    }
}

async function aiSummarize() {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        ui.switchView('settings', document.querySelectorAll('.nav-item')[3]);
        utils.showToast("請先輸入 API Key", "bg-purple-600");
        return;
    }
    const content = document.getElementById('add-content').value.trim();
    const url = document.getElementById('add-url').value.trim();
    if (!content && !url && uploadedImagesBase64.length === 0) return;

    const btn = document.getElementById('ai-btn');
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i><span>分析中...</span>';
    btn.disabled = true;

    try {
        const prompt = `分析內容並給出 JSON: {summary: string, category: string}. 現有分類: ${allCategories.join(', ')}`;
        const parts = [{ text: prompt }];
        if (content) parts.push({ text: `筆記: ${content}` });
        if (url) parts.push({ text: `網址: ${url}` });
        uploadedImagesBase64.forEach(b => parts.push({ inlineData: { mimeType: "image/jpeg", data: b.split(',')[1] } }));

        const result = await api.aiSummarizeAPI(apiKey, {
            contents: [{ role: "user", parts }],
            generationConfig: { responseMimeType: "application/json" }
        });

        if (result.summary) {
            const el = document.getElementById('add-content');
            el.value = el.value ? `【AI】${result.summary}\n\n---\n${el.value}` : `【AI】${result.summary}`;
        }
        if (result.category) {
            if (!allCategories.includes(result.category)) {
                allCategories.push(result.category);
                updateCategoriesUI();
            }
            document.getElementById('add-category').value = result.category;
        }
        utils.showToast("✨ AI 完成", "bg-green-600");
    } catch (e) {
        utils.showToast("AI 失敗: " + e.message, "bg-red-500");
    } finally {
        btn.innerHTML = origHtml;
        btn.disabled = false;
    }
}

function saveSettings() {
    localStorage.setItem('geminiApiKey', document.getElementById('api-key-input').value.trim());
    utils.showToast("✅ 已儲存", "bg-green-600");
}

async function addNewCategory() {
    const input = document.getElementById('new-category-input');
    const val = input.value.trim();
    if (!val || allCategories.includes(val)) return;
    utils.showLoading("新增中...");
    const result = await api.submitIdeaAPI(GAS_URL, { action: 'addCategory', category: val });
    if (result.status === 'success') {
        input.value = '';
        utils.showToast("✅ 成功", "bg-green-600");
        await loadData(true);
    } else utils.showToast("❌ 失敗", "bg-red-500");
    utils.hideLoading();
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    utils.showToast(isDark ? "🌙 深色模式" : "☀️ 淺色模式");
}

function setupPWA() {
    const manifest = {
        name: "靈感收集器",
        short_name: "IdeaApp",
        start_url: ".",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        icons: [{
            src: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Google_Keep_icon_%282020%29.svg/512px-Google_Keep_icon_%282020%29.svg.png",
            sizes: "512x512",
            type: "image/png"
        }]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    document.querySelector('head').insertAdjacentHTML('beforeend', `<link rel="manifest" href="${URL.createObjectURL(blob)}">`);
}
function setupPWA() {
    const manifest = {
        name: "靈感收集器",
        short_name: "IdeaApp",
        start_url: ".",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        icons: [{
            src: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Google_Keep_icon_%282020%29.svg/512px-Google_Keep_icon_%282020%29.svg.png",
            sizes: "512x512",
            type: "image/png"
        }]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
    }
    link.href = url;
}
