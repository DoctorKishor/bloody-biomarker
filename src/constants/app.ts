export const MAIN_SETTINGS_ID = 'main'
export const DB_NAME = 'bloodboy-db'
export const PRESERVED_OPENAI_TOKEN_KEY = 'preservedOpenAIToken'
export const PRESERVED_GEMINI_TOKEN_KEY = 'preservedGeminiToken'
export const PRESERVED_AI_PROVIDER_KEY = 'preservedAiProvider'

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'

export const GEMINI_MODEL_PRESETS = [
    {
        value: 'gemini-3.8-flash',
        label: 'gemini-3.8-flash (Recommended — Fast & Multimodal)',
    },
    {
        value: 'gemini-3.5-flash-lite',
        label: 'gemini-3.5-flash-lite (Fastest & Lowest Cost)',
    },
    {
        value: 'gemini-3.1-pro-preview',
        label: 'gemini-3.1-pro-preview (Complex Reasoning)',
    },
    {
        value: 'gemini-3.1-flash-lite',
        label: 'gemini-3.1-flash-lite (Lightweight)',
    },
]
