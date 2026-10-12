import { useEffect, useState } from 'react'

import { CheckCircleFilled, KeyOutlined } from '@ant-design/icons'
import { Button, Input, Radio, Select, Space, Tag, message } from 'antd'
import { usePostHog } from 'posthog-js/react'

import {
    DEFAULT_GEMINI_MODEL,
    GEMINI_MODEL_PRESETS,
    MAIN_SETTINGS_ID,
    PRESERVED_AI_PROVIDER_KEY,
    PRESERVED_GEMINI_TOKEN_KEY,
    PRESERVED_OPENAI_TOKEN_KEY,
} from '@/constants'
import {
    addAppSettings,
    AiProvider,
    updateAppSettings,
    useAppSettings,
} from '@/db/models/appSettings'
import { captureEvent } from '@/utils'

import { ApiKeyInputProps } from './ApiKeyInput.types'

export const ApiKeyInput = (props: ApiKeyInputProps) => {
    const { className, onSaved } = props
    const posthog = usePostHog()
    const { data: settings, loading } = useAppSettings()
    const currentSettings = settings[0]

    const initialProvider: AiProvider =
        currentSettings?.aiProvider ??
        (currentSettings?.geminiApiKey ? 'gemini' : (currentSettings?.openaiApiKey ? 'openai' : 'gemini'))

    const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null)
    const provider = selectedProvider ?? initialProvider
    const [apiKeyInput, setApiKeyInput] = useState('')

    const savedGeminiModel = currentSettings?.geminiModel ?? currentSettings?.aiModel ?? DEFAULT_GEMINI_MODEL
    const isSavedPreset = GEMINI_MODEL_PRESETS.some(p => p.value === savedGeminiModel)

    const [modelSelection, setModelSelection] = useState<string | null>(null)
    const [customModel, setCustomModel] = useState<string | null>(null)

    const currentModelOption = modelSelection ?? (isSavedPreset ? savedGeminiModel : 'custom')

    useEffect(() => {
        if (loading) return

        const preservedOpenai = sessionStorage.getItem(PRESERVED_OPENAI_TOKEN_KEY)
        const preservedGemini = sessionStorage.getItem(PRESERVED_GEMINI_TOKEN_KEY)
        const preservedProvider = sessionStorage.getItem(PRESERVED_AI_PROVIDER_KEY) as AiProvider | null

        const hasPreservedOpenai = Boolean(preservedOpenai && !currentSettings?.openaiApiKey)
        const hasPreservedGemini = Boolean(preservedGemini && !currentSettings?.geminiApiKey)

        if (hasPreservedOpenai || hasPreservedGemini) {
            const restoreSettings = async () => {
                const newSettings = {
                    id: MAIN_SETTINGS_ID,
                    openaiApiKey: preservedOpenai ?? currentSettings?.openaiApiKey ?? '',
                    geminiApiKey: preservedGemini ?? currentSettings?.geminiApiKey ?? '',
                    aiProvider: preservedProvider ?? (preservedGemini ? 'gemini' : 'openai'),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
                if (currentSettings) {
                    await updateAppSettings(MAIN_SETTINGS_ID, newSettings)
                } else {
                    await addAppSettings(newSettings)
                }
                sessionStorage.removeItem(PRESERVED_OPENAI_TOKEN_KEY)
                sessionStorage.removeItem(PRESERVED_GEMINI_TOKEN_KEY)
                sessionStorage.removeItem(PRESERVED_AI_PROVIDER_KEY)
            }
            void restoreSettings()
        }
    }, [currentSettings, loading])

    const hasCurrentProviderKey = provider === 'gemini'
        ? Boolean(currentSettings?.geminiApiKey)
        : Boolean(currentSettings?.openaiApiKey)

    const handleModelOptionChange = async (optionValue: string) => {
        setModelSelection(optionValue)
        if (optionValue !== 'custom') {
            if (currentSettings) {
                await updateAppSettings(MAIN_SETTINGS_ID, {
                    geminiModel: optionValue,
                    updatedAt: new Date(),
                })
                void message.success(`Model switched to ${optionValue}`)
                captureEvent(posthog, 'gemini_model_updated', { model: optionValue })
            }
        }
    }

    const handleCustomModelSave = async () => {
        const trimmed = (customModel ?? '').trim()
        if (!trimmed) return
        if (currentSettings) {
            await updateAppSettings(MAIN_SETTINGS_ID, {
                geminiModel: trimmed,
                updatedAt: new Date(),
            })
            void message.success(`Custom model set to ${trimmed}`)
            captureEvent(posthog, 'gemini_model_updated', { model: trimmed })
        }
    }

    const handleSaveApiKey = async () => {
        const trimmedKey = apiKeyInput.trim()
        if (!trimmedKey && !hasCurrentProviderKey) return

        const customModelTrimmed = customModel?.trim()
        const resolvedGeminiModel = currentModelOption === 'custom'
            ? (customModelTrimmed && customModelTrimmed.length > 0 ? customModelTrimmed : savedGeminiModel)
            : currentModelOption

        const newSettings = {
            id: MAIN_SETTINGS_ID,
            aiProvider: provider,
            geminiModel: resolvedGeminiModel,
            openaiApiKey: provider === 'openai' && trimmedKey ? trimmedKey : (currentSettings?.openaiApiKey ?? ''),
            geminiApiKey: provider === 'gemini' && trimmedKey ? trimmedKey : (currentSettings?.geminiApiKey ?? ''),
            createdAt: currentSettings?.createdAt ?? new Date(),
            updatedAt: new Date(),
        }

        if (currentSettings) {
            await updateAppSettings(MAIN_SETTINGS_ID, newSettings)
            captureEvent(posthog, 'api_key_updated', { provider })
        } else {
            await addAppSettings(newSettings)
            captureEvent(posthog, 'api_key_saved', { provider })
        }

        setApiKeyInput('')
        onSaved?.()
    }

    const handleProviderChange = async (newProvider: AiProvider) => {
        setSelectedProvider(newProvider)
        setApiKeyInput('')
        if (currentSettings) {
            await updateAppSettings(MAIN_SETTINGS_ID, {
                aiProvider: newProvider,
                updatedAt: new Date(),
            })
            captureEvent(posthog, 'ai_provider_switched', { provider: newProvider })
        }
    }

    return (
        <div className={`bg-white p-6 rounded-lg border border-gray-100 shadow-sm ${className ?? ''}`}>
            <div className='flex items-center gap-2 mb-3'>
                <KeyOutlined className='text-blue-600 text-lg'/>
                <h3 className='text-lg font-semibold text-gray-800 m-0'>AI Provider & API Key</h3>
            </div>

            <p className='text-sm text-gray-500 mb-4'>
                Choose your preferred AI provider to extract biomarkers from blood test PDFs. Your API key is stored securely in your browser&apos;s local storage and is never uploaded to any server.
            </p>

            <div className='mb-5'>
                <span className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
                    Select Provider
                </span>
                <Radio.Group
                    value={provider}
                    onChange={(e) => { void handleProviderChange(e.target.value as AiProvider) }}
                    buttonStyle='solid'
                >
                    <Radio.Button value='gemini'>
                        Google Gemini (Recommended)
                    </Radio.Button>
                    <Radio.Button value='openai'>
                        OpenAI
                    </Radio.Button>
                </Radio.Group>
            </div>

            {provider === 'gemini' ? (
                <div className='bg-slate-50 p-4 rounded-md mb-4 border border-slate-100'>
                    <div className='flex justify-between items-center mb-2'>
                        <span className='font-medium text-gray-700 text-sm'>
                            Google Gemini Configuration
                        </span>
                        {currentSettings?.geminiApiKey && (
                            <Tag icon={<CheckCircleFilled/>} color='success'>
                                Key Saved
                            </Tag>
                        )}
                    </div>
                    <p className='text-xs text-gray-500 mb-3'>
                        Get a free API key from Google AI Studio at{' '}
                        <a
                            href='https://aistudio.google.com/apikey'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-blue-600 hover:text-blue-800 underline'
                            onClick={() => {
                                captureEvent(posthog, 'gemini_api_keys_link_clicked')
                            }}
                        >
                            aistudio.google.com/apikey
                        </a>
                    </p>

                    <div className='mb-3'>
                        <span className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1'>
                            Model Endpoint
                        </span>
                        <Select
                            className='w-full'
                            value={currentModelOption}
                            onChange={(val) => { void handleModelOptionChange(val) }}
                            options={[
                                ...GEMINI_MODEL_PRESETS.map(p => ({
                                    value: p.value,
                                    label: p.label,
                                })),
                                {
                                    value: 'custom',
                                    label: 'Custom Model ID...',
                                },
                            ]}
                        />
                    </div>

                    {currentModelOption === 'custom' && (
                        <div className='mb-3'>
                            <span className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1'>
                                Custom Model ID
                            </span>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input
                                    placeholder='e.g. gemini-3.8-flash, gemini-3.5-flash-lite'
                                    value={customModel ?? (isSavedPreset ? '' : savedGeminiModel)}
                                    onChange={(e) => { setCustomModel(e.target.value) }}
                                    onPressEnter={() => { void handleCustomModelSave() }}
                                />
                                <Button onClick={() => { void handleCustomModelSave() }}>
                                    Set Model
                                </Button>
                            </Space.Compact>
                        </div>
                    )}

                    <div>
                        <span className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1'>
                            API Key
                        </span>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input.Password
                                placeholder={currentSettings?.geminiApiKey ? 'Change existing Gemini key (AIza...)' : 'Enter Gemini API key (AIza...)'}
                                value={apiKeyInput}
                                onChange={(e) => { setApiKeyInput(e.target.value) }}
                                onPressEnter={() => { void handleSaveApiKey() }}
                            />
                            <Button type='primary' onClick={() => { void handleSaveApiKey() }}>
                                Save Key
                            </Button>
                        </Space.Compact>
                    </div>
                </div>
            ) : (
                <div className='bg-slate-50 p-4 rounded-md mb-4 border border-slate-100'>
                    <div className='flex justify-between items-center mb-2'>
                        <span className='font-medium text-gray-700 text-sm'>OpenAI (GPT-5.4 / GPT-4o)</span>
                        {currentSettings?.openaiApiKey && (
                            <Tag icon={<CheckCircleFilled/>} color='success'>
                                Key Saved
                            </Tag>
                        )}
                    </div>
                    <p className='text-xs text-gray-500 mb-3'>
                        Get your API key at{' '}
                        <a
                            href='https://platform.openai.com/api-keys'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-blue-600 hover:text-blue-800 underline'
                            onClick={() => {
                                captureEvent(posthog, 'openai_api_keys_link_clicked')
                            }}
                        >
                            platform.openai.com/api-keys
                        </a>
                    </p>
                    <Space.Compact style={{ width: '100%' }}>
                        <Input.Password
                            placeholder={currentSettings?.openaiApiKey ? 'Change existing OpenAI key (sk-...)' : 'Enter OpenAI API key (sk-...)'}
                            value={apiKeyInput}
                            onChange={(e) => { setApiKeyInput(e.target.value) }}
                            onPressEnter={() => { void handleSaveApiKey() }}
                        />
                        <Button type='primary' onClick={() => { void handleSaveApiKey() }}>
                            Save Key
                        </Button>
                    </Space.Compact>
                </div>
            )}
        </div>
    )
}
