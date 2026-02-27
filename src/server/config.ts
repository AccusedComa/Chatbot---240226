import db from './db';

export const getApiKey = (): string | null => {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey && envKey !== 'MY_GEMINI_API_KEY') return envKey;

    try {
        const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'gemini_api_key'").get() as { value: string } | undefined;
        return setting?.value || null;
    } catch (e) {
        return null;
    }
};

export const getGroqApiKey = (): string | null => {
    const envKey = process.env.GROQ_API_KEY;
    if (envKey && envKey !== 'MY_GROQ_API_KEY') return envKey;

    try {
        const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'groq_api_key'").get() as { value: string } | undefined;
        return setting?.value || null;
    } catch (e) {
        return null;
    }
};
