import { useState, useMemo, ReactNode } from 'react'

import {
    SearchOutlined,
    SlidersOutlined,
    PlusOutlined,
    CloseOutlined,
    CheckOutlined,
    UserOutlined,
    LeftOutlined,
    RightOutlined,
    EditOutlined,
} from '@ant-design/icons'
import { message } from 'antd'
import dayjs from 'dayjs'

import { GuavaLogo } from '@/components/GuavaHeader/GuavaHeader'
import { useBiomarkerRecords } from '@/db/models/biomarkerRecord'
import { useDocuments } from '@/db/models/document'
import { useCurrentUser } from '@/db/models/user'

import {
    GuavaRecordsPageProps,
    HealthRecordItem,
    RecordCategory,
    RecordSource,
} from './GuavaRecordsPage.types'

/* ------------------------------------------------------------------------- */
/* Category Definitions & SVG Badges                                         */
/* ------------------------------------------------------------------------- */

interface CategoryConfig {
    id: RecordCategory
    label: string
    color: string
    renderIcon: () => ReactNode
}

interface SourceConfig {
    id: RecordSource
    label: string
    renderIcon: () => ReactNode
}

const CATEGORIES: CategoryConfig[] = [
    {
        id: 'vital_signs',
        label: 'Vital Signs',
        color: '#e11d48',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='22 12 18 12 15 21 9 3 6 12 2 12'/>
            </svg>
        ),
    },
    {
        id: 'lab_tests',
        label: 'Lab Tests',
        color: '#008272',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M10 2v7.31L4.03 20.02A1.8 1.8 0 0 0 5.6 22.5h12.8a1.8 1.8 0 0 0 1.57-2.48L14 9.31V2'/>
                <line x1='8.5' y1='2' x2='15.5' y2='2'/>
                <line x1='7' y1='16' x2='17' y2='16'/>
            </svg>
        ),
    },
    {
        id: 'social_history',
        label: 'Social History',
        color: '#64748b',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='7' r='4'/>
                <path d='M5.5 21v-2a6.5 6.5 0 0 1 13 0v2'/>
            </svg>
        ),
    },
    {
        id: 'vaccinations',
        label: 'Vaccinations',
        color: '#d97706',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <path d='m18 2 4 4-2 2-4-4Z'/>
                <path d='m17 7 3-3'/>
                <path d='M19 9 8.7 19.3c-.4.4-1 .6-1.6.6H3v-4.1c0-.6.2-1.2.6-1.6L15 4'/>
                <path d='m9 11 4 4'/>
                <path d='m5 19-3 3'/>
            </svg>
        ),
    },
    {
        id: 'insurance',
        label: 'Insurance',
        color: '#c2410c',
        renderIcon: () => (
            <span className='font-bold text-[10px] leading-none'>$</span>
        ),
    },
    {
        id: 'procedures',
        label: 'Procedures',
        color: '#9a3412',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <rect width='18' height='18' x='3' y='3' rx='2'/>
                <path d='M9 12h6'/>
                <path d='M12 9v6'/>
            </svg>
        ),
    },
    {
        id: 'medications',
        label: 'Medications',
        color: '#2563eb',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <path d='m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z'/>
                <path d='m8.5 8.5 7 7'/>
            </svg>
        ),
    },
    {
        id: 'conditions',
        label: 'Conditions',
        color: '#a16207',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <rect x='4' y='4' width='16' height='16' rx='2'/>
                <line x1='4' y1='4' x2='20' y2='20'/>
                <line x1='20' y1='4' x2='4' y2='20'/>
            </svg>
        ),
    },
    {
        id: 'imaging',
        label: 'Imaging',
        color: '#334155',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M17 10c.7-.7 1.6-1 2.5-1 2 0 3.5 1.5 3.5 3.5 0 1-.4 1.9-1 2.5'/>
                <path d='M7 14c-.7.7-1.6 1-2.5 1-2 0-3.5-1.5-3.5-3.5 0-1 .4-1.9 1-2.5'/>
                <line x1='6.5' y1='6.5' x2='17.5' y2='17.5'/>
            </svg>
        ),
    },
    {
        id: 'documents',
        label: 'Documents',
        color: '#475569',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/>
                <polyline points='14 2 14 8 20 8'/>
                <line x1='16' y1='13' x2='8' y2='13'/>
                <line x1='16' y1='17' x2='8' y2='17'/>
            </svg>
        ),
    },
    {
        id: 'encounters',
        label: 'Encounters',
        color: '#7c3aed',
        renderIcon: () => (
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <rect width='18' height='18' x='3' y='4' rx='2'/>
                <line x1='16' y1='2' x2='16' y2='6'/>
                <line x1='8' y1='2' x2='8' y2='6'/>
                <line x1='3' y1='10' x2='21' y2='10'/>
            </svg>
        ),
    },
]

const SOURCES: SourceConfig[] = [
    {
        id: 'uploaded_files',
        label: 'Uploaded Files',
        renderIcon: () => (
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#059669' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242'/>
                <path d='M12 12v9'/>
                <path d='m16 16-4-4-4 4'/>
            </svg>
        ),
    },
    {
        id: 'data_entry',
        label: 'Data Entry',
        renderIcon: () => (
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#0d9488' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='12' r='10'/>
                <circle cx='12' cy='10' r='3'/>
                <path d='M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662'/>
            </svg>
        ),
    },
]

/* ------------------------------------------------------------------------- */
/* Initial Records matching Screenshots 1 & 2                               */
/* ------------------------------------------------------------------------- */

const INITIAL_RECORDS: HealthRecordItem[] = [
    {
        id: 'rec-1',
        year: 2024,
        dateStr: 'Jan 6, 2024',
        facilityName: 'Shanthi Social Services - Master health checkup',
        title: 'Lab Result',
        category: 'lab_tests',
        source: 'uploaded_files',
        isRecentlyAdded: true,
    },
    {
        id: 'rec-2',
        year: 2024,
        dateStr: 'Jan 6, 2024',
        facilityName: 'Shanthi Social Services - Master health checkup',
        title: 'Lab Result',
        category: 'lab_tests',
        source: 'uploaded_files',
        isRecentlyAdded: true,
    },
    {
        id: 'rec-3',
        year: 2024,
        dateStr: 'Jan 6, 2024',
        facilityName: 'Shanthi Social Services - Master health checkup',
        title: 'Complete Blood Count',
        category: 'lab_tests',
        source: 'uploaded_files',
        isRecentlyAdded: true,
    },
    {
        id: 'rec-4',
        year: 2024,
        dateStr: 'Jan 6, 2024',
        facilityName: 'Shanthi Social Services - Master health checkup',
        title: 'ESR',
        category: 'lab_tests',
        source: 'uploaded_files',
        isRecentlyAdded: true,
    },
    {
        id: 'rec-5',
        year: 2024,
        dateStr: 'Jan 6, 2024',
        facilityName: 'Shanthi Social Services - Master health checkup',
        title: 'Complete Blood Count',
        category: 'lab_tests',
        source: 'uploaded_files',
        isRecentlyAdded: true,
    },
    {
        id: 'rec-6',
        year: 2024,
        dateStr: 'Jan 6, 2024',
        facilityName: 'Shanthi Social Services - Master health checkup',
        title: 'Lab Result',
        category: 'lab_tests',
        source: 'uploaded_files',
        isRecentlyAdded: true,
    },
    {
        id: 'rec-7',
        year: 2024,
        dateStr: 'Jan 6, 2024',
        facilityName: 'Shanthi Social Services - Master health checkup',
        title: 'Fasting Blood Sugar & Lipid Profile',
        category: 'lab_tests',
        source: 'uploaded_files',
        isRecentlyAdded: true,
    },
]

export const GuavaRecordsPage = (props: GuavaRecordsPageProps) => {
    const { className, onAddResult } = props

    const user = useCurrentUser()
    const { data: documents } = useDocuments({ filter: (d) => d.approved })
    const { data: records } = useBiomarkerRecords({ filter: (r) => r.approved })

    // User initials for mobile top-right badge
    const userInitials = useMemo(() => {
        if (!user?.name) return 'DA'
        const parts = user.name.trim().split(' ')
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        }
        return user.name.slice(0, 2).toUpperCase()
    }, [user])

    // Filter states:
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedSources, setSelectedSources] = useState<Set<RecordSource>>(new Set())
    const [selectedCategories, setSelectedCategories] = useState<Set<RecordCategory>>(
        new Set<RecordCategory>(['lab_tests']),
    )
    const [recentlyAddedChecked, setRecentlyAddedChecked] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

    // Preview Modal state
    const [previewRecord, setPreviewRecord] = useState<HealthRecordItem | null>(null)
    const [previewPage, setPreviewPage] = useState(1)
    const [isEditingReading, setIsEditingReading] = useState(false)
    const [editValue, setEditValue] = useState('')

    // Aggregate records with any real documents
    const allRecordsList = useMemo(() => {
        const list: HealthRecordItem[] = [...INITIAL_RECORDS]

        // Dynamically append any approved uploaded documents if not already in list
        if (documents.length > 0) {
            documents.forEach((doc, idx) => {
                const docRecordsCount = records.filter((r) => r.documentId === doc.id).length
                const docName = (doc.originalName || doc.fileName || `Lab Report ${idx + 1}`).replace(/\.[^/.]+$/, '')
                list.push({
                    id: doc.id,
                    year: doc.createdAt ? new Date(doc.createdAt).getFullYear() : 2024,
                    dateStr: doc.createdAt ? dayjs(doc.createdAt).format('MMM D, YYYY') : 'Jan 6, 2024',
                    facilityName: 'Shanthi Social Services - Master health checkup',
                    title: docName,
                    category: 'lab_tests',
                    source: 'uploaded_files',
                    isRecentlyAdded: true,
                    documentId: doc.id,
                    biomarkerCount: docRecordsCount,
                })
            })
        }

        return list
    }, [documents, records])

    // Filtered records
    const filteredRecords = useMemo(() => {
        return allRecordsList.filter((item) => {
            // Category filter
            if (selectedCategories.size > 0 && !selectedCategories.has(item.category)) {
                return false
            }
            // Source filter
            if (selectedSources.size > 0 && !selectedSources.has(item.source)) {
                return false
            }
            // Recently added filter
            if (recentlyAddedChecked && !item.isRecentlyAdded) {
                return false
            }
            // Search query
            if (searchQuery.trim().length > 0) {
                const q = searchQuery.toLowerCase().trim()
                const matchesTitle = item.title.toLowerCase().includes(q)
                const matchesFacility = item.facilityName.toLowerCase().includes(q)
                const matchesDate = item.dateStr.toLowerCase().includes(q)
                if (!matchesTitle && !matchesFacility && !matchesDate) {
                    return false
                }
            }
            return true
        })
    }, [allRecordsList, selectedCategories, selectedSources, recentlyAddedChecked, searchQuery])

    // Group filtered records by year
    const recordsByYear = useMemo(() => {
        const groups: Record<number, HealthRecordItem[]> = {}
        filteredRecords.forEach((item) => {
            const y = item.year || 2024
            if (!groups[y]) {
                groups[y] = []
            }
            groups[y].push(item)
        })
        return groups
    }, [filteredRecords])

    const years = useMemo(() => {
        return Object.keys(recordsByYear)
            .map(Number)
            .sort((a, b) => b - a)
    }, [recordsByYear])

    // Toggle category selection
    const toggleCategory = (catId: RecordCategory) => {
        setSelectedCategories((prev) => {
            const next = new Set(prev)
            if (next.has(catId)) {
                next.delete(catId)
            } else {
                next.add(catId)
            }
            return next
        })
    }

    // Toggle source selection
    const toggleSource = (srcId: RecordSource) => {
        setSelectedSources((prev) => {
            const next = new Set(prev)
            if (next.has(srcId)) {
                next.delete(srcId)
            } else {
                next.add(srcId)
            }
            return next
        })
    }

    // Clear all filters
    const handleClearAll = () => {
        setSelectedCategories(new Set())
        setSelectedSources(new Set())
        setRecentlyAddedChecked(false)
        setSearchQuery('')
    }

    // Active filters summary string for mobile header
    const activeFiltersText = useMemo(() => {
        const labels: string[] = []
        CATEGORIES.forEach((c) => {
            if (selectedCategories.has(c.id)) {
                labels.push(c.label)
            }
        })
        SOURCES.forEach((s) => {
            if (selectedSources.has(s.id)) {
                labels.push(s.label)
            }
        })
        if (labels.length === 0) return 'All'
        return labels.join(', ')
    }, [selectedCategories, selectedSources])

    const totalRecentlyAdded = useMemo(() => {
        return allRecordsList.filter((r) => r.isRecentlyAdded).length
    }, [allRecordsList])

    const handleSaveReading = () => {
        setIsEditingReading(false)
        void message.success('Updated parameter reading')
    }

    return (
        <div className={`w-full min-h-screen bg-[#f8faf9] flex flex-col ${className ?? ''}`}>
            {/* ========================================================================= */}
            {/* 1. MOBILE TOP APP BAR (<1024px) matching Screenshot 2                    */}
            {/* ========================================================================= */}
            <div className='lg:hidden bg-[#f8faf9] px-4 pt-3 pb-2 flex items-center justify-between sticky top-0 z-30 select-none'>
                <div className='flex items-center gap-2'>
                    <GuavaLogo size={28}/>
                </div>

                <h1 className='text-xl font-bold text-[#1e293b] tracking-tight'>
                    Records
                </h1>

                <div className='flex items-center gap-2 bg-white/90 border border-[#e2e8f0] rounded-full py-1 px-2.5 shadow-2xs'>
                    <div className='w-6 h-6 rounded-full bg-[#52525b] text-white flex items-center justify-center text-xs'>
                        <UserOutlined className='text-xs'/>
                    </div>
                    <span className='text-xs font-bold text-[#3f3f46] tracking-tight'>
                        {userInitials}
                    </span>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. MAIN CONTAINER: SIDEBAR (Desktop) + RECORDS CONTENT                     */}
            {/* ========================================================================= */}
            <div className='max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col lg:flex-row gap-8 items-start'>
                {/* --------------------------------------------------------------------- */}
                {/* LEFT SIDEBAR: FILTERS (Desktop Only - Screenshot 1)                   */}
                {/* --------------------------------------------------------------------- */}
                <aside className='hidden lg:flex flex-col w-56 shrink-0 sticky top-20 select-none'>
                    {/* SECTION 1: SOURCE */}
                    <div className='flex flex-col gap-2.5'>
                        <span className='text-[11px] font-bold text-[#64748b] tracking-wider uppercase'>
                            SOURCE
                        </span>
                        <div className='flex flex-col gap-2'>
                            {SOURCES.map((src) => {
                                const isChecked = selectedSources.has(src.id)
                                return (
                                    <div
                                        key={src.id}
                                        onClick={() => { toggleSource(src.id) }}
                                        className='flex items-center gap-3 cursor-pointer group py-0.5'
                                    >
                                        <div
                                            className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                                                isChecked
                                                    ? 'bg-[#334155] border-[#334155] text-white'
                                                    : 'border-[#94a3b8] bg-white group-hover:border-[#64748b]'
                                            }`}
                                        >
                                            {isChecked && <CheckOutlined className='text-[10px] stroke-[3]'/>}
                                        </div>

                                        <div className='flex items-center gap-2 text-sm text-[#334155] font-medium'>
                                            {src.renderIcon()}
                                            <span>{src.label}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: CATEGORY */}
                    <div className='flex flex-col gap-2.5 mt-7'>
                        <span className='text-[11px] font-bold text-[#64748b] tracking-wider uppercase'>
                            CATEGORY
                        </span>
                        <div className='flex flex-col gap-2.5'>
                            {CATEGORIES.map((cat) => {
                                const isChecked = selectedCategories.has(cat.id)
                                return (
                                    <div
                                        key={cat.id}
                                        onClick={() => { toggleCategory(cat.id) }}
                                        className='flex items-center gap-3 cursor-pointer group py-0.5'
                                    >
                                        <div
                                            className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                                                isChecked
                                                    ? 'bg-[#334155] border-[#334155] text-white'
                                                    : 'border-[#94a3b8] bg-white group-hover:border-[#64748b]'
                                            }`}
                                        >
                                            {isChecked && <CheckOutlined className='text-[10px] stroke-[3]'/>}
                                        </div>

                                        <div className='flex items-center gap-2.5 text-sm text-[#334155] font-medium'>
                                            <div
                                                className='w-5 h-5 rounded flex items-center justify-center text-white shrink-0 shadow-2xs'
                                                style={{ backgroundColor: cat.color }}
                                            >
                                                {cat.renderIcon()}
                                            </div>
                                            <span>{cat.label}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </aside>

                {/* --------------------------------------------------------------------- */}
                {/* RIGHT MAIN CONTENT AREA                                               */}
                {/* --------------------------------------------------------------------- */}
                <main className='flex-1 w-full flex flex-col gap-4 sm:gap-5'>
                    {/* TOP ACTION ROW */}
                    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full'>
                        {/* Search Pill Input */}
                        <div className='flex-1 relative flex items-center bg-[#e5ece8]/70 hover:bg-[#e5ece8] focus-within:bg-white focus-within:border-[#007a55] border border-transparent rounded-2xl transition-all shadow-2xs px-4 h-11'>
                            <SearchOutlined className='text-[#64748b] text-base mr-3'/>
                            <input
                                type='text'
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value) }}
                                placeholder='e.g. Blood Test, Cholesterol'
                                className='w-full bg-transparent border-none text-sm text-[#1e293b] placeholder-[#64748b] focus:outline-none'
                            />
                            {/* Filter Slider Tune Icon: Desktop clear / Mobile modal toggle */}
                            <button
                                type='button'
                                onClick={() => { setIsFilterModalOpen(true) }}
                                className='p-1 rounded-lg text-[#475569] hover:text-[#007a55] hover:bg-black/5 transition-colors text-base flex items-center justify-center'
                                title='Filter options'
                            >
                                <SlidersOutlined/>
                            </button>
                        </div>

                        {/* Add Lab Result Button (Desktop) */}
                        <button
                            type='button'
                            onClick={onAddResult}
                            className='hidden sm:flex items-center justify-center gap-2 px-6 h-11 bg-[#007a55] hover:bg-[#006848] text-white font-bold text-sm rounded-full shadow-xs transition-colors shrink-0'
                        >
                            <PlusOutlined className='text-base stroke-[2]'/>
                            <span>Add Lab Result</span>
                        </button>
                    </div>

                    {/* Active Filters Summary (Mobile only - Screenshot 2) */}
                    <div className='lg:hidden flex items-center gap-1.5 text-xs text-[#64748b] -mt-1'>
                        <span className='font-bold text-[#1e293b]'>Filters:</span>
                        <span className='truncate'>{activeFiltersText}</span>
                    </div>

                    {/* Add Lab Result Button (Mobile Full-Width Pill - Screenshot 2) */}
                    <div className='sm:hidden w-full'>
                        <button
                            type='button'
                            onClick={onAddResult}
                            className='w-full flex items-center justify-center gap-2 py-2.5 bg-[#007a55] hover:bg-[#006848] text-white font-bold text-sm rounded-full shadow-xs transition-colors'
                        >
                            <PlusOutlined className='text-base stroke-[2]'/>
                            <span>Add Lab Result</span>
                        </button>
                    </div>

                    {/* Recently added Filter Chip */}
                    <div className='flex items-center gap-2'>
                        <label
                            onClick={() => { setRecentlyAddedChecked(!recentlyAddedChecked) }}
                            className='cursor-pointer select-none bg-[#dbeafe] hover:bg-[#bfdbfe]/80 border border-[#bfdbfe] text-[#1e293b] px-3.5 py-1.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-2xs transition-colors'
                        >
                            <div
                                className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center ${
                                    recentlyAddedChecked
                                        ? 'bg-[#2563eb] border-[#2563eb] text-white'
                                        : 'border-[#60a5fa] bg-white'
                                }`}
                            >
                                {recentlyAddedChecked && <CheckOutlined className='text-[8px] stroke-[3]'/>}
                            </div>
                            <span>Recently added ({totalRecentlyAdded})</span>
                        </label>
                    </div>

                    {/* RECORDS CARDS CONTAINER GROUPED BY YEAR */}
                    {years.length === 0 ? (
                        <div className='bg-white rounded-3xl border border-[#e5ece8] p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs'>
                            <span className='text-3xl text-[#007a55]'>📋</span>
                            <h3 className='text-base font-bold text-[#1e293b]'>No records match your filters</h3>
                            <p className='text-xs text-[#64748b] max-w-sm'>
                                Try clearing your selected filters or upload a new blood test report to add records.
                            </p>
                            <button
                                type='button'
                                onClick={handleClearAll}
                                className='mt-2 px-4 py-2 bg-[#007a55] text-white rounded-full text-xs font-bold'
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        years.map((year) => {
                            const yearRecords = recordsByYear[year] ?? []
                            return (
                                <div
                                    key={year}
                                    className='bg-white rounded-3xl border border-[#e5ece8] p-5 sm:p-8 shadow-xs flex flex-col'
                                >
                                    {/* Large Year Header matching Screenshot 1 & 2 */}
                                    <h2 className='text-3xl sm:text-4xl font-extrabold text-[#475569] tracking-tight mb-4 select-none'>
                                        {year}
                                    </h2>

                                    {/* Records List with clean Dividers */}
                                    <div className='flex flex-col divide-y divide-[#f1f5f9]'>
                                        {yearRecords.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    setPreviewRecord(item)
                                                    setIsEditingReading(false)
                                                }}
                                                className='py-3 sm:py-3.5 px-1 sm:px-2 flex items-center gap-3.5 sm:gap-4 hover:bg-[#f8faf9] rounded-xl cursor-pointer transition-colors group'
                                            >
                                                {/* Category Icon Badge (Teal flask for Lab Tests matching screenshot) */}
                                                <div className='w-9 h-9 rounded-lg bg-[#008272] group-hover:bg-[#007062] text-white flex items-center justify-center text-base shrink-0 shadow-2xs transition-colors'>
                                                    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                                                        <path d='M10 2v7.31L4.03 20.02A1.8 1.8 0 0 0 5.6 22.5h12.8a1.8 1.8 0 0 0 1.57-2.48L14 9.31V2'/>
                                                        <line x1='8.5' y1='2' x2='15.5' y2='2'/>
                                                        <line x1='7' y1='16' x2='17' y2='16'/>
                                                    </svg>
                                                </div>

                                                {/* Text Info */}
                                                <div className='flex flex-col min-w-0 flex-1'>
                                                    <span className='text-xs text-[#64748b] font-medium truncate'>
                                                        {item.dateStr} • {item.facilityName}
                                                    </span>
                                                    <span className='text-sm sm:text-[15px] font-bold text-[#1e293b] group-hover:text-[#007a55] transition-colors truncate mt-0.5'>
                                                        {item.title}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </main>
            </div>

            {/* ========================================================================= */}
            {/* 3. MOBILE FILTER MODAL ("Filter Records" - Screenshot 3)                 */}
            {/* ========================================================================= */}
            {isFilterModalOpen && (
                <div
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsFilterModalOpen(false)
                        }
                    }}
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[1px] p-4 animate-fade-in'
                >
                    <div className='bg-white rounded-3xl w-full max-w-sm max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-slide-up'>
                        {/* Header: ✕ Filter Records */}
                        <div className='px-5 py-4 border-b border-[#f1f5f9] flex items-center gap-3 shrink-0'>
                            <button
                                type='button'
                                onClick={() => { setIsFilterModalOpen(false) }}
                                className='p-1 -ml-1 text-[#475569] hover:text-[#1e293b] rounded-full hover:bg-gray-100 transition-colors'
                            >
                                <CloseOutlined className='text-base stroke-[2]'/>
                            </button>
                            <h3 className='text-lg font-bold text-[#1e293b]'>
                                Filter Records
                            </h3>
                        </div>

                        {/* Modal Body: Source & Category Checklists */}
                        <div className='flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6'>
                            {/* SOURCE SECTION */}
                            <div className='flex flex-col gap-3'>
                                <span className='text-xs font-bold text-[#64748b] tracking-wider uppercase'>
                                    SOURCE
                                </span>
                                <div className='flex flex-col gap-3'>
                                    {SOURCES.map((src) => {
                                        const isChecked = selectedSources.has(src.id)
                                        return (
                                            <div
                                                key={src.id}
                                                onClick={() => { toggleSource(src.id) }}
                                                className='flex items-center gap-3 cursor-pointer py-0.5'
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded-md border transition-colors flex items-center justify-center ${
                                                        isChecked
                                                            ? 'bg-[#334155] border-[#334155] text-white'
                                                            : 'border-[#94a3b8] bg-white'
                                                    }`}
                                                >
                                                    {isChecked && <CheckOutlined className='text-[10px] stroke-[3]'/>}
                                                </div>

                                                <div className='flex items-center gap-2.5 text-sm font-semibold text-[#1e293b]'>
                                                    {src.renderIcon()}
                                                    <span>{src.label}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* CATEGORY SECTION */}
                            <div className='flex flex-col gap-3'>
                                <span className='text-xs font-bold text-[#64748b] tracking-wider uppercase'>
                                    CATEGORY
                                </span>
                                <div className='flex flex-col gap-3'>
                                    {CATEGORIES.map((cat) => {
                                        const isChecked = selectedCategories.has(cat.id)
                                        return (
                                            <div
                                                key={cat.id}
                                                onClick={() => { toggleCategory(cat.id) }}
                                                className='flex items-center gap-3 cursor-pointer py-0.5'
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded-md border transition-colors flex items-center justify-center ${
                                                        isChecked
                                                            ? 'bg-[#334155] border-[#334155] text-white'
                                                            : 'border-[#94a3b8] bg-white'
                                                    }`}
                                                >
                                                    {isChecked && <CheckOutlined className='text-[10px] stroke-[3]'/>}
                                                </div>

                                                <div className='flex items-center gap-3 text-sm font-semibold text-[#1e293b]'>
                                                    <div
                                                        className='w-5 h-5 rounded flex items-center justify-center text-white shrink-0 shadow-2xs'
                                                        style={{ backgroundColor: cat.color }}
                                                    >
                                                        {cat.renderIcon()}
                                                    </div>
                                                    <span>{cat.label}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer: Clear All & Done */}
                        <div className='px-5 py-3.5 border-t border-[#f1f5f9] flex items-center justify-between shrink-0 bg-white'>
                            <button
                                type='button'
                                onClick={handleClearAll}
                                className='text-sm font-bold text-[#64748b] hover:text-[#1e293b] transition-colors'
                            >
                                Clear All
                            </button>

                            <button
                                type='button'
                                onClick={() => { setIsFilterModalOpen(false) }}
                                className='px-7 py-2 rounded-full bg-[#008272] hover:bg-[#007062] text-white text-sm font-bold shadow-xs transition-colors'
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 4. INTERACTIVE FILE PREVIEW SCREEN / MODAL                                 */}
            {/* ========================================================================= */}
            {previewRecord && (
                <div
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setPreviewRecord(null)
                        }
                    }}
                    className='fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center bg-black/60 backdrop-blur-[1px] lg:p-4'
                >
                    <div className='w-full h-full lg:h-[88vh] lg:max-w-xl bg-[#0f172a] text-white lg:rounded-2xl shadow-2xl flex flex-col overflow-hidden'>
                        {/* Top Bar with Pagination */}
                        <div className='h-14 px-4 sm:px-5 flex items-center justify-between shrink-0 border-b border-white/10 bg-[#0f172a] z-20'>
                            <button
                                type='button'
                                onClick={() => { setPreviewRecord(null) }}
                                className='text-white hover:opacity-80 flex items-center gap-2 font-bold text-sm sm:text-base transition-opacity -ml-1'
                            >
                                <CloseOutlined className='text-base'/>
                                <span>{previewRecord.title}</span>
                            </button>

                            {/* Pagination Tool */}
                            <div className='bg-white/10 rounded-full px-3 py-1 flex items-center gap-2 text-xs font-semibold text-white'>
                                <button
                                    type='button'
                                    onClick={() => { setPreviewPage((p) => Math.max(1, p - 1)) }}
                                    className='hover:text-[#4ade80] p-0.5'
                                >
                                    <LeftOutlined className='text-[10px]'/>
                                </button>
                                <span>Page {previewPage}/4</span>
                                <button
                                    type='button'
                                    onClick={() => { setPreviewPage((p) => Math.min(4, p + 1)) }}
                                    className='hover:text-[#4ade80] p-0.5'
                                >
                                    <RightOutlined className='text-[10px]'/>
                                </button>
                            </div>
                        </div>

                        {/* Document Scan with Illuminated Bounding Box */}
                        <div className='flex-1 overflow-y-auto bg-black flex items-center justify-center p-3 relative'>
                            <div className='relative max-w-full bg-white shadow-2xl rounded-xs'>
                                <img
                                    src='/sample-lab-report.png'
                                    alt='Lab scan'
                                    className='w-full max-h-[58vh] object-contain select-none'
                                />
                                <div
                                    className='absolute border-2 border-[#3b82f6] bg-[#3b82f6]/30 rounded-xs pointer-events-none shadow-md transition-all'
                                    style={{
                                        top: '46.2%',
                                        left: '14.5%',
                                        width: '42%',
                                        height: '2.8%',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Bottom Info Bar with Option to Correct Reading */}
                        <div className='p-3 sm:p-4 bg-[#1e293b] border-t border-white/10 shrink-0 flex flex-col gap-2.5'>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col'>
                                    <span className='text-xs font-bold text-white'>
                                        {previewRecord.facilityName}
                                    </span>
                                    <span className='text-xs text-[#94a3b8] font-medium'>
                                        {previewRecord.dateStr} • {previewRecord.title}
                                    </span>
                                </div>

                                <button
                                    type='button'
                                    onClick={() => {
                                        setEditValue('78')
                                        setIsEditingReading(!isEditingReading)
                                    }}
                                    className='px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors'
                                >
                                    <EditOutlined className='text-xs'/>
                                    <span>{isEditingReading ? 'Cancel' : 'Correct Reading'}</span>
                                </button>
                            </div>

                            {/* Inline edit reading form */}
                            {isEditingReading && (
                                <div className='flex items-center gap-2 pt-1 animate-fade-in'>
                                    <input
                                        type='text'
                                        value={editValue}
                                        onChange={(e) => { setEditValue(e.target.value) }}
                                        placeholder='Enter correct value'
                                        className='flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-blue-400'
                                    />
                                    <button
                                        type='button'
                                        onClick={handleSaveReading}
                                        className='px-4 py-1.5 rounded-lg bg-[#008272] hover:bg-[#008272]/90 text-white text-xs font-bold transition-colors'
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
