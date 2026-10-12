export type RecordCategory =
    | 'vital_signs'
    | 'lab_tests'
    | 'social_history'
    | 'vaccinations'
    | 'insurance'
    | 'procedures'
    | 'medications'
    | 'conditions'
    | 'imaging'
    | 'documents'
    | 'encounters'

export type RecordSource = 'uploaded_files' | 'data_entry'

export interface HealthRecordItem {
    id: string
    year: number
    dateStr: string
    relativeDate?: string
    facilityName: string
    title: string
    category: RecordCategory
    source: RecordSource
    isRecentlyAdded?: boolean
    documentId?: string
    biomarkerCount?: number
    previewImage?: string
}

export interface GuavaRecordsPageProps {
    className?: string
    onAddResult?: () => void
    onNavigateToBiomarkers?: () => void
    onNavigateToSources?: () => void
}
