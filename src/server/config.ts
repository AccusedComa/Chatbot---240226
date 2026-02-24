import db from './db';

export const getApiKey = () => {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey && envKey !== 'MY_GEMINI_API_KEY') return envKey;

    try {
        const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'gemini_api_key'").get() as { value: string | null };
        return (setting as any)?.value;
    } catch (e) {
        return null;
    }
};
