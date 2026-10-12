export interface GoogleDriveBackupSettings {
    enabled: boolean
    rootFolderId?: string
    latestFolderId?: string
    historyFolderId?: string
    manifestFileId?: string
    latestFileId?: string
    lastBackupAt?: Date
    lastBackupFileId?: string
    lastBackupFileName?: string
    lastBackupWebViewLink?: string
    lastSyncDirection?: 'uploaded' | 'downloaded' | 'none'
    lastError?: string
    connectedAt?: Date
}

export type AiProvider = 'gemini' | 'openai'

export interface AppSettings {
    id: string
    aiProvider?: AiProvider
    openaiApiKey: string
    geminiApiKey?: string
    aiModel?: string
    geminiModel?: string
    lastExportedAt?: Date
    googleDriveBackup?: GoogleDriveBackupSettings
    createdAt: Date
    updatedAt: Date
}
