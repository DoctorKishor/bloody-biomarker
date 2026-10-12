import { useCallback, useEffect, useMemo, useState } from 'react'

import { GoogleGenAI } from '@google/genai'
import { App } from 'antd'
import posthog from 'posthog-js'

import { updateAppSettings, useAppSettings } from '@/db/models/appSettings'

export const useGemini = () => {
    const { message } = App.useApp()
    const { data: settings, loading } = useAppSettings()
    const apiKey = settings[0]?.geminiApiKey
    const [minLoadingTime, setMinLoadingTime] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadingTime(false)
        }, 200)
        return () => { clearTimeout(timer) }
    }, [])

    const resetApiKey = useCallback(async () => {
        if (settings[0]) {
            await updateAppSettings(settings[0].id, { geminiApiKey: '' })
        }
    }, [settings])

    const client = useMemo(() => {
        if (!apiKey) return null

        const geminiClient = new GoogleGenAI({ apiKey })

        return {
            models: {
                generateContent: async (
                    ...args: Parameters<typeof geminiClient.models.generateContent>
                ): Promise<Awaited<ReturnType<typeof geminiClient.models.generateContent>>> => {
                    try {
                        return await geminiClient.models.generateContent(...args)
                    } catch (error: unknown) {
                        const err = error as { status?: number, message?: string }
                        try {
                            posthog.capture('gemini_api_error', {
                                status: err.status,
                                errorType: err.status === 400 || err.status === 401 || err.status === 403 ? 'invalid_api_key' : 'api_error',
                            })
                        } catch {
                            // PostHog not initialized yet
                        }
                        const messageLower = err.message?.toLowerCase() ?? ''
                        const isAuthError =
                            err.status === 401 ||
                            err.status === 403 ||
                            messageLower.includes('api_key_invalid') ||
                            messageLower.includes('api key not valid')
                        if (isAuthError) {
                            void message.error('Invalid Gemini API key')
                            void resetApiKey()
                        } else {
                            void message.error(`Gemini API error: ${err.message ?? 'Unknown error'}`)
                        }
                        throw error
                    }
                },
            },
        }
    }, [apiKey, resetApiKey, message])

    return {
        client,
        hasApiKey: !!apiKey,
        loading: loading || minLoadingTime,
        resetApiKey,
    }
}
