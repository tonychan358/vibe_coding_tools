/**
 * API logic for IdeaApp
 */
import { showToast, showLoading, hideLoading } from './utils.js';

export async function fetchData(gasUrl, isSilent = false) {
    if (!isSilent) showLoading("同步資料庫中...");
    try {
        const response = await fetch(gasUrl);
        const data = await response.json();
        return {
            ideas: data.ideas || [],
            categories: data.categories || ['未分類']
        };
    } catch (error) {
        console.error(error);
        if (!isSilent) showToast("讀取失敗，請檢查網路", "bg-red-500");
        return null;
    } finally {
        if (!isSilent) hideLoading();
    }
}

export async function submitIdeaAPI(gasUrl, payload) {
    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (error) {
        console.error(error);
        return { status: 'error', message: '連線錯誤' };
    }
}

export async function aiSummarizeAPI(apiKey, payload) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error.message);
        return JSON.parse(result.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error(error);
        throw error;
    }
}
