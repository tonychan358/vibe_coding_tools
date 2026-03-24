/**
 * UI and Rendering logic for IdeaApp
 */
import { getDirectImageUrl, escapeHTML, showToast } from './utils.js';

export function switchView(viewName, navElement) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    document.getElementById(`view-${viewName}`).classList.add('active');
    navElement.classList.add('active');

    const title = document.getElementById('headerTitle');
    const icon = document.getElementById('headerIcon');
    const refreshBtn = document.getElementById('refreshBtn');

    const views = {
        'add': { title: '新增靈感', icon: 'ph-sparkle text-blue-500', showRefresh: false },
        'library': { title: '我的靈感庫', icon: 'ph-cards text-blue-500', showRefresh: true },
        'search': { title: '搜尋靈感', icon: 'ph-magnifying-glass text-blue-500', showRefresh: false },
        'settings': { title: '系統設定', icon: 'ph-gear text-gray-500', showRefresh: false }
    };

    title.innerText = views[viewName].title;
    if (views[viewName].showRefresh) {
        icon.style.display = 'none';
        refreshBtn.classList.remove('hidden');
    } else {
        icon.className = `ph ${views[viewName].icon} text-2xl`;
        icon.style.display = 'block';
        refreshBtn.classList.add('hidden');
    }
    document.getElementById('mainContent').scrollTop = 0;
}

export function renderCards(dataArray, containerId, highlightKeyword = '', openCallback) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (dataArray.length === 0) {
        container.innerHTML = `<div class="text-center py-20 text-gray-400"><i class="ph ph-empty text-5xl mb-2 opacity-30"></i><p class="font-medium">沒有找到相關紀錄</p></div>`;
        return;
    }

    dataArray.forEach(idea => {
        let imageHtml = '';
        if (idea['圖片連結']) {
            const urls = idea['圖片連結'].toString().split(/[\n,]/).filter(u => u.trim() !== '');
            if (urls.length > 0) {
                imageHtml = `<div class="card-image-gallery no-scrollbar">`;
                urls.forEach(url => {
                    imageHtml += `<img src="${getDirectImageUrl(url.trim())}" loading="lazy" class="h-24 w-24 rounded-lg object-cover flex-shrink-0 border dark:border-gray-800">`;
                });
                imageHtml += `</div>`;
            }
        }

        let linkHtml = '';
        if (idea['來源連結']) {
            let displayUrl = idea['來源連結'];
            try { displayUrl = new URL(displayUrl).hostname; } catch (e) { }
            linkHtml = `
                <div class="inline-flex items-center gap-1.5 mt-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[11px] font-bold">
                    <i class="ph ph-link-simple"></i>
                    <span class="truncate max-w-[150px]">${displayUrl}</span>
                </div>`;
        }

        const card = document.createElement('div');
        card.className = "card group";
        card.onclick = () => openCallback(idea['時間_ID']);

        let content = escapeHTML(idea['內容描述'] || '');
        if (highlightKeyword) {
            const regex = new RegExp(`(${highlightKeyword})`, 'gi');
            content = content.replace(regex, '<mark>$1</mark>');
        }

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] rounded font-bold uppercase tracking-wider">${idea['分類']}</span>
                <span class="text-gray-400 dark:text-gray-500 text-[10px] font-medium">${idea['時間_顯示'] || ''}</span>
            </div>
            ${idea['內容描述'] ? `<p class="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed line-clamp-3 mb-2">${content}</p>` : ''}
            ${imageHtml}
            ${linkHtml}
        `;
        container.appendChild(card);
    });
}
