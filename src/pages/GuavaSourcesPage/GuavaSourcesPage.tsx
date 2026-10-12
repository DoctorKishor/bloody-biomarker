import { useState, useId, useMemo } from 'react'

import {
    ArrowLeftOutlined,
    CalendarOutlined,
    CheckOutlined,
    DeleteOutlined,
    LaptopOutlined,
    FileTextOutlined,
    BankOutlined,
    FolderOpenOutlined,
    PlusOutlined,
    MoreOutlined,
    ShareAltOutlined,
    CloseOutlined,
    EditOutlined,
    LeftOutlined,
    RightOutlined,
    CheckCircleFilled,
    CloudUploadOutlined,
    RightOutlined as ChevronRightOutlined,
    QuestionCircleOutlined,
    InfoCircleOutlined,
    UserOutlined,
    PlusCircleOutlined,
    PictureOutlined,
} from '@ant-design/icons'
import { Dropdown, message, Modal } from 'antd'
import dayjs from 'dayjs'

import { DeleteDocumentModal } from '@/components/DeleteDocumentModal'
import { GuavaLogo } from '@/components/GuavaHeader/GuavaHeader'
import { useBiomarkerRecords } from '@/db/models/biomarkerRecord'
import { deleteDocumentWithCascade, useDocuments } from '@/db/models/document'
import { useCurrentUser } from '@/db/models/user'

import {
    ExtractedLabGroup,
    ExtractedLabItem,
    MobileSourcesScreen,
    SourceAttachmentFile,
    SourcesCategory,
} from './GuavaSourcesPage.types'

const INITIAL_FILES: SourceAttachmentFile[] = []

const INITIAL_LAB_GROUPS: ExtractedLabGroup[] = []

// Helper for exact bounding boxes on the report image
const getParamBoundingBox = (name: string, index: number) => {
    const map: Record<string, { top: string, left: string, width: string, height: string }> = {
        'Fasting Glucose': {
            top: '22.8%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Glucose - Fasting': {
            top: '22.8%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Glucose - Post Prandial': {
            top: '26.2%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Blood Urea': {
            top: '29.8%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        Creatinine: {
            top: '32.8%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        eGFR: {
            top: '34.2%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Uric Acid': {
            top: '35.8%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Total Cholesterol': {
            top: '40.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        Triglycerides: {
            top: '43.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'HDL Cholesterol': {
            top: '46.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Non-HDL Cholesterol': {
            top: '49.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'LDL Cholesterol': {
            top: '54.0%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'VLDL Cholesterol': {
            top: '57.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Bilirubin, Total, Serum': {
            top: '60.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Direct Bilirubin': {
            top: '62.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Bilirubin, Indirect, Blood': {
            top: '65.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Total Protein, Serum': {
            top: '68.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        Albumin: {
            top: '71.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        Globulin: {
            top: '74.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'A/G Ratio': {
            top: '77.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'SGOT / AST': {
            top: '50.0%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'SGPT / ALT': {
            top: '52.5%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
        'Alkaline Phosphatase (ALP)': {
            top: '55.0%',
            left: '15.5%',
            width: '28%',
            height: '2.4%',
        },
    }

    if (map[name]) {
        return map[name]
    }

    const calculatedTop = Math.min(84, Math.max(20, 22 + ((index % 24) * 2.5)))
    return {
        top: `${calculatedTop}%`,
        left: '15.5%',
        width: '28%',
        height: '2.4%',
    }
}

export interface GuavaSourcesPageProps {
    className?: string
    onAddResult?: () => void
}

export const GuavaSourcesPage = ({ className, onAddResult }: GuavaSourcesPageProps) => {
    const fileUploadInputId = useId()
    const { data: dbDocuments = [] } = useDocuments()
    const { data: dbRecords = [] } = useBiomarkerRecords()
    const currentUser = useCurrentUser()
    const userInitials = currentUser?.name
        ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U'

    const [selectedCategory, setSelectedCategory] = useState<SourcesCategory>('uploads')
    const [files, setFiles] = useState<SourceAttachmentFile[]>(INITIAL_FILES)
    const [labGroups, setLabGroups] = useState<ExtractedLabGroup[]>(INITIAL_LAB_GROUPS)
    const [selectedFileId, setSelectedFileId] = useState<string>('')

    // Document Delete Modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [fileToDelete, setFileToDelete] = useState<SourceAttachmentFile | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Merge uploaded documents from DB with local files
    const allFiles = useMemo(() => {
        const list: SourceAttachmentFile[] = [...files]
        if (dbDocuments.length > 0) {
            dbDocuments.forEach((doc, idx) => {
                if (!list.some(f => f.id === doc.id || f.documentId === doc.id)) {
                    list.push({
                        id: doc.id,
                        documentId: doc.id,
                        name: doc.originalName ?? doc.fileName ?? `Lab Report ${idx + 1}`,
                        uploadDate: doc.createdAt ? dayjs(doc.createdAt).format('MM/DD/YYYY') : '',
                        size: doc.fileSize ? `${(doc.fileSize / (1024 * 1024)).toFixed(2)} MB` : '—',
                        previewImage: doc.thumbnailPath ?? '',
                        provider: doc.lab ?? '',
                        date: doc.testDate ? dayjs(doc.testDate).format('MM / DD / YYYY') : (doc.createdAt ? dayjs(doc.createdAt).format('MM / DD / YYYY') : ''),
                        notes: doc.notes ?? '',
                        pageNumber: 1,
                    })
                }
            })
        }
        return list
    }, [files, dbDocuments])

    const currentSelectedFile = useMemo(() => {
        if (allFiles.length === 0) return null
        return allFiles.find((f) => f.id === selectedFileId) ?? allFiles[0]
    }, [allFiles, selectedFileId])

    const activeFileIndex = useMemo(() => {
        if (!currentSelectedFile) return -1
        return allFiles.findIndex((f) => f.id === currentSelectedFile.id)
    }, [allFiles, currentSelectedFile])

    // Lab groups filtered strictly to the selected file!
    const activeLabGroups = useMemo<ExtractedLabGroup[]>(() => {
        if (!currentSelectedFile) return []

        const matchingMock = labGroups.filter((g) => g.fileId === currentSelectedFile.id)
        if (matchingMock.length > 0) {
            return matchingMock
        }

        const targetDocId = currentSelectedFile.documentId ?? currentSelectedFile.id
        const matchingDb = dbRecords.filter((r) => r.documentId === targetDocId)
        if (matchingDb.length > 0) {
            const items: ExtractedLabItem[] = matchingDb.map((r, idx): ExtractedLabItem => ({
                id: r.id ?? `rec-${idx}`,
                name: r.originalName ?? 'Biomarker',
                value: r.originalValue !== undefined ? String(r.originalValue) : (r.value !== undefined ? String(r.value) : (r.textValue ?? '')),
                unit: r.originalUnit ?? r.ucumCode,
                refRange: r.referenceRangeString ?? (r.referenceRange ? `${r.referenceRange.min ?? ''} - ${r.referenceRange.max ?? ''}` : ''),
                isAuto: true,
            }))
            return [
                {
                    id: `group-db-${targetDocId}`,
                    fileId: currentSelectedFile.id,
                    title: (currentSelectedFile.name ?? 'EXTRACTED LAB RESULTS').replace(/\.[^/.]+$/, '').toUpperCase(),
                    date: currentSelectedFile.uploadDate,
                    items,
                },
            ]
        }

        return []
    }, [currentSelectedFile, labGroups, dbRecords])

    const activeExtractedCount = useMemo(() => {
        return activeLabGroups.reduce((acc, g) => acc + g.items.length, 0)
    }, [activeLabGroups])

    // Mobile Navigation state matching Screenshots 1 -> 2 -> 3 -> 4
    const [mobileScreen, setMobileScreen] = useState<MobileSourcesScreen>('sources_home')
    const [focusedParamIndex, setFocusedParamIndex] = useState(4) // default to Uric Acid (5th item)

    // Parameter Edit Modal state (Screenshot 5)
    const [isEditParamModalOpen, setIsEditParamModalOpen] = useState(false)
    const [editParamValue, setEditParamValue] = useState('')
    const [editParamMin, setEditParamMin] = useState('')
    const [editParamMax, setEditParamMax] = useState('')
    const [editParamUnit, setEditParamUnit] = useState('')
    const [editParamNotes, setEditParamNotes] = useState('')

    // Document Form state
    const [docDate, setDocDate] = useState('')
    const [providerName, setProviderName] = useState('')
    const [notes, setNotes] = useState('')
    const [categoryDiagnostic, setCategoryDiagnostic] = useState(false)
    const [categoryRecords, setCategoryRecords] = useState(false)

    // Desktop Preview Modal state
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
    const [previewPage, setPreviewPage] = useState(1)
    const [desktopActiveParamId, setDesktopActiveParamId] = useState('lr-5')
    const [desktopEditingParam, setDesktopEditingParam] = useState<ExtractedLabItem | null>(null)
    const [highlightAll, setHighlightAll] = useState(false)

    // Add result inline modal / form
    const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false)
    const [newTestName, setNewTestName] = useState('')
    const [newTestValue, setNewTestValue] = useState('')
    const [newTestUnit, setNewTestUnit] = useState('')
    const [newTestRef, setNewTestRef] = useState('')

    // Flatten items for active group only
    const allFlatParams = useMemo<ExtractedLabItem[]>(() => {
        return activeLabGroups.flatMap((group) => group.items)
    }, [activeLabGroups])

    const totalExtractedCount = allFlatParams.length
    const currentActiveParam: ExtractedLabItem | undefined = allFlatParams[focusedParamIndex] ?? allFlatParams[0]

    const handleInitiateDelete = (file: SourceAttachmentFile) => {
        setFileToDelete(file)
        setIsDeleteModalOpen(true)
    }

    const handleConfirmDelete = async (deleteRelatedData: boolean) => {
        if (!fileToDelete) return
        setIsDeleting(true)
        try {
            const targetDocId = fileToDelete.documentId ?? fileToDelete.id

            await deleteDocumentWithCascade({
                documentId: targetDocId,
                deleteRelatedData,
            })

            setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id && f.id !== targetDocId))

            if (deleteRelatedData) {
                setLabGroups((prev) => prev.filter((g) => g.fileId !== fileToDelete.id && g.fileId !== targetDocId))
            }

            const remaining = allFiles.filter((f) => f.id !== fileToDelete.id && f.id !== targetDocId)
            if (remaining.length > 0) {
                const nextFile = remaining[0]
                setSelectedFileId(nextFile.id)
                if (nextFile.date) setDocDate(nextFile.date)
                if (nextFile.provider) setProviderName(nextFile.provider)
                if (nextFile.notes !== undefined) setNotes(nextFile.notes)
            }

            setIsDeleteModalOpen(false)
            setFileToDelete(null)

            if (deleteRelatedData) {
                void message.success(`Deleted "${fileToDelete.name}" and cleared all related records from DB.`)
            } else {
                void message.success(`Removed "${fileToDelete.name}". Associated DB records preserved.`)
            }
        } catch (err) {
            console.error('Failed to delete document:', err)
            void message.error('Failed to delete document')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleAddImages = () => {
        const input = document.getElementById(fileUploadInputId) as HTMLInputElement | null
        if (input) {
            input.click()
        }
    }

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFilesList: SourceAttachmentFile[] = Array.from(e.target.files).map((file, idx) => ({
                id: `new-${Date.now()}-${idx}`,
                name: file.name,
                uploadDate: dayjs().format('MM/DD/YYYY'),
                size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            }))
            setFiles((prev) => [...prev, ...newFilesList])
            void message.success(`Added ${newFilesList.length} image(s)`)
        }
    }

    const handleSaveDoc = () => {
        void message.success('Document details saved successfully!')
    }

    const handleCancelDoc = () => {
        setDocDate(currentSelectedFile?.date ?? '')
        setProviderName(currentSelectedFile?.provider ?? '')
        setNotes(currentSelectedFile?.notes ?? '')
        setCategoryDiagnostic(false)
        setCategoryRecords(false)
        void message.info('Changes discarded')
    }

    const handleDeleteItem = (itemId: string) => {
        setLabGroups((prev) =>
            prev.map((group) => ({
                ...group,
                items: group.items.filter((item) => item.id !== itemId),
            })),
        )
        void message.success('Biomarker record deleted')
    }

    const handleStartDesktopEdit = (item: ExtractedLabItem) => {
        setDesktopEditingParam(item)
        setEditParamValue(item.value)
        setEditParamUnit(item.unit ?? 'mg/dL')
        const range = item.refRange ?? ''
        const parts = range.split('-').map((s) => s.trim())
        if (parts.length === 2) {
            setEditParamMin(parts[0])
            setEditParamMax(parts[1])
        } else {
            setEditParamMin('')
            setEditParamMax(range)
        }
        setEditParamNotes('')
    }

    const handleSaveDesktopEdit = () => {
        if (!desktopEditingParam) return
        const newRange = editParamMin && editParamMax ? `${editParamMin} - ${editParamMax}` : editParamMax || editParamMin
        setLabGroups((prev) =>
            prev.map((group) => ({
                ...group,
                items: group.items.map((item) => {
                    if (item.id === desktopEditingParam.id) {
                        return {
                            ...item,
                            value: editParamValue,
                            unit: editParamUnit,
                            refRange: newRange,
                        }
                    }
                    return item
                }),
            })),
        )
        setDesktopEditingParam(null)
        void message.success('Record updated')
    }

    // Open Mobile Parameter View for a specific biomarker item
    const handleOpenParamPreview = (item: ExtractedLabItem) => {
        const foundIdx = allFlatParams.findIndex((p) => p.id === item.id)
        if (foundIdx >= 0) {
            setFocusedParamIndex(foundIdx)
        }
        setMobileScreen('parameter_preview')
    }

    // Open Mobile Edit Modal (Screenshot 5)
    const handleOpenMobileEditModal = () => {
        if (!currentActiveParam) return
        setEditParamValue(currentActiveParam.value)
        setEditParamUnit(currentActiveParam.unit ?? 'mg/dL')
        const range = currentActiveParam.refRange ?? ''
        const parts = range.split('-').map((s) => s.trim())
        if (parts.length === 2) {
            setEditParamMin(parts[0])
            setEditParamMax(parts[1])
        } else {
            setEditParamMin('')
            setEditParamMax(range)
        }
        setEditParamNotes('')
        setIsEditParamModalOpen(true)
    }

    const handleSaveMobileParamEdit = () => {
        if (!currentActiveParam) return
        const newRange = editParamMin && editParamMax ? `${editParamMin} - ${editParamMax}` : editParamMax || editParamMin
        setLabGroups((prev) =>
            prev.map((group) => ({
                ...group,
                items: group.items.map((item) => {
                    if (item.id === currentActiveParam.id) {
                        return {
                            ...item,
                            value: editParamValue,
                            unit: editParamUnit,
                            refRange: newRange,
                        }
                    }
                    return item
                }),
            })),
        )
        setIsEditParamModalOpen(false)
        void message.success('Updated parameter value')
    }

    const handleAddNewRecord = () => {
        if (!newTestName.trim() || !newTestValue.trim()) {
            void message.warning('Please enter a test name and value')
            return
        }

        const newItem: ExtractedLabItem = {
            id: `item-${Date.now()}`,
            name: newTestName.trim(),
            value: newTestValue.trim(),
            unit: newTestUnit.trim(),
            refRange: newTestRef.trim(),
            isAuto: false,
        }

        setLabGroups((prev) => {
            const next = [...prev]
            if (next.length > 0) {
                next[0] = {
                    ...next[0],
                    items: [newItem, ...next[0].items],
                }
            }
            return next
        })

        setNewTestName('')
        setNewTestValue('')
        setNewTestUnit('')
        setNewTestRef('')
        setIsAddRecordModalOpen(false)
        void message.success('Added new lab record')
    }

    // Dynamic bounding box for currently focused mobile parameter
    const activeBoundingBox = useMemo(() => {
        if (!currentActiveParam) {
            return {
                top: '35.8%',
                left: '15.5%',
                width: '28%',
                height: '2.4%',
            }
        }
        return getParamBoundingBox(currentActiveParam.name, focusedParamIndex)
    }, [currentActiveParam, focusedParamIndex])

    const desktopSingleHighlightBox = useMemo(() => {
        const foundItem = allFlatParams.find((p) => p.id === desktopActiveParamId)
        const name = foundItem?.name ?? 'Uric Acid'
        const idx = allFlatParams.findIndex((p) => p.id === desktopActiveParamId)
        return getParamBoundingBox(name, idx >= 0 ? idx : 0)
    }, [allFlatParams, desktopActiveParamId])

    return (
        <div className={`min-h-screen bg-[#f8faf9] text-[#192823] w-full pb-20 ${className ?? ''}`}>
            {/* Hidden file input for adding images */}
            <input
                id={fileUploadInputId}
                type='file'
                accept='image/*,.pdf'
                multiple
                className='hidden'
                onChange={handleFileSelected}
            />

            {/* ========================================================================= */}
            {/* MOBILE SCREENS (<1024px) - PIXEL-BY-PIXEL REPLICATION OF SCREENSHOTS 1-5 */}
            {/* ========================================================================= */}
            <div className='lg:hidden w-full'>
                {/* ------------------------------------------------------------- */}
                {/* MOBILE SCREEN 1: SOURCES HOME (Screenshot 1)                  */}
                {/* ------------------------------------------------------------- */}
                {mobileScreen === 'sources_home' && (
                    <div className='flex flex-col w-full'>
                        {/* Top App Bar with Guava Wordmark and User Pill */}
                        <div className='h-14 px-4 bg-white border-b border-[#e5ece8] flex items-center justify-between sticky top-0 z-30 shadow-2xs'>
                            <div className='flex items-center gap-2'>
                                <GuavaLogo size={26}/>
                            </div>
                            <span className='text-lg font-bold text-[#192823] tracking-tight'>
                                Guava
                            </span>
                            <div className='flex items-center gap-1.5 py-1 px-2.5 rounded-full border border-[#e5ece8] bg-white text-xs font-semibold text-[#5f736b] shadow-2xs'>
                                <span className='w-5 h-5 rounded-full bg-[#5f736b] text-white flex items-center justify-center text-[10px]'>
                                    <UserOutlined/>
                                </span>
                                <span>{userInitials}</span>
                            </div>
                        </div>

                        {/* White Category Navigation Card */}
                        <div className='p-4'>
                            <div className='bg-white rounded-2xl border border-[#e5ece8] shadow-2xs divide-y divide-[#f1f5f9] overflow-hidden'>
                                {/* 1. Devices & Apps */}
                                <div
                                    onClick={() => { void message.info('2 devices connected: Apple Health & Oura Ring') }}
                                    className='p-4 flex items-center justify-between cursor-pointer hover:bg-[#f8faf9] active:bg-[#f1f5f3] transition-colors'
                                >
                                    <div className='flex items-center gap-3.5'>
                                        <div className='w-10 h-10 rounded-full bg-[#f1f5f9] text-[#64748b] flex items-center justify-center text-lg shrink-0'>
                                            <LaptopOutlined/>
                                        </div>
                                        <div className='flex flex-col'>
                                            <span className='text-sm font-bold text-[#192823]'>
                                                Devices & Apps
                                            </span>
                                            <span className='text-xs text-[#64748b]'>
                                                2 connected
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRightOutlined className='text-xs text-[#94a3b8]'/>
                                </div>

                                {/* 2. File Uploads (Clicking opens Screenshot 2) */}
                                <div
                                    onClick={() => { setMobileScreen('upload_files') }}
                                    className='p-4 flex items-center justify-between cursor-pointer hover:bg-[#f8faf9] active:bg-[#f1f5f3] transition-colors'
                                >
                                    <div className='flex items-center gap-3.5'>
                                        <div className='w-10 h-10 rounded-full bg-[#f1f5f9] text-[#64748b] flex items-center justify-center text-lg shrink-0'>
                                            <FileTextOutlined/>
                                        </div>
                                        <div className='flex flex-col'>
                                            <span className='text-sm font-bold text-[#192823]'>
                                                File Uploads
                                            </span>
                                            <span className='text-xs text-[#64748b]'>
                                                {allFiles.length} file{allFiles.length === 1 ? '' : 's'} uploaded
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRightOutlined className='text-xs text-[#94a3b8]'/>
                                </div>

                                {/* 3. Data Imports */}
                                <div
                                    onClick={() => { void message.info('Data Imports: no files imported') }}
                                    className='p-4 flex items-center justify-between cursor-pointer hover:bg-[#f8faf9] active:bg-[#f1f5f3] transition-colors'
                                >
                                    <div className='flex items-center gap-3.5'>
                                        <div className='w-10 h-10 rounded-full bg-[#f1f5f9] text-[#64748b] flex items-center justify-center text-lg shrink-0'>
                                            <CloudUploadOutlined/>
                                        </div>
                                        <div className='flex flex-col'>
                                            <span className='text-sm font-bold text-[#192823]'>
                                                Data Imports
                                            </span>
                                            <span className='text-xs text-[#64748b]'>
                                                no files imported
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRightOutlined className='text-xs text-[#94a3b8]'/>
                                </div>

                                {/* 4. Health Systems */}
                                <div
                                    onClick={() => { void message.info('Health Systems: none connected') }}
                                    className='p-4 flex items-center justify-between cursor-pointer hover:bg-[#f8faf9] active:bg-[#f1f5f3] transition-colors'
                                >
                                    <div className='flex items-center gap-3.5'>
                                        <div className='w-10 h-10 rounded-full bg-[#f1f5f9] text-[#64748b] flex items-center justify-center text-lg shrink-0'>
                                            <BankOutlined/>
                                        </div>
                                        <div className='flex flex-col'>
                                            <span className='text-sm font-bold text-[#192823]'>
                                                Health Systems
                                            </span>
                                            <span className='text-xs text-[#64748b]'>
                                                none connected
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRightOutlined className='text-xs text-[#94a3b8]'/>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Footer matching Screenshot 1 */}
                        <div className='mt-8 text-center text-xs text-[#94a3b8] flex flex-col items-center gap-2.5 px-6'>
                            <span className='font-medium text-[#64748b]'>Guava Health, Inc.</span>
                            <div className='flex items-center gap-3 text-[#64748b] flex-wrap justify-center'>
                                <span>home</span>
                                <span>health resources</span>
                                <span>privacy</span>
                            </div>
                            <div className='flex items-center gap-3 text-[#64748b]'>
                                <span>terms of service</span>
                                <span>careers</span>
                            </div>
                            <button
                                type='button'
                                onClick={() => { void message.info('Help & Feedback dialog') }}
                                className='mt-2 inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-[#cbd5e1] bg-white text-[#475569] text-xs font-semibold shadow-2xs'
                            >
                                <QuestionCircleOutlined/>
                                <span>Help & Feedback</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MOBILE SCREEN 2: UPLOAD FILES (Screenshot 2)                  */}
                {/* ------------------------------------------------------------- */}
                {mobileScreen === 'upload_files' && (
                    <div className='flex flex-col w-full'>
                        {/* Header: Back arrow + Upload Files */}
                        <div className='h-14 px-4 bg-white border-b border-[#e5ece8] flex items-center gap-3 sticky top-0 z-30 shadow-2xs'>
                            <button
                                type='button'
                                onClick={() => { setMobileScreen('sources_home') }}
                                className='text-[#64748b] hover:text-[#0f172a] p-1 -ml-1'
                            >
                                <ArrowLeftOutlined className='text-base'/>
                            </button>
                            <h1 className='text-lg font-bold text-[#0f172a] tracking-tight'>
                                Upload Files
                            </h1>
                        </div>

                        <div className='p-4 flex flex-col gap-5'>
                            {/* Dashed Green Drop Area */}
                            <div
                                onClick={handleAddImages}
                                className='border-2 border-dashed border-[#10b981] bg-[#f0fdf4] rounded-2xl py-8 px-4 flex flex-col items-center justify-center gap-2.5 cursor-pointer active:bg-[#e6fcf0] transition-colors shadow-2xs'
                            >
                                <div className='w-12 h-14 rounded-lg bg-[#007a55] text-white flex items-center justify-center shadow-xs'>
                                    <FileTextOutlined className='text-2xl'/>
                                </div>
                                <span className='text-sm font-bold text-[#0f172a] text-center'>
                                    Select a file to upload
                                </span>
                            </div>

                            {/* Purple AI digitization banner */}
                            <div className='flex items-center gap-2 text-xs text-[#5b21b6] font-medium'>
                                <span className='text-base text-[#7c3aed]'>✨</span>
                                <span>Guava automatically digitizes your lab reports and documents</span>
                                <InfoCircleOutlined className='text-xs text-[#7c3aed]'/>
                            </div>

                            {/* Supported Types List */}
                            <div className='flex flex-col gap-2.5 pt-1'>
                                <span className='text-xs font-bold text-[#334155]'>
                                    Supported Types:
                                </span>
                                <div className='flex flex-col gap-2'>
                                    <div className='flex items-center gap-3 text-xs text-[#334155]'>
                                        <span className='px-1.5 py-0.5 rounded bg-[#ef4444] text-white text-[10px] font-bold'>
                                            PDF
                                        </span>
                                        <span>PDFs (e.g. Labs, Visit Notes)</span>
                                    </div>
                                    <div className='flex items-center gap-3 text-xs text-[#334155]'>
                                        <div className='w-6 h-6 rounded bg-[#2563eb] text-white flex items-center justify-center text-xs'>
                                            <PictureOutlined/>
                                        </div>
                                        <span>Photos, Document Images, and Videos</span>
                                    </div>
                                    <div className='flex items-center gap-3 text-xs text-[#334155]'>
                                        <div className='w-6 h-6 rounded bg-[#475569] text-white flex items-center justify-center text-xs font-bold'>
                                            🦴
                                        </div>
                                        <span>DICOM Imaging (e.g. X-rays, MRIs)</span>
                                        <InfoCircleOutlined className='text-[11px] text-[#94a3b8]'/>
                                    </div>
                                    <div className='flex items-center gap-3 text-xs text-[#334155]'>
                                        <div className='w-6 h-6 rounded bg-[#64748b] text-white flex items-center justify-center text-xs'>
                                            <FileTextOutlined/>
                                        </div>
                                        <span>CCDA Documents (XML)</span>
                                        <InfoCircleOutlined className='text-[11px] text-[#94a3b8]'/>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Documents Section (Clicking navigates to Screenshot 3) */}
                            <div className='flex flex-col gap-2.5 pt-3'>
                                <h2 className='text-base font-bold text-[#0f172a]'>
                                    Recent Documents
                                </h2>
                                {allFiles.length > 0 ? (
                                    allFiles.map((doc) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => {
                                                setSelectedFileId(doc.id)
                                                setMobileScreen('document_details')
                                            }}
                                            className='rounded-2xl border border-[#e5ece8] bg-white p-4 flex items-center gap-3.5 cursor-pointer shadow-2xs hover:bg-[#f8faf9] active:bg-[#f1f5f3] transition-colors'
                                        >
                                            <div className='w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center text-lg shrink-0 shadow-xs'>
                                                <PictureOutlined/>
                                            </div>
                                            <div className='flex flex-col min-w-0 flex-1'>
                                                <span className='text-sm font-bold text-[#0f172a] truncate'>
                                                    {doc.name}
                                                </span>
                                                <span className='text-xs text-[#64748b]'>
                                                    {doc.uploadDate || doc.size}
                                                </span>
                                            </div>
                                            <ChevronRightOutlined className='text-xs text-[#94a3b8] shrink-0'/>
                                        </div>
                                    ))
                                ) : (
                                    <div className='p-4 text-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white text-xs text-[#64748b]'>
                                        No recent documents uploaded yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MOBILE SCREEN 3: DOCUMENT DETAILS & RESULTS (Screenshot 3)    */}
                {/* ------------------------------------------------------------- */}
                {mobileScreen === 'document_details' && (
                    <div className='flex flex-col w-full'>
                        {/* Header: Back arrow + Edit Document + Action icon */}
                        <div className='h-14 px-4 bg-white border-b border-[#e5ece8] flex items-center justify-between sticky top-0 z-30 shadow-2xs'>
                            <div className='flex items-center gap-3'>
                                <button
                                    type='button'
                                    onClick={() => { setMobileScreen('upload_files') }}
                                    className='text-[#64748b] hover:text-[#0f172a] p-1 -ml-1'
                                >
                                    <ArrowLeftOutlined className='text-base'/>
                                </button>
                                <h1 className='text-lg font-bold text-[#0f172a] tracking-tight'>
                                    Edit Document
                                </h1>
                            </div>
                            <button
                                type='button'
                                onClick={() => { void message.info('Share link copied') }}
                                className='text-[#64748b] p-1'
                            >
                                <ShareAltOutlined className='text-base'/>
                            </button>
                        </div>

                        <div className='p-4 flex flex-col gap-6'>
                            {/* Attached Files List */}
                            <div className='bg-white rounded-2xl border border-[#e5ece8] p-4 flex flex-col gap-2.5 shadow-2xs'>
                                <span className='text-xs font-bold text-[#64748b] uppercase tracking-wider'>
                                    Files
                                </span>
                                <div className='divide-y divide-[#f1f5f9]'>
                                    {allFiles.map((f) => {
                                        const isSelected = f.id === currentSelectedFile?.id
                                        return (
                                            <div
                                                key={f.id}
                                                onClick={() => {
                                                    setSelectedFileId(f.id)
                                                    if (f.date) setDocDate(f.date)
                                                    if (f.provider) setProviderName(f.provider)
                                                    if (f.notes !== undefined) setNotes(f.notes)
                                                }}
                                                className={`py-2 px-2.5 rounded-lg flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-[#e8f5f1] text-[#007a55] font-semibold border-l-4 border-l-[#007a55]'
                                                        : 'text-[#0f172a] hover:bg-[#f8faf9]'
                                                }`}
                                            >
                                                <div className='flex items-center gap-2 min-w-0'>
                                                    <FileTextOutlined className={isSelected ? 'text-[#007a55]' : 'text-[#64748b]'}/>
                                                    <span className='truncate max-w-[200px]'>
                                                        {f.name}
                                                    </span>
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleInitiateDelete(f)
                                                    }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1'
                                                    title='Delete file'
                                                >
                                                    <DeleteOutlined/>
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                                <button
                                    type='button'
                                    onClick={handleAddImages}
                                    className='text-xs font-bold text-[#007a55] hover:underline flex items-center gap-1 pt-1'
                                >
                                    <PlusOutlined className='text-[10px]'/>
                                    <span>Add more images</span>
                                </button>
                            </div>

                            {/* Document Preview Thumbnail & Visual viewer link */}
                            <div className='bg-white rounded-2xl border border-[#e5ece8] p-4 flex flex-col gap-2.5 shadow-2xs'>
                                <div className='flex items-center justify-between text-xs font-bold text-[#0f172a]'>
                                    <span className='truncate'>{currentSelectedFile?.name ?? 'Document Preview'}</span>
                                    <span className='text-[10px] text-[#007a55] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200'>
                                        Page {activeFileIndex >= 0 ? activeFileIndex + 1 : 1} of {allFiles.length}
                                    </span>
                                </div>
                                <div
                                    onClick={() => { setMobileScreen('parameter_preview') }}
                                    className='relative rounded-xl border border-[#cbd5e1] overflow-hidden cursor-pointer shadow-2xs'
                                >
                                    <img
                                        src={currentSelectedFile?.previewImage ?? '/sample-lab-report.png'}
                                        alt={currentSelectedFile?.name ?? 'Lab scan'}
                                        className='w-full h-auto object-cover max-h-56'
                                    />
                                </div>
                                <button
                                    type='button'
                                    onClick={() => { setMobileScreen('parameter_preview') }}
                                    className='text-xs font-bold text-[#2563eb] hover:underline text-left'
                                >
                                    Highlight all in visual viewer
                                </button>
                            </div>

                            {/* Document Details Form */}
                            <div className='bg-white rounded-2xl border border-[#e5ece8] p-4 flex flex-col gap-3.5 shadow-2xs'>
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Document Date</label>
                                    <input
                                        type='text'
                                        value={docDate}
                                        onChange={(e) => { setDocDate(e.target.value) }}
                                        className='w-full px-3 py-2 rounded-xl border border-[#cbd5e1] text-xs font-medium text-[#0f172a]'
                                    />
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Document Provider</label>
                                    <input
                                        type='text'
                                        value={providerName}
                                        onChange={(e) => { setProviderName(e.target.value) }}
                                        className='w-full px-3 py-2 rounded-xl border border-[#cbd5e1] text-xs font-medium text-[#0f172a]'
                                    />
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Notes</label>
                                    <textarea
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => { setNotes(e.target.value) }}
                                        placeholder='optional'
                                        className='w-full px-3 py-2 rounded-xl border border-[#cbd5e1] text-xs text-[#0f172a]'
                                    />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-semibold text-[#475569]'>Document Category (0)</label>
                                    <div className='flex items-center gap-5'>
                                        <label className='flex items-center gap-2 text-xs text-[#334155]'>
                                            <input
                                                type='checkbox'
                                                checked={categoryDiagnostic}
                                                onChange={(e) => { setCategoryDiagnostic(e.target.checked) }}
                                                className='accent-[#007a55]'
                                            />
                                            <span>Diagnostic</span>
                                        </label>
                                        <label className='flex items-center gap-2 text-xs text-[#334155]'>
                                            <input
                                                type='checkbox'
                                                checked={categoryRecords}
                                                onChange={(e) => { setCategoryRecords(e.target.checked) }}
                                                className='accent-[#007a55]'
                                            />
                                            <span>Records</span>
                                        </label>
                                    </div>
                                </div>
                                <div className='flex items-center justify-end gap-4 pt-2'>
                                    <button
                                        type='button'
                                        onClick={handleCancelDoc}
                                        className='text-xs font-bold text-[#ef4444]'
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type='button'
                                        onClick={handleSaveDoc}
                                        className='px-6 py-2 rounded-lg bg-[#007a55] text-white text-xs font-bold'
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>

                            {/* Purple AI Extraction Card */}
                            <div className='flex flex-col gap-3'>
                                <div className='border border-purple-200 bg-[#faf5ff] text-[#6b21a8] text-xs p-3 rounded-xl font-medium'>
                                    Want to extract values from this document to track on biomarkers or other records? Run the AI tool to auto-organize your report.
                                </div>
                                <div className='bg-[#ede9fe]/50 border border-[#ddd6fe] rounded-2xl p-4 flex flex-col gap-3 shadow-2xs'>
                                    <div className='flex items-center gap-3'>
                                        <div className='w-9 h-9 rounded-full bg-[#7c3aed] text-white flex items-center justify-center text-sm'>
                                            ✨
                                        </div>
                                        <div className='flex flex-col'>
                                            <span className='text-sm font-bold text-[#4c1d95]'>
                                                Extracted Records ({totalExtractedCount})
                                            </span>
                                            <span className='text-xs text-[#7c3aed]'>
                                                4 pages scanned
                                            </span>
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-2'>
                                        <div className='flex items-center justify-between gap-3 text-xs font-medium text-[#5b21b6]'>
                                            <span className='w-20'>Vitals</span>
                                            <div className='flex-1 h-2 rounded-full bg-[#ddd6fe] overflow-hidden'>
                                                <div className='h-full bg-[#7c3aed] w-full'/>
                                            </div>
                                            <CheckCircleFilled className='text-[#7c3aed]'/>
                                        </div>
                                        <div className='flex items-center justify-between gap-3 text-xs font-medium text-[#5b21b6]'>
                                            <span className='w-20'>Conditions</span>
                                            <div className='flex-1 h-2 rounded-full bg-[#ddd6fe] overflow-hidden'>
                                                <div className='h-full bg-[#7c3aed] w-full'/>
                                            </div>
                                            <CheckCircleFilled className='text-[#7c3aed]'/>
                                        </div>
                                        <div className='flex items-center justify-between gap-3 text-xs font-medium text-[#5b21b6]'>
                                            <span className='w-20'>Screening</span>
                                            <div className='flex-1 h-2 rounded-full bg-[#ddd6fe] overflow-hidden'>
                                                <div className='h-full bg-[#7c3aed] w-full'/>
                                            </div>
                                            <CheckCircleFilled className='text-[#7c3aed]'/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Extracted Biomarker Groups (Clicking any row opens Screenshot 4) */}
                            <div className='flex flex-col gap-6'>
                                {activeLabGroups.length === 0 ? (
                                    <div className='rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-6 text-center text-xs text-[#64748b]'>
                                        No extracted biomarker records found for this document.
                                    </div>
                                ) : (
                                    activeLabGroups.map((group) => (
                                        <div key={group.id} className='flex flex-col gap-1.5'>
                                            <div className='flex items-baseline justify-between px-1'>
                                                <h3 className='text-xs font-bold text-[#0f172a] uppercase tracking-wider'>
                                                    {group.title}
                                                </h3>
                                                <span className='text-[11px] text-[#64748b]'>
                                                    {group.date}
                                                </span>
                                            </div>
                                            <div className='bg-white rounded-2xl border border-[#e5ece8] divide-y divide-[#f1f5f9] overflow-hidden shadow-2xs'>
                                                {group.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => { handleOpenParamPreview(item) }}
                                                        className='p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#f8faf9] active:bg-[#f1f5f3] transition-colors'
                                                    >
                                                        <div className='flex flex-col gap-0.5 min-w-0 pr-2'>
                                                            <div className='flex items-center gap-1.5'>
                                                                <span className='font-bold text-xs text-[#0f172a] truncate'>
                                                                    {item.name}
                                                                </span>
                                                                {item.isAuto && (
                                                                    <span className='px-1 py-0.2 rounded text-[9px] font-bold bg-[#eff6ff] text-[#2563eb]'>
                                                                        Auto
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className='flex items-center gap-2 text-xs'>
                                                                <span className='font-bold text-[#0f172a]'>
                                                                    {item.value} {item.unit}
                                                                </span>
                                                                {item.refRange && (
                                                                    <span className='font-mono text-[11px] text-[#64748b]'>
                                                                        [{item.refRange}]
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ChevronRightOutlined className='text-xs text-[#94a3b8] shrink-0'/>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MOBILE SCREEN 4: PARAMETER PREVIEW & BOUNDING BOX (Screenshot 4) */}
                {/* ------------------------------------------------------------- */}
                {mobileScreen === 'parameter_preview' && currentActiveParam && (
                    <div className='flex flex-col w-full min-h-screen bg-[#1e293b] text-white relative'>
                        {/* Header: Back arrow + File Preview */}
                        <div className='h-14 px-4 bg-[#0f172a] text-white flex items-center justify-between sticky top-0 z-40 border-b border-white/10'>
                            <div className='flex items-center gap-3'>
                                <button
                                    type='button'
                                    onClick={() => { setMobileScreen('document_details') }}
                                    className='text-white hover:opacity-80 p-1 -ml-1'
                                >
                                    <ArrowLeftOutlined className='text-base'/>
                                </button>
                                <h1 className='text-base font-bold text-white tracking-tight'>
                                    File Preview
                                </h1>
                            </div>
                        </div>

                        {/* Scanned Lab Report View with Bounding Box Overlay */}
                        <div className='relative w-full overflow-hidden bg-black flex items-center justify-center pb-64'>
                            <div className='relative w-full max-w-lg'>
                                <img
                                    src='/sample-lab-report.png'
                                    alt='Lab scan page'
                                    className='w-full h-auto object-contain select-none'
                                />

                                {/* DYNAMIC BOUNDING BOX OVER THE EXTRACTED PARAMETER */}
                                <div
                                    className='absolute border-2 border-[#3b82f6] bg-[#3b82f6]/30 rounded-xs pointer-events-none transition-all duration-300 shadow-md'
                                    style={{
                                        top: activeBoundingBox.top,
                                        left: activeBoundingBox.left,
                                        width: activeBoundingBox.width,
                                        height: activeBoundingBox.height,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Floating Bottom Card matching Screenshot 4 */}
                        <div className='fixed bottom-14 left-0 right-0 z-40 p-3 pointer-events-auto'>
                            <div className='bg-white text-[#192823] rounded-2xl border border-[#cbd5e1] p-4 shadow-xl flex flex-col gap-3.5 max-w-md mx-auto'>
                                {/* Top navigation: < 5 / 59 > ⊕ */}
                                <div className='flex items-center justify-between border-b border-[#f1f5f9] pb-2.5'>
                                    <button
                                        type='button'
                                        onClick={() => {
                                            setFocusedParamIndex((prev) => Math.max(0, prev - 1))
                                        }}
                                        disabled={focusedParamIndex <= 0}
                                        className='p-1 text-[#64748b] hover:text-[#007a55] disabled:opacity-30'
                                    >
                                        <LeftOutlined className='text-sm'/>
                                    </button>

                                    <span className='text-sm font-bold text-[#0f172a]'>
                                        {focusedParamIndex + 1} / {allFlatParams.length}
                                    </span>

                                    <button
                                        type='button'
                                        onClick={() => {
                                            setFocusedParamIndex((prev) => Math.min(allFlatParams.length - 1, prev + 1))
                                        }}
                                        disabled={focusedParamIndex >= allFlatParams.length - 1}
                                        className='p-1 text-[#64748b] hover:text-[#007a55] disabled:opacity-30'
                                    >
                                        <RightOutlined className='text-sm'/>
                                    </button>

                                    <button
                                        type='button'
                                        onClick={() => { setIsAddRecordModalOpen(true) }}
                                        className='text-[#64748b] hover:text-[#007a55] p-1'
                                        title='Add measurement'
                                    >
                                        <PlusCircleOutlined className='text-lg'/>
                                    </button>
                                </div>

                                {/* Measurement Badge */}
                                <div className='flex items-center gap-1.5 text-xs font-semibold text-[#007a55]'>
                                    <span>🧪</span>
                                    <span>Measurement</span>
                                </div>

                                {/* Parameter Name & Edit button */}
                                <div className='flex items-start justify-between'>
                                    <div className='flex flex-col'>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-lg font-bold text-[#0f172a]'>
                                                {currentActiveParam.name}
                                            </span>
                                            <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e0f2fe] text-[#0284c7]'>
                                                NEW
                                            </span>
                                        </div>
                                        <span className='text-base font-bold text-[#0f172a] mt-0.5'>
                                            {currentActiveParam.value} {currentActiveParam.unit}
                                        </span>
                                        {currentActiveParam.refRange && (
                                            <span className='text-xs font-mono text-[#64748b] mt-0.5'>
                                                [{currentActiveParam.refRange}] • Jan 6, 2024
                                            </span>
                                        )}
                                    </div>

                                    {/* ✎ edit button opens Screenshot 5 */}
                                    <button
                                        type='button'
                                        onClick={handleOpenMobileEditModal}
                                        className='px-3.5 py-1.5 rounded-full border border-[#cbd5e1] text-xs font-bold text-[#334155] hover:bg-[#f8faf9] flex items-center gap-1.5 shadow-2xs'
                                    >
                                        <EditOutlined className='text-xs'/>
                                        <span>edit</span>
                                    </button>
                                </div>

                                {/* Mark Incorrect Button */}
                                <div className='flex justify-center pt-1'>
                                    <button
                                        type='button'
                                        onClick={() => {
                                            void message.info('Flagged measurement for review')
                                        }}
                                        className='px-6 py-1.5 rounded-full border border-[#f87171] text-[#ef4444] text-xs font-bold hover:bg-[#fef2f2] transition-colors shadow-2xs'
                                    >
                                        Mark Incorrect
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* MOBILE SCREEN 5: EDIT PARAMETER MODAL (Screenshot 5)          */}
                {/* ------------------------------------------------------------- */}
                <Modal
                    open={isEditParamModalOpen}
                    onCancel={() => { setIsEditParamModalOpen(false) }}
                    footer={null}
                    centered
                    width='92%'
                    destroyOnClose
                >
                    <div className='flex flex-col gap-4 py-1 text-[#192823]'>
                        {/* Header: Date + Time + Close */}
                        <div className='flex items-center justify-between border-b border-[#f1f5f9] pb-3'>
                            <div className='flex items-center gap-2'>
                                <span className='px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[11px] font-bold text-[#475569] flex items-center gap-1'>
                                    <CalendarOutlined/>
                                    <span>Sat, Jan 6, 2024</span>
                                </span>
                                <span className='px-2.5 py-1 rounded-full bg-[#f1f5f9] text-[11px] font-bold text-[#475569]'>
                                    6:32am
                                </span>
                            </div>
                            <button
                                type='button'
                                onClick={() => { setIsEditParamModalOpen(false) }}
                                className='text-[#94a3b8] hover:text-[#0f172a] p-1'
                            >
                                <CloseOutlined className='text-xs'/>
                            </button>
                        </div>

                        {/* Title row: Name + change */}
                        <div className='flex items-center gap-3'>
                            <span className='text-base font-bold text-[#0f172a]'>
                                {currentActiveParam?.name}
                            </span>
                            <button
                                type='button'
                                onClick={() => { void message.info('Select different biomarker name') }}
                                className='px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[10px] font-bold text-[#475569] hover:bg-[#e2e8f0]'
                            >
                                change
                            </button>
                        </div>

                        {/* Value input row */}
                        <div className='flex items-center gap-2'>
                            <div className='w-9 h-9 rounded-lg border border-[#cbd5e1] flex items-center justify-center text-xs font-bold text-[#475569] bg-[#f8fafc]'>
                                =
                            </div>
                            <input
                                type='text'
                                value={editParamValue}
                                onChange={(e) => { setEditParamValue(e.target.value) }}
                                className='flex-1 px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm font-bold text-[#0f172a]'
                            />
                            <div className='px-3 py-2 rounded-lg border border-[#cbd5e1] text-xs font-bold text-[#475569] bg-[#f8fafc]'>
                                {editParamUnit} ▾
                            </div>
                        </div>

                        {/* Reference Range row */}
                        <div className='flex flex-col gap-1.5'>
                            <span className='text-xs text-[#64748b] font-medium'>
                                reference range:
                            </span>
                            <div className='flex items-center gap-2'>
                                <input
                                    type='text'
                                    value={editParamMin}
                                    onChange={(e) => { setEditParamMin(e.target.value) }}
                                    className='w-20 px-2.5 py-1.5 rounded-lg border border-[#cbd5e1] text-xs text-center font-medium'
                                />
                                <span className='text-xs text-[#64748b]'>to</span>
                                <input
                                    type='text'
                                    value={editParamMax}
                                    onChange={(e) => { setEditParamMax(e.target.value) }}
                                    className='w-20 px-2.5 py-1.5 rounded-lg border border-[#cbd5e1] text-xs text-center font-medium'
                                />
                                <button
                                    type='button'
                                    onClick={() => {
                                        setEditParamMin('')
                                        setEditParamMax('')
                                    }}
                                    className='p-1 text-[#94a3b8] hover:text-[#ef4444]'
                                >
                                    <CloseOutlined className='text-xs'/>
                                </button>
                            </div>
                        </div>

                        {/* + Note */}
                        <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-1 text-xs font-semibold text-[#64748b]'>
                                <PlusOutlined className='text-[10px]'/>
                                <span>Note</span>
                            </div>
                            <input
                                type='text'
                                value={editParamNotes}
                                onChange={(e) => { setEditParamNotes(e.target.value) }}
                                placeholder='Add notes'
                                className='w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-lg'
                            />
                        </div>

                        {/* Actions: Cancel & Save */}
                        <div className='flex items-center justify-between pt-3 border-t border-[#f1f5f9]'>
                            <button
                                type='button'
                                onClick={() => { setIsEditParamModalOpen(false) }}
                                className='text-xs font-bold text-[#64748b] hover:text-[#0f172a]'
                            >
                                Cancel
                            </button>
                            <button
                                type='button'
                                onClick={handleSaveMobileParamEdit}
                                className='px-6 py-2 rounded-lg bg-[#007a55] hover:bg-[#006244] text-white text-xs font-bold shadow-xs'
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP VIEW (>=1024px) - EXACT REPLICA OF THE DESKTOP SOURCES TAB        */}
            {/* ========================================================================= */}
            <div className='hidden lg:block max-w-[1360px] mx-auto px-6 py-6'>
                <div className='grid grid-cols-12 gap-8 items-start'>
                    {/* LEFT SIDEBAR NAVIGATION RAIL */}
                    <div className='col-span-3 flex flex-col gap-2'>
                        {/* 1. Devices & Apps */}
                        <button
                            type='button'
                            onClick={() => { setSelectedCategory('devices') }}
                            className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center gap-3.5 border ${
                                selectedCategory === 'devices'
                                    ? 'bg-[#e8f5f1] border-[#a7f3d0] text-[#007a55]'
                                    : 'bg-white border-[#e5ece8] text-[#192823] hover:bg-[#f1f5f3]'
                            }`}
                        >
                            <div className='w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 bg-[#f1f5f9] text-[#64748b]'>
                                <LaptopOutlined/>
                            </div>
                            <div className='flex flex-col min-w-0'>
                                <span className='text-sm font-bold truncate text-[#192823]'>
                                    Devices & Apps
                                </span>
                                <span className='text-xs text-[#64748b]'>0 connected</span>
                            </div>
                        </button>

                        {/* 2. File Uploads (Active by default in screenshot) */}
                        <button
                            type='button'
                            onClick={() => { setSelectedCategory('uploads') }}
                            className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center gap-3.5 border ${
                                selectedCategory === 'uploads'
                                    ? 'bg-[#e8f5f1] border-[#a7f3d0] text-[#007a55] shadow-xs'
                                    : 'bg-white border-[#e5ece8] text-[#192823] hover:bg-[#f1f5f3]'
                            }`}
                        >
                            <div className='w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 bg-[#007a55] text-white shadow-xs'>
                                <CheckOutlined className='text-base font-bold'/>
                            </div>
                            <div className='flex flex-col min-w-0'>
                                <span className='text-sm font-bold truncate text-[#0f172a]'>
                                    File Uploads
                                </span>
                                <span className='text-xs font-medium text-[#007a55]'>
                                    {allFiles.length} file{allFiles.length === 1 ? '' : 's'} uploaded
                                </span>
                            </div>
                        </button>

                        {/* 3. Patient Portals */}
                        <button
                            type='button'
                            onClick={() => { setSelectedCategory('portals') }}
                            className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center gap-3.5 border ${
                                selectedCategory === 'portals'
                                    ? 'bg-[#e8f5f1] border-[#a7f3d0] text-[#007a55]'
                                    : 'bg-white border-[#e5ece8] text-[#192823] hover:bg-[#f1f5f3]'
                            }`}
                        >
                            <div className='w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 bg-[#f1f5f9] text-[#64748b]'>
                                <BankOutlined/>
                            </div>
                            <div className='flex flex-col min-w-0'>
                                <span className='text-sm font-bold truncate text-[#192823]'>
                                    Patient Portals
                                </span>
                                <span className='text-xs text-[#64748b]'>0 connected</span>
                            </div>
                        </button>

                        {/* 4. Medical Records */}
                        <button
                            type='button'
                            onClick={() => { setSelectedCategory('records') }}
                            className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center gap-3.5 border ${
                                selectedCategory === 'records'
                                    ? 'bg-[#e8f5f1] border-[#a7f3d0] text-[#007a55]'
                                    : 'bg-white border-[#e5ece8] text-[#192823] hover:bg-[#f1f5f3]'
                            }`}
                        >
                            <div className='w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 bg-[#f1f5f9] text-[#64748b]'>
                                <FolderOpenOutlined/>
                            </div>
                            <div className='flex flex-col min-w-0'>
                                <span className='text-sm font-bold truncate text-[#192823]'>
                                    Medical Records
                                </span>
                                <span className='text-xs text-[#64748b]'>0 connected</span>
                            </div>
                        </button>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className='col-span-9 flex flex-col gap-6'>
                        {selectedCategory === 'uploads' ? (
                            allFiles.length === 0 ? (
                                <div className='bg-white rounded-2xl border border-[#e5ece8] p-10 sm:p-14 shadow-2xs flex flex-col items-center justify-center text-center gap-6'>
                                    <div className='w-16 h-16 rounded-full bg-[#f0fdf4] text-[#007a55] flex items-center justify-center text-3xl shadow-2xs border border-[#a7f3d0]'>
                                        <FileTextOutlined/>
                                    </div>
                                    <div className='flex flex-col gap-1 max-w-md'>
                                        <h2 className='text-xl font-bold text-[#0f172a]'>No Documents Uploaded Yet</h2>
                                        <p className='text-xs text-[#64748b] leading-relaxed'>
                                            Upload your medical reports, lab results, PDFs, or scanned test images to automatically track, organize, and extract biomarkers.
                                        </p>
                                    </div>
                                    <div className='flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#475569] font-medium'>
                                        <span className='px-2.5 py-1 rounded-full bg-[#f1f5f9] border border-[#e2e8f0]'>PDF Documents</span>
                                        <span className='px-2.5 py-1 rounded-full bg-[#f1f5f9] border border-[#e2e8f0]'>Lab Images (JPG, PNG)</span>
                                        <span className='px-2.5 py-1 rounded-full bg-[#f1f5f9] border border-[#e2e8f0]'>DICOM Imaging</span>
                                    </div>
                                    <button
                                        type='button'
                                        onClick={handleAddImages}
                                        className='px-6 py-2.5 rounded-xl bg-[#007a55] hover:bg-[#006244] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer'
                                    >
                                        <PlusOutlined/>
                                        <span>Select or Upload Document</span>
                                    </button>
                                </div>
                            ) : (
                                <div className='bg-white rounded-2xl border border-[#e5ece8] p-6 sm:p-8 shadow-2xs flex flex-col gap-7'>
                                    {/* Header: Back arrow + Edit Document + Action icon */}
                                    <div className='flex items-center justify-between border-b border-[#f1f5f9] pb-4'>
                                        <div className='flex items-center gap-3'>
                                            <button
                                                type='button'
                                                onClick={() => { void message.info('Back to documents') }}
                                                className='text-[#64748b] hover:text-[#192823] transition-colors p-1 -ml-1'
                                                title='Back'
                                            >
                                                <ArrowLeftOutlined className='text-base'/>
                                            </button>
                                            <h1 className='text-xl font-bold text-[#0f172a] tracking-tight'>
                                                Edit Document
                                            </h1>
                                        </div>
                                        <div className='flex items-center gap-2'>
                                            <button
                                                type='button'
                                                onClick={() => { void message.info('Share Document link copied') }}
                                                className='text-[#64748b] hover:text-[#007a55] p-2 rounded-full hover:bg-[#f1f5f9] transition-colors'
                                                title='Share document'
                                            >
                                                <ShareAltOutlined className='text-base'/>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Table: Attached Files List */}
                                    <div className='flex flex-col gap-2'>
                                        <div className='grid grid-cols-12 px-3 py-1.5 text-xs font-semibold text-[#64748b] border-b border-[#f1f5f9]'>
                                            <div className='col-span-6'>Name</div>
                                            <div className='col-span-3 text-center'>Upload Date</div>
                                            <div className='col-span-2 text-right'>Size</div>
                                            <div className='col-span-1 text-right'/>
                                        </div>

                                        <div className='divide-y divide-[#f8fafc]'>
                                            {allFiles.map((file) => {
                                                const isSelected = file.id === currentSelectedFile?.id
                                                return (
                                                    <div
                                                        key={file.id}
                                                        onClick={() => {
                                                            setSelectedFileId(file.id)
                                                            if (file.date) setDocDate(file.date)
                                                            if (file.provider) setProviderName(file.provider)
                                                            if (file.notes !== undefined) setNotes(file.notes)
                                                        }}
                                                        className={`grid grid-cols-12 px-3 py-2.5 items-center text-xs font-medium cursor-pointer rounded-lg transition-all ${
                                                            isSelected
                                                                ? 'bg-[#e8f5f1] text-[#007a55] font-semibold ring-1 ring-[#a7f3d0] border-l-4 border-l-[#007a55] shadow-2xs'
                                                                : 'text-[#192823] hover:bg-[#f8faf9]'
                                                        }`}
                                                    >
                                                        <div className='col-span-6 truncate flex items-center gap-2'>
                                                            <FileTextOutlined className={isSelected ? 'text-[#007a55]' : 'text-[#64748b]'}/>
                                                            <span className={`truncate ${isSelected ? 'font-bold text-[#007a55]' : 'text-[#0f172a]'}`}>
                                                                {file.name}
                                                            </span>
                                                            {isSelected && (
                                                                <span className='px-1.5 py-0.2 rounded-full bg-[#007a55] text-white text-[9px] font-bold shrink-0'>
                                                                    Selected
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className='col-span-3 text-center text-[#64748b]'>
                                                            {file.uploadDate}
                                                        </div>
                                                        <div className='col-span-2 text-right text-[#64748b]'>
                                                            {file.size}
                                                        </div>
                                                        <div className='col-span-1 text-right'>
                                                            <button
                                                                type='button'
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleInitiateDelete(file)
                                                                }}
                                                                className='text-[#94a3b8] hover:text-[#ef4444] p-1 rounded transition-colors cursor-pointer'
                                                                title='Delete file'
                                                            >
                                                                <DeleteOutlined/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <div className='pt-1'>
                                            <button
                                                type='button'
                                                onClick={handleAddImages}
                                                className='text-xs font-semibold text-[#007a55] hover:underline flex items-center gap-1.5'
                                            >
                                                <PlusOutlined className='text-[10px]'/>
                                                <span>Add more images</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Document Form with Scanned Report Preview */}
                                    <div className='grid grid-cols-12 gap-6 items-start pt-2 border-t border-[#f1f5f9]'>
                                        {/* Left: Scanned Document Thumbnail */}
                                        <div className='col-span-5 flex flex-col gap-2'>
                                            <div className='flex items-center justify-between text-xs font-bold text-[#0f172a] mb-0.5'>
                                                <span className='truncate'>{currentSelectedFile?.name ?? 'Document Preview'}</span>
                                                <span className='text-[11px] font-semibold text-[#007a55] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 shrink-0'>
                                                    Page {activeFileIndex >= 0 ? activeFileIndex + 1 : 1} of {allFiles.length}
                                                </span>
                                            </div>
                                            <div
                                                onClick={() => { setIsPreviewModalOpen(true) }}
                                                className='relative rounded-xl border border-[#e2e8f0] overflow-hidden group cursor-pointer bg-[#f8fafc] shadow-2xs hover:shadow-md transition-all'
                                                title='Click to expand File Preview'
                                            >
                                                {currentSelectedFile?.previewImage ? (
                                                    <img
                                                        src={currentSelectedFile.previewImage}
                                                        alt={currentSelectedFile.name ?? 'Document Scan Preview'}
                                                        className='w-full h-auto object-cover max-h-[360px] group-hover:scale-[1.02] transition-transform duration-200'
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLElement).style.display = 'none'
                                                        }}
                                                    />
                                                ) : (
                                                    <div className='w-full h-56 flex flex-col items-center justify-center bg-[#f8fafc] text-[#64748b] gap-3 p-6 text-center'>
                                                        <FileTextOutlined className='text-4xl text-[#94a3b8]'/>
                                                        <div className='flex flex-col gap-0.5'>
                                                            <span className='text-xs font-semibold text-[#334155]'>{currentSelectedFile?.name}</span>
                                                            <span className='text-[11px] text-[#94a3b8]'>{currentSelectedFile?.size}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2'>
                                                    <span>🔍 Click to preview & verify ({currentSelectedFile?.name})</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Document Details Form */}
                                        <div className='col-span-7 flex flex-col gap-4'>
                                            {/* Document Date */}
                                            <div className='flex flex-col gap-1.5'>
                                                <label className='text-xs font-semibold text-[#475569]'>
                                                    Document Date
                                                </label>
                                                <div className='relative'>
                                                    <input
                                                        type='text'
                                                        value={docDate || (currentSelectedFile?.date ?? '')}
                                                        onChange={(e) => { setDocDate(e.target.value) }}
                                                        placeholder='MM / DD / YYYY'
                                                        className='w-full px-3.5 py-2 rounded-xl bg-white border border-[#cbd5e1] text-xs font-medium text-[#0f172a] focus:outline-none focus:border-[#007a55]'
                                                    />
                                                    <CalendarOutlined className='absolute right-3.5 top-2.5 text-xs text-[#94a3b8]'/>
                                                </div>
                                            </div>

                                            {/* Document Provider */}
                                            <div className='flex flex-col gap-1.5'>
                                                <label className='text-xs font-semibold text-[#475569]'>
                                                    Document Provider
                                                </label>
                                                <input
                                                    type='text'
                                                    value={providerName || (currentSelectedFile?.provider ?? '')}
                                                    onChange={(e) => { setProviderName(e.target.value) }}
                                                    placeholder='e.g. Clinical Laboratory, Quest Diagnostics'
                                                    className='w-full px-3.5 py-2 rounded-xl bg-white border border-[#cbd5e1] text-xs font-medium text-[#0f172a] focus:outline-none focus:border-[#007a55]'
                                                />
                                            </div>

                                            {/* Notes (optional) */}
                                            <div className='flex flex-col gap-1.5'>
                                                <div className='flex items-center justify-between'>
                                                    <label className='text-xs font-semibold text-[#475569]'>
                                                        Notes
                                                    </label>
                                                    <span className='text-[11px] text-[#94a3b8] italic'>
                                                        optional
                                                    </span>
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    value={notes || (currentSelectedFile?.notes ?? '')}
                                                    onChange={(e) => { setNotes(e.target.value) }}
                                                    placeholder='optional'
                                                    className='w-full px-3.5 py-2 rounded-xl bg-white border border-[#cbd5e1] text-xs text-[#0f172a] focus:outline-none focus:border-[#007a55] resize-none'
                                                />
                                            </div>

                                            {/* Document Category (0) */}
                                            <div className='flex flex-col gap-2 pt-1'>
                                                <label className='text-xs font-semibold text-[#475569]'>
                                                    Document Category (0)
                                                </label>
                                                <div className='flex items-center gap-5'>
                                                    <label className='flex items-center gap-2 text-xs text-[#334155] cursor-pointer'>
                                                        <input
                                                            type='checkbox'
                                                            checked={categoryDiagnostic}
                                                            onChange={(e) => { setCategoryDiagnostic(e.target.checked) }}
                                                            className='accent-[#007a55] rounded'
                                                        />
                                                        <span>Diagnostic</span>
                                                    </label>
                                                    <label className='flex items-center gap-2 text-xs text-[#334155] cursor-pointer'>
                                                        <input
                                                            type='checkbox'
                                                            checked={categoryRecords}
                                                            onChange={(e) => { setCategoryRecords(e.target.checked) }}
                                                            className='accent-[#007a55] rounded'
                                                        />
                                                        <span>Records</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Action buttons: Cancel / Save */}
                                            <div className='flex items-center justify-end gap-4 pt-3'>
                                                <button
                                                    type='button'
                                                    onClick={handleCancelDoc}
                                                    className='text-xs font-bold text-[#ef4444] hover:underline'
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type='button'
                                                    onClick={handleSaveDoc}
                                                    className='px-6 py-2 rounded-lg bg-[#007a55] hover:bg-[#006244] text-white text-xs font-bold shadow-xs transition-colors'
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Purple AI Extraction Banner & Status Box */}
                                    <div className='flex flex-col gap-3 pt-2'>
                                        {/* Purple Notice Callout */}
                                        <div className='border border-purple-200 bg-[#faf5ff] text-[#6b21a8] text-xs px-4 py-2.5 rounded-xl font-medium'>
                                            Want to extract values from this document to track on biomarkers or other records? Run the AI tool to auto-organize your report.
                                        </div>

                                        {/* Purple AI Extraction Progress Card */}
                                        <div className='bg-[#ede9fe]/50 border border-[#ddd6fe] rounded-2xl p-4 sm:p-5 flex flex-col gap-4'>
                                            <div className='flex items-center justify-between'>
                                                <div className='flex items-center gap-3'>
                                                    <div className='w-9 h-9 rounded-full bg-[#7c3aed] text-white flex items-center justify-center text-sm shadow-xs shrink-0'>
                                                        ✨
                                                    </div>
                                                    <div className='flex flex-col'>
                                                        <span className='text-sm font-bold text-[#4c1d95]'>
                                                            Extracted Records ({activeExtractedCount})
                                                        </span>
                                                        <span className='text-xs text-[#7c3aed]'>
                                                            {currentSelectedFile?.name ?? 'Document'} • {activeExtractedCount} readings
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {activeExtractedCount > 0 ? (
                                            /* 3 Progress Bars: Vitals, Conditions, Screening */
                                                <div className='flex flex-col gap-2.5'>
                                                    <div className='flex items-center justify-between gap-4'>
                                                        <span className='text-xs font-medium text-[#5b21b6] w-24 shrink-0'>
                                                            Vitals
                                                        </span>
                                                        <div className='flex-1 h-2 rounded-full bg-[#ddd6fe] overflow-hidden'>
                                                            <div className='h-full bg-[#7c3aed] rounded-full w-full'/>
                                                        </div>
                                                        <CheckCircleFilled className='text-[#7c3aed] text-sm shrink-0'/>
                                                    </div>

                                                    <div className='flex items-center justify-between gap-4'>
                                                        <span className='text-xs font-medium text-[#5b21b6] w-24 shrink-0'>
                                                            Conditions
                                                        </span>
                                                        <div className='flex-1 h-2 rounded-full bg-[#ddd6fe] overflow-hidden'>
                                                            <div className='h-full bg-[#7c3aed] rounded-full w-full'/>
                                                        </div>
                                                        <CheckCircleFilled className='text-[#7c3aed] text-sm shrink-0'/>
                                                    </div>

                                                    <div className='flex items-center justify-between gap-4'>
                                                        <span className='text-xs font-medium text-[#5b21b6] w-24 shrink-0'>
                                                            Screening
                                                        </span>
                                                        <div className='flex-1 h-2 rounded-full bg-[#ddd6fe] overflow-hidden'>
                                                            <div className='h-full bg-[#7c3aed] rounded-full w-full'/>
                                                        </div>
                                                        <CheckCircleFilled className='text-[#7c3aed] text-sm shrink-0'/>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className='py-2 px-3 rounded-xl bg-purple-50/80 border border-purple-100 text-xs text-[#6b21a8] italic'>
                                                    No biomarker records extracted yet for this document. Run the AI tool to auto-organize your report.
                                                </div>
                                            )}
                                        </div>

                                        {/* Notice text & Add to group link */}
                                        <div className='flex flex-col gap-1 pt-1'>
                                            {activeExtractedCount > 0 && (
                                                <p className='text-xs text-[#64748b] italic'>
                                                    * All records have been verified or created. Need to make a change? Edit them below. If there are duplicates, you may delete them.
                                                </p>
                                            )}
                                            <div>
                                                <button
                                                    type='button'
                                                    onClick={() => { setIsAddRecordModalOpen(true) }}
                                                    className='text-xs font-semibold text-[#007a55] hover:underline inline-flex items-center gap-1'
                                                >
                                                    <PlusOutlined className='text-[10px]'/>
                                                    <span>Add to a record group</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Extracted Biomarkers Grouped by Lab Section */}
                                    <div className='flex flex-col gap-6 pt-2'>
                                        {activeLabGroups.length === 0 ? (
                                            <div className='rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 flex flex-col items-center justify-center text-center gap-2'>
                                                <div className='w-10 h-10 rounded-full bg-[#e2e8f0] flex items-center justify-center text-[#64748b] text-base'>
                                                    <FileTextOutlined/>
                                                </div>
                                                <span className='text-sm font-bold text-[#334155]'>No Records For This Document</span>
                                                <p className='text-xs text-[#64748b] max-w-xs m-0'>
                                                    No extracted biomarker records found for {currentSelectedFile?.name}.
                                                </p>
                                            </div>
                                        ) : (
                                            activeLabGroups.map((group) => (
                                                <div key={group.id} className='flex flex-col gap-1.5'>
                                                    {/* Section Header */}
                                                    <div className='flex items-baseline justify-between px-1'>
                                                        <h3 className='text-xs font-bold text-[#0f172a] uppercase tracking-wider'>
                                                            {group.title}
                                                        </h3>
                                                        <span className='text-[11px] text-[#64748b]'>
                                                            {group.date}
                                                        </span>
                                                    </div>

                                                    {/* Group Rows Container */}
                                                    <div className='bg-white rounded-xl border border-[#e2e8f0] divide-y divide-[#f1f5f9] overflow-hidden'>
                                                        {group.items.map((item) => {
                                                            const menuItems = [
                                                                {
                                                                    key: 'edit',
                                                                    label: 'Edit Value & Range',
                                                                    onClick: () => {
                                                                        setDesktopActiveParamId(item.id)
                                                                        handleStartDesktopEdit(item)
                                                                        setIsPreviewModalOpen(true)
                                                                    },
                                                                },
                                                                {
                                                                    key: 'preview',
                                                                    label: 'Highlight in Lab PDF',
                                                                    onClick: () => {
                                                                        setDesktopActiveParamId(item.id)
                                                                        setIsPreviewModalOpen(true)
                                                                    },
                                                                },
                                                                {
                                                                    key: 'delete',
                                                                    danger: true,
                                                                    label: 'Delete Record',
                                                                    onClick: () => { handleDeleteItem(item.id) },
                                                                },
                                                            ]

                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className='px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#f8faf9] transition-colors group'
                                                                >
                                                                    {/* Left: Biomarker Name + Auto tag */}
                                                                    <div className='flex items-center gap-2 min-w-0 pr-4'>
                                                                        <span className='font-medium text-[#0f172a] truncate'>
                                                                            {item.name}
                                                                        </span>
                                                                        {item.isAuto && (
                                                                            <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] shrink-0'>
                                                                                Auto
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Right: Value, Ref Range, ⋮ Action */}
                                                                    <div className='flex items-center gap-6 shrink-0'>
                                                                        <div className='text-right'>
                                                                            <span className='font-bold text-[#0f172a]'>
                                                                                {item.value}
                                                                            </span>
                                                                            {item.unit && (
                                                                                <span className='text-[#64748b] ml-1 text-[11px] font-medium'>
                                                                                    {item.unit}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className='w-24 text-right font-mono text-[11px] text-[#64748b] hidden sm:block'>
                                                                            {item.refRange ? `[ ${item.refRange} ]` : ''}
                                                                        </div>

                                                                        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                                                                            <button
                                                                                type='button'
                                                                                className='text-[#94a3b8] hover:text-[#0f172a] p-1 rounded-full hover:bg-[#f1f5f9] transition-colors'
                                                                            >
                                                                                <MoreOutlined className='text-sm'/>
                                                                            </button>
                                                                        </Dropdown>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )
                        ) : selectedCategory === 'devices' ? (
                            /* DEVICES & APPS VIEW */
                            <div className='bg-white rounded-2xl border border-[#e5ece8] p-6 sm:p-8 shadow-2xs flex flex-col gap-6'>
                                <div className='flex items-center justify-between border-b border-[#f1f5f9] pb-4'>
                                    <div>
                                        <h2 className='text-lg font-bold text-[#0f172a]'>
                                            Connected Devices & Wearables
                                        </h2>
                                        <p className='text-xs text-[#64748b]'>
                                            Sync live health metrics from your favorite smartwatch or ring.
                                        </p>
                                    </div>
                                </div>

                                <div className='grid grid-cols-2 gap-4'>
                                    {[
                                        {
                                            name: 'Apple Health',
                                            desc: 'Sync steps, sleep, heart rate & vitals',
                                            icon: '🍎',
                                        },
                                        {
                                            name: 'Fitbit',
                                            desc: 'Daily activity, resting HR and sleep stages',
                                            icon: '⌚',
                                        },
                                        {
                                            name: 'Oura Ring',
                                            desc: 'Sleep score, readiness, and nocturnal HRV',
                                            icon: '💍',
                                        },
                                        {
                                            name: 'Whoop 4.0',
                                            desc: 'Strain metrics, recovery and sleep debt',
                                            icon: '⚡',
                                        },
                                        {
                                            name: 'Garmin Connect',
                                            desc: 'Running workouts and VO2 max trends',
                                            icon: '🏃',
                                        },
                                        {
                                            name: 'Dexcom CGM',
                                            desc: 'Continuous interstitial glucose monitoring',
                                            icon: '📈',
                                        },
                                    ].map((dev, idx) => (
                                        <div
                                            key={idx}
                                            className='p-4 rounded-xl border border-[#e5ece8] bg-[#fbfdfc] flex items-center justify-between'
                                        >
                                            <div className='flex items-center gap-3'>
                                                <span className='text-2xl'>{dev.icon}</span>
                                                <div className='flex flex-col'>
                                                    <span className='text-sm font-bold text-[#0f172a]'>{dev.name}</span>
                                                    <span className='text-xs text-[#64748b]'>{dev.desc}</span>
                                                </div>
                                            </div>
                                            <button
                                                type='button'
                                                onClick={() => { void message.info(`Connecting to ${dev.name}...`) }}
                                                className='px-3 py-1.5 rounded-lg border border-[#007a55] text-[#007a55] hover:bg-[#e8f5f1] text-xs font-bold transition-colors'
                                            >
                                                Connect
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : selectedCategory === 'portals' ? (
                            /* PATIENT PORTALS VIEW */
                            <div className='bg-white rounded-2xl border border-[#e5ece8] p-6 sm:p-8 shadow-2xs flex flex-col gap-6'>
                                <div className='flex items-center justify-between border-b border-[#f1f5f9] pb-4'>
                                    <div>
                                        <h2 className='text-lg font-bold text-[#0f172a]'>
                                            Patient Portals & Lab Networks
                                        </h2>
                                        <p className='text-xs text-[#64748b]'>
                                            Connect hospital EHR portals and commercial lab accounts to pull test records automatically.
                                        </p>
                                    </div>
                                </div>

                                <div className='grid grid-cols-2 gap-4'>
                                    {[
                                        {
                                            name: 'Quest Diagnostics',
                                            desc: 'Automated retrieval of blood & urine lab tests',
                                        },
                                        {
                                            name: 'Labcorp',
                                            desc: 'Direct lab feed for comprehensive metabolic panels',
                                        },
                                        {
                                            name: 'Epic MyChart',
                                            desc: 'Integrate health records from over 2,000 hospital networks',
                                        },
                                        {
                                            name: 'Kaiser Permanente',
                                            desc: 'Electronic medical records & clinical notes feed',
                                        },
                                    ].map((portal, idx) => (
                                        <div
                                            key={idx}
                                            className='p-4 rounded-xl border border-[#e5ece8] bg-[#fbfdfc] flex items-center justify-between'
                                        >
                                            <div className='flex flex-col'>
                                                <span className='text-sm font-bold text-[#0f172a]'>{portal.name}</span>
                                                <span className='text-xs text-[#64748b]'>{portal.desc}</span>
                                            </div>
                                            <button
                                                type='button'
                                                onClick={() => { void message.info(`Linking ${portal.name}...`) }}
                                                className='px-3 py-1.5 rounded-lg border border-[#007a55] text-[#007a55] hover:bg-[#e8f5f1] text-xs font-bold transition-colors'
                                            >
                                                Link
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* MEDICAL RECORDS VIEW */
                            <div className='bg-white rounded-2xl border border-[#e5ece8] p-6 sm:p-8 shadow-2xs flex flex-col gap-6'>
                                <div className='border-b border-[#f1f5f9] pb-4'>
                                    <h2 className='text-lg font-bold text-[#0f172a]'>
                                        Clinical Summaries & History
                                    </h2>
                                    <p className='text-xs text-[#64748b]'>
                                        All historical diagnostic documents, imaging, and physical exams stored in your encrypted vault.
                                    </p>
                                </div>
                                <div className='p-6 rounded-xl bg-[#f8fafc] text-center flex flex-col items-center justify-center gap-2'>
                                    <FolderOpenOutlined className='text-3xl text-[#94a3b8]'/>
                                    <span className='text-sm font-semibold text-[#334155]'>
                                        {allFiles.length} Document Record{allFiles.length === 1 ? '' : 's'} Verified
                                    </span>
                                    <span className='text-xs text-[#64748b]'>
                                        {allFiles.length > 0 ? allFiles.map((f) => f.name).join(', ') : 'No historical documents stored in vault'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Guava Desktop Footer matching screenshot */}
                <div className='mt-16 text-center text-xs text-[#94a3b8] flex flex-col items-center gap-2'>
                    <div className='flex items-center gap-4 text-[#64748b]'>
                        <button
                            type='button'
                            onClick={() => { void message.info('Privacy Policy') }}
                            className='hover:underline'
                        >
                            Privacy Policy
                        </button>
                        <span>|</span>
                        <button
                            type='button'
                            onClick={() => { void message.info('Terms of Service') }}
                            className='hover:underline'
                        >
                            Terms of Service
                        </button>
                    </div>
                    <p>Guava Health does not provide medical advice. See terms for more.</p>
                    <button
                        type='button'
                        onClick={() => { void message.info('Feedback form opened') }}
                        className='mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc] text-xs font-semibold shadow-2xs transition-colors'
                    >
                        <span>💬 Help & Feedback</span>
                    </button>
                </div>
            </div>

            {/* FULL INTERACTIVE "FILE PREVIEW" MODAL FOR DESKTOP */}
            <Modal
                open={isPreviewModalOpen}
                onCancel={() => {
                    setIsPreviewModalOpen(false)
                    setDesktopEditingParam(null)
                }}
                footer={null}
                width='96%'
                style={{ top: 20 }}
                styles={{ body: { padding: 0 } }}
                destroyOnClose
            >
                <div className='flex flex-col h-[90vh] bg-[#0f172a]/95 rounded-2xl overflow-hidden relative'>
                    {/* Top Bar with File Preview title & floating tool capsule */}
                    <div className='h-16 px-6 flex items-center justify-between shrink-0 border-b border-white/10 relative'>
                        {/* Left: ← File Preview */}
                        <button
                            type='button'
                            onClick={() => {
                                setIsPreviewModalOpen(false)
                                setDesktopEditingParam(null)
                            }}
                            className='text-white hover:opacity-80 flex items-center gap-2.5 font-bold text-base transition-opacity'
                        >
                            <ArrowLeftOutlined className='text-base'/>
                            <span>File Preview</span>
                        </button>

                        {/* Center: Floating Capsule Toolbar matching Screenshot 1 */}
                        <div className='absolute left-1/2 -translate-x-1/2 bg-white rounded-full px-5 py-2 shadow-lg border border-[#e2e8f0] flex items-center gap-4 text-xs font-semibold text-[#1e293b]'>
                            <div className='flex items-center gap-2'>
                                <button
                                    type='button'
                                    onClick={() => { setPreviewPage((p) => Math.max(1, p - 1)) }}
                                    className='hover:text-[#007a55] p-0.5'
                                    title='Previous page'
                                >
                                    <LeftOutlined className='text-[10px]'/>
                                </button>
                                <span className='font-bold text-[#0f172a]'>
                                    Page {previewPage}/4
                                </span>
                                <button
                                    type='button'
                                    onClick={() => { setPreviewPage((p) => Math.min(4, p + 1)) }}
                                    className='hover:text-[#007a55] p-0.5'
                                    title='Next page'
                                >
                                    <RightOutlined className='text-[10px]'/>
                                </button>
                            </div>

                            <span className='text-xs text-[#94a3b8] hidden xl:inline'>
                                Tip: Navigate with arrow keys
                            </span>

                            <button
                                type='button'
                                onClick={() => {
                                    setHighlightAll((h) => !h)
                                    void message.info(!highlightAll ? 'Showing all biomarker highlights' : 'Focused highlight enabled')
                                }}
                                className={`px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                                    highlightAll
                                        ? 'border-[#007a55] bg-[#e8f5f1] text-[#007a55]'
                                        : 'border-[#cbd5e1] text-[#334155] hover:bg-[#f8fafc]'
                                }`}
                            >
                                Highlight all
                            </button>

                            <button
                                type='button'
                                onClick={() => {
                                    if (onAddResult) {
                                        onAddResult()
                                    } else {
                                        setIsAddRecordModalOpen(true)
                                    }
                                }}
                                className='px-4 py-1.5 rounded-full border border-[#cbd5e1] text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] flex items-center gap-1.5'
                            >
                                <PlusOutlined className='text-[10px]'/>
                                <span>Add result</span>
                            </button>
                        </div>

                        {/* Right: balance spacer */}
                        <div className='w-24'/>
                    </div>

                    {/* Split View: Left Document Image with Bounding Boxes | Right Extracted List & Floating Edit */}
                    <div className='flex-1 grid grid-cols-12 overflow-hidden bg-black/40 relative'>
                        {/* Left: Document Page View */}
                        <div className='col-span-8 overflow-y-auto p-6 flex items-center justify-center relative'>
                            <div className='relative max-w-full bg-white shadow-2xl rounded-sm'>
                                <img
                                    src='/sample-lab-report.png'
                                    alt='Lab Report Full Scan'
                                    className='max-h-[76vh] object-contain w-auto select-none'
                                />

                                {/* Highlight bounding box overlay(s) */}
                                {highlightAll ? (
                                    labGroups[0]?.items.map((item, idx) => {
                                        const box = getParamBoundingBox(item.name, idx)
                                        const isSelected = item.id === desktopActiveParamId
                                        return (
                                            <div
                                                key={item.id}
                                                className={`absolute border-2 rounded-xs pointer-events-none transition-all ${
                                                    isSelected
                                                        ? 'border-[#3b82f6] bg-[#3b82f6]/30 shadow-md'
                                                        : 'border-[#60a5fa] bg-[#60a5fa]/15'
                                                }`}
                                                style={{
                                                    top: box.top,
                                                    left: box.left,
                                                    width: box.width,
                                                    height: box.height,
                                                }}
                                            />
                                        )
                                    })
                                ) : (
                                    <div
                                        className='absolute border-2 border-[#3b82f6] bg-[#3b82f6]/30 rounded-xs pointer-events-none transition-all duration-300 shadow-md'
                                        style={{
                                            top: desktopSingleHighlightBox.top,
                                            left: desktopSingleHighlightBox.left,
                                            width: desktopSingleHighlightBox.width,
                                            height: desktopSingleHighlightBox.height,
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Right: Biomarker Values Sidebar with Floating Edit Card (Screenshot 1 & 2) */}
                        <div className='col-span-4 bg-white border-l border-[#e2e8f0] flex flex-col h-full overflow-hidden relative shadow-2xl'>
                            {/* Scrollable list of extracted parameters */}
                            <div className='flex-1 overflow-y-auto divide-y divide-[#f1f5f9]'>
                                {labGroups[0]?.items.map((item) => {
                                    const isSelected = item.id === desktopActiveParamId

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => { setDesktopActiveParamId(item.id) }}
                                            className={`p-4 transition-colors flex items-center justify-between cursor-pointer ${
                                                isSelected ? 'bg-[#e0f2fe]' : 'hover:bg-[#f8faf9]'
                                            }`}
                                        >
                                            <div className='flex items-start gap-3 min-w-0 pr-2'>
                                                <span className='text-sm text-[#007a55] mt-0.5 shrink-0'>🧪</span>
                                                <div className='flex flex-col min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='text-xs font-bold text-[#0f172a] truncate'>
                                                            {item.name}
                                                        </span>
                                                        <span className='text-[9px] font-bold px-1 rounded bg-[#e0f2fe] text-[#0284c7] shrink-0'>
                                                            NEW
                                                        </span>
                                                    </div>
                                                    <span className='text-xs font-bold text-[#0f172a] mt-0.5'>
                                                        {item.value} {item.unit}
                                                    </span>
                                                    {item.refRange && (
                                                        <span className='text-[11px] font-mono text-[#64748b] mt-0.5 truncate'>
                                                            [{item.refRange}] · Jan 6, 2024
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Circular action buttons matching Screenshot 1 */}
                                            <div className='flex items-center gap-2 shrink-0'>
                                                <button
                                                    type='button'
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setDesktopActiveParamId(item.id)
                                                        handleStartDesktopEdit(item)
                                                    }}
                                                    className='w-8 h-8 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] flex items-center justify-center text-[#475569] transition-colors shadow-2xs'
                                                    title='Edit record'
                                                >
                                                    <EditOutlined className='text-xs'/>
                                                </button>
                                                <button
                                                    type='button'
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteItem(item.id)
                                                    }}
                                                    className='w-8 h-8 rounded-full bg-[#f1f5f9] hover:bg-[#fee2e2] hover:text-[#ef4444] flex items-center justify-center text-[#475569] transition-colors shadow-2xs'
                                                    title='Delete record'
                                                >
                                                    <CloseOutlined className='text-xs'/>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* FLOATING PARAMETER EDIT CARD OVERLAY (MATCHING SCREENSHOT 2 EXACTLY) */}
                            {desktopEditingParam && (
                                <div className='absolute inset-x-4 top-10 z-40 bg-white rounded-2xl border border-[#cbd5e1] p-5 shadow-2xl flex flex-col gap-4 animate-fadeIn'>
                                    {/* Header: Date Pill + Time Pill + Close Button */}
                                    <div className='flex items-center justify-between border-b border-[#f1f5f9] pb-3'>
                                        <div className='flex items-center gap-2'>
                                            <span className='px-3 py-1 rounded-full bg-[#f1f5f9] text-xs font-semibold text-[#475569] flex items-center gap-1.5'>
                                                <CalendarOutlined/>
                                                <span>Sat, Jan 6, 2024</span>
                                            </span>
                                            <span className='px-3 py-1 rounded-full bg-[#f1f5f9] text-xs font-semibold text-[#475569]'>
                                                6:32am
                                            </span>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={() => { setDesktopEditingParam(null) }}
                                            className='text-[#94a3b8] hover:text-[#0f172a] p-1'
                                            title='Close'
                                        >
                                            <CloseOutlined className='text-sm'/>
                                        </button>
                                    </div>

                                    {/* Title row: Name + change button */}
                                    <div className='flex items-center gap-3'>
                                        <span className='text-base font-bold text-[#0f172a]'>
                                            {desktopEditingParam.name}
                                        </span>
                                        <button
                                            type='button'
                                            onClick={() => { void message.info('Change biomarker target') }}
                                            className='px-2.5 py-0.5 rounded-full bg-[#f1f5f9] text-xs font-semibold text-[#475569] hover:bg-[#e2e8f0]'
                                        >
                                            change
                                        </button>
                                    </div>

                                    {/* Value input row: [ = ] [ value ] [ unit ▾ ] */}
                                    <div className='flex items-center gap-2'>
                                        <div className='w-9 h-9 rounded-lg border border-[#cbd5e1] flex items-center justify-center text-xs font-bold text-[#475569] bg-[#f8fafc]'>
                                            =
                                        </div>
                                        <input
                                            type='text'
                                            value={editParamValue}
                                            onChange={(e) => { setEditParamValue(e.target.value) }}
                                            className='flex-1 px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm font-semibold text-[#0f172a]'
                                        />
                                        <div className='px-3 py-2 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#475569] bg-[#f8fafc]'>
                                            {editParamUnit} ▾
                                        </div>
                                    </div>

                                    {/* Reference range row: reference range: [ min ] to [ max ] ✕ */}
                                    <div className='flex flex-col gap-1.5'>
                                        <span className='text-xs text-[#64748b] font-medium'>
                                            reference range:
                                        </span>
                                        <div className='flex items-center gap-2'>
                                            <input
                                                type='text'
                                                value={editParamMin}
                                                onChange={(e) => { setEditParamMin(e.target.value) }}
                                                className='w-20 px-2.5 py-1.5 rounded-lg border border-[#cbd5e1] text-xs text-center font-medium'
                                            />
                                            <span className='text-xs text-[#64748b]'>to</span>
                                            <input
                                                type='text'
                                                value={editParamMax}
                                                onChange={(e) => { setEditParamMax(e.target.value) }}
                                                className='w-20 px-2.5 py-1.5 rounded-lg border border-[#cbd5e1] text-xs text-center font-medium'
                                            />
                                            <button
                                                type='button'
                                                onClick={() => {
                                                    setEditParamMin('')
                                                    setEditParamMax('')
                                                }}
                                                className='p-1 text-[#94a3b8] hover:text-[#ef4444]'
                                                title='Clear range'
                                            >
                                                <CloseOutlined className='text-xs'/>
                                            </button>
                                        </div>
                                    </div>

                                    {/* + Note link & input */}
                                    <div className='flex flex-col gap-1'>
                                        <div className='flex items-center gap-1 text-xs font-semibold text-[#64748b]'>
                                            <PlusOutlined className='text-[10px]'/>
                                            <span>Note</span>
                                        </div>
                                        <input
                                            type='text'
                                            value={editParamNotes}
                                            onChange={(e) => { setEditParamNotes(e.target.value) }}
                                            placeholder='Add notes'
                                            className='w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-lg'
                                        />
                                    </div>

                                    {/* Actions: Cancel & Save */}
                                    <div className='flex items-center justify-between pt-3 border-t border-[#f1f5f9]'>
                                        <button
                                            type='button'
                                            onClick={() => { setDesktopEditingParam(null) }}
                                            className='text-xs font-bold text-[#64748b] hover:text-[#0f172a]'
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type='button'
                                            onClick={handleSaveDesktopEdit}
                                            className='px-6 py-2 rounded-lg bg-[#007a55] hover:bg-[#006244] text-white text-xs font-bold shadow-xs transition-colors'
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ADD MANUAL RECORD MODAL */}
            <Modal
                title='Add to Record Group'
                open={isAddRecordModalOpen}
                onOk={handleAddNewRecord}
                onCancel={() => { setIsAddRecordModalOpen(false) }}
                okText='Add Record'
                okButtonProps={{ style: { backgroundColor: '#007a55' } }}
            >
                <div className='flex flex-col gap-3 py-2'>
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-semibold text-[#475569]'>Test Name</label>
                        <input
                            type='text'
                            value={newTestName}
                            onChange={(e) => { setNewTestName(e.target.value) }}
                            placeholder='e.g. Vitamin D'
                            className='px-3 py-1.5 rounded-lg border border-[#cbd5e1] text-xs'
                        />
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='flex flex-col gap-1'>
                            <label className='text-xs font-semibold text-[#475569]'>Observed Value</label>
                            <input
                                type='text'
                                value={newTestValue}
                                onChange={(e) => { setNewTestValue(e.target.value) }}
                                placeholder='e.g. 42.5'
                                className='px-3 py-1.5 rounded-lg border border-[#cbd5e1] text-xs'
                            />
                        </div>
                        <div className='flex flex-col gap-1'>
                            <label className='text-xs font-semibold text-[#475569]'>Unit</label>
                            <input
                                type='text'
                                value={newTestUnit}
                                onChange={(e) => { setNewTestUnit(e.target.value) }}
                                placeholder='e.g. ng/mL'
                                className='px-3 py-1.5 rounded-lg border border-[#cbd5e1] text-xs'
                            />
                        </div>
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-semibold text-[#475569]'>Reference Range</label>
                        <input
                            type='text'
                            value={newTestRef}
                            onChange={(e) => { setNewTestRef(e.target.value) }}
                            placeholder='e.g. 30 - 100'
                            className='px-3 py-1.5 rounded-lg border border-[#cbd5e1] text-xs'
                        />
                    </div>
                </div>
            </Modal>

            {/* Document Deletion Confirmation Popup */}
            <DeleteDocumentModal
                open={isDeleteModalOpen}
                documentName={fileToDelete?.name}
                recordCount={
                    fileToDelete
                        ? ((labGroups.filter((g) => g.fileId === fileToDelete.id).flatMap((g) => g.items).length) ||
                            (dbRecords.filter((r) => r.documentId === (fileToDelete.documentId ?? fileToDelete.id)).length))
                        : 0
                }
                isDeleting={isDeleting}
                onClose={() => {
                    if (!isDeleting) {
                        setIsDeleteModalOpen(false)
                        setFileToDelete(null)
                    }
                }}
                onConfirm={handleConfirmDelete}
            />
        </div>
    )
}
