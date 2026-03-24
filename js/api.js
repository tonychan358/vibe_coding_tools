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
        // Using gemini-1.5-flash for maximum stability/compatibility with current keys
        const model = "gemini-1.5-flash";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error.message);

        const text = result.candidates[0].content.parts[0].text;

        // Robust JSON extraction (removes markdown backticks if any)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI 回傳格式不正確 (找不到 JSON)");

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}
