export type SourcesCategory = 'devices' | 'uploads' | 'portals' | 'records'

export type MobileSourcesScreen = 'sources_home' | 'upload_files' | 'document_details' | 'parameter_preview'

export interface SourceAttachmentFile {
    id: string
    name: string
    uploadDate: string
    size: string
    previewImage?: string
    provider?: string
    date?: string
    notes?: string
    documentId?: string
    pageNumber?: number
}

export interface ExtractedLabItem {
    id: string
    name: string
    value: string
    unit?: string
    refRange?: string
    isAuto?: boolean
    page?: number
    boundingBox?: {
        top: string
        left: string
        width: string
        height: string
    }
}

export interface ExtractedLabGroup {
    id: string
    fileId?: string
    title: string
    date: string
    items: ExtractedLabItem[]
}
