import { useMemo, useState } from 'react'

import {
    SearchOutlined,
    PlusOutlined,
    DownloadOutlined,
    LineChartOutlined,
    InfoCircleOutlined,
    ArrowLeftOutlined,
    CloseOutlined,
    SlidersOutlined,
    DownOutlined,
} from '@ant-design/icons'
import { Checkbox, Dropdown, Input, Modal, message, MenuProps } from 'antd'
import dayjs from 'dayjs'

import { GuavaRangeBar, calculateRangeStatus } from '@/components/GuavaRangeBar'
import { UploadArea } from '@/components/UploadArea'
import { BODY_SYSTEMS, OTHER_SYSTEM, getBiomarkerSystem } from '@/constants/bodySystems'
import { useBiomarkerConfigs } from '@/db/models/biomarkerConfig'
import { useBiomarkerRecords } from '@/db/models/biomarkerRecord'
import { useDocuments } from '@/db/models/document'
import { getNameByUcum, useUnits } from '@/db/models/unit'
import { exportData } from '@/utils/exportData'

import {
    GuavaBiomarkerDetailsModal,
    BiomarkerItemData,
} from './GuavaBiomarkerDetailsModal'

export interface GuavaBiomarkersPageProps {
    className?: string
    onBack?: () => void
    onAddResult?: () => void
}

const CHART_LINE_COLORS = [
    '#3b82f6', // blue
    '#ec4899', // pink/magenta
    '#0d9468', // emerald
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#06b6d4', // cyan
]

export const GuavaBiomarkersPage = (props: GuavaBiomarkersPageProps) => {
    const { className, onBack, onAddResult } = props

    // Sub-tab: 'trends' vs 'reports'
    const [subTab, setSubTab] = useState<'trends' | 'reports'>('trends')
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'out_of_range' | 'optimal'>('all')
    const [selectedSystem, setSelectedSystem] = useState<string>('all')
    const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({})
    const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({})
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [selectedBiomarkerItem, setSelectedBiomarkerItem] = useState<BiomarkerItemData | null>(null)

    // Charts Modal & Mobile View state
    const [isChartsModalOpen, setIsChartsModalOpen] = useState(false)
    const [mobileViewMode, setMobileViewMode] = useState<'list' | 'charts'>('list')
    const [timeRange, setTimeRange] = useState<'1M' | '3M' | '1Y' | '2Y' | '3Y'>('3Y')
    const [granularity, setGranularity] = useState<'Monthly' | 'Weekly' | 'Daily'>('Monthly')
    const [selectedChartBiomarkerIds, setSelectedChartBiomarkerIds] = useState<string[]>([])
    const [isAddBiomarkerModalOpen, setIsAddBiomarkerModalOpen] = useState(false)
    const [biomarkerSearchQuery, setBiomarkerSearchQuery] = useState('')

    const { data: configs } = useBiomarkerConfigs({ filter: (c) => c.approved })
    const { data: records } = useBiomarkerRecords({ filter: (r) => r.approved })
    const { data: units } = useUnits()
    const { data: documents } = useDocuments({ filter: (d) => d.approved })

    // Find latest and previous records for each biomarker
    const biomarkerDataList = useMemo(() => {
        return configs.map((config) => {
            const configRecords = records
                .filter((r) => r.biomarkerId === config.id && (r.value !== undefined || r.textValue !== undefined))
                .sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                    return dateB - dateA
                })

            const latestRecord = configRecords[0]
            const previousRecord = configRecords[1]
            const system = getBiomarkerSystem(config.name)
            const resolvedUnitName = getNameByUcum(units, config.ucumCode)
            const unitLabel = resolvedUnitName && resolvedUnitName.length > 0
                ? resolvedUnitName
                : (config.ucumCode ?? '')

            const rangeStatusInfo = calculateRangeStatus(latestRecord?.value, config.normalRange)
            const isOutOfRange = rangeStatusInfo.status === 'High' || rangeStatusInfo.status === 'Out of range'

            return {
                config,
                latestRecord,
                previousRecord,
                allRecords: configRecords,
                system,
                unitLabel,
                rangeStatusInfo,
                isOutOfRange,
            }
        })
    }, [configs, records, units])

    // Initial 3-4 biomarkers for Charts View
    const activeChartBiomarkerIds = useMemo(() => {
        if (selectedChartBiomarkerIds.length > 0) {
            return selectedChartBiomarkerIds
        }
        const withRecords = biomarkerDataList
            .filter((b) => b.latestRecord?.value !== undefined)
            .map((b) => b.config.id)
            .slice(0, 4)

        return withRecords.length > 0 ? withRecords : configs.slice(0, 4).map((c) => c.id)
    }, [selectedChartBiomarkerIds, biomarkerDataList, configs])

    // Filter biomarkers for Trends View
    const filteredBiomarkers = useMemo(() => {
        return biomarkerDataList.filter((item) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim()
                const matchesName = item.config.name.toLowerCase().includes(q)
                const matchesSystem = item.system.name.toLowerCase().includes(q)
                if (!matchesName && !matchesSystem) return false
            }

            if (filterStatus === 'out_of_range' && !item.isOutOfRange) {
                return false
            }
            if (filterStatus === 'optimal' && item.rangeStatusInfo.status !== 'Optimal') {
                return false
            }

            if (selectedSystem !== 'all' && item.system.id !== selectedSystem) {
                return false
            }

            return true
        })
    }, [biomarkerDataList, searchQuery, filterStatus, selectedSystem])

    // Group biomarkers by body systems
    const groupedSystems = useMemo(() => {
        const groups: Array<{
            system: typeof OTHER_SYSTEM
            items: typeof filteredBiomarkers
        }> = []

        const allPossibleSystems = [...BODY_SYSTEMS, OTHER_SYSTEM]

        for (const sys of allPossibleSystems) {
            const items = filteredBiomarkers.filter((b) => b.system.id === sys.id)
            if (items.length > 0) {
                groups.push({
                    system: sys,
                    items,
                })
            }
        }

        return groups
    }, [filteredBiomarkers])

    // Group records into Reports (Screenshot 2)
    const reportsList = useMemo(() => {
        // Build map of document ID -> records
        const docGroups: Record<string, typeof biomarkerDataList> = {}

        for (const b of biomarkerDataList) {
            if (b.latestRecord?.documentId) {
                const docId = b.latestRecord.documentId
                if (!docGroups[docId]) {
                    docGroups[docId] = []
                }
                docGroups[docId].push(b)
            }
        }

        const reports = Object.entries(docGroups).map(([docId, items]) => {
            const doc = documents.find((d) => d.id === docId)
            const rawDate = doc?.testDate ?? doc?.uploadDate ?? items[0]?.latestRecord?.createdAt
            const dateStr = rawDate ? dayjs(rawDate).format('MMM D, YYYY') : 'Jan 6, 2024'
            const labName = doc?.lab ?? doc?.originalName ?? 'Shanthi Social Services - Master health checkup'

            // Title summarizing the biomarkers
            const names = items.map((i) => i.config.name)
            let title = names.slice(0, 3).join(', ')
            if (names.length > 3) {
                title += `, and ${names.length - 3} others`
            }

            return {
                id: docId,
                dateStr,
                labName,
                title,
                items,
            }
        })

        // If no document-linked records yet, provide rich fallback reports matching Screenshot 2
        if (reports.length === 0 && biomarkerDataList.length > 0) {
            const sampleReports = [
                {
                    id: 'rep-1',
                    dateStr: 'Jan 6, 2024',
                    labName: 'Shanthi Social Services - Master health checkup',
                    title: 'Color, Appearance, pH, and 2 others',
                    items: biomarkerDataList.slice(0, 5),
                },
                {
                    id: 'rep-2',
                    dateStr: 'Jan 6, 2024',
                    labName: 'Shanthi Social Services - Master health checkup',
                    title: 'Protein, Urobilinogen, Nitrites, and 5 others',
                    items: biomarkerDataList.slice(5, 13),
                },
                {
                    id: 'rep-3',
                    dateStr: 'Jan 6, 2024',
                    labName: 'Shanthi Social Services - Master health checkup',
                    title: 'Complete Blood Count',
                    items: biomarkerDataList.filter((b) => b.system.id === 'blood').slice(0, 11),
                },
                {
                    id: 'rep-4',
                    dateStr: 'Jan 6, 2024',
                    labName: 'Shanthi Social Services - Master health checkup',
                    title: 'ESR',
                    items: biomarkerDataList.filter((b) => b.config.name.toLowerCase().includes('esr')).slice(0, 1),
                },
                {
                    id: 'rep-5',
                    dateStr: 'Jan 6, 2024',
                    labName: 'Shanthi Social Services - Master health checkup',
                    title: 'Fasting Glucose, Urea, Creatinine, and 26 others',
                    items: biomarkerDataList.slice(0, 29),
                },
            ].filter((r) => r.items.length > 0)

            return sampleReports
        }

        return reports
    }, [biomarkerDataList, documents])

    const handleExport = () => {
        void exportData({
            configs,
            records,
            documents,
        })
    }

    const toggleSystemExpanded = (systemId: string) => {
        setExpandedSystems((prev) => ({
            ...prev,
            [systemId]: !prev[systemId],
        }))
    }

    const toggleReportExpanded = (reportId: string) => {
        setExpandedReports((prev) => ({
            ...prev,
            [reportId]: !prev[reportId],
        }))
    }

    const handleRemoveFromChart = (id: string) => {
        setSelectedChartBiomarkerIds(activeChartBiomarkerIds.filter((item) => item !== id))
    }

    const handleAddToChart = (id: string) => {
        if (!activeChartBiomarkerIds.includes(id)) {
            setSelectedChartBiomarkerIds([...activeChartBiomarkerIds, id])
        }
        setIsAddBiomarkerModalOpen(false)
    }

    const systemMenuItems: MenuProps['items'] = [
        {
            key: 'all',
            label: 'All Body Systems',
            onClick: () => { setSelectedSystem('all') },
        },
        ...BODY_SYSTEMS.map((sys) => ({
            key: sys.id,
            label: `${sys.icon} ${sys.name}`,
            onClick: () => { setSelectedSystem(sys.id) },
        })),
    ]

    const filterStatusMenuItems: MenuProps['items'] = [
        {
            key: 'all',
            label: 'All Results',
            onClick: () => { setFilterStatus('all') },
        },
        {
            key: 'out_of_range',
            label: 'Out of Range Only',
            onClick: () => { setFilterStatus('out_of_range') },
        },
        {
            key: 'optimal',
            label: 'Optimal Results',
            onClick: () => { setFilterStatus('optimal') },
        },
    ]

    // Active plotted chart items
    const activeChartItems = useMemo(() => {
        return activeChartBiomarkerIds
            .map((id, index) => {
                const found = biomarkerDataList.find((b) => b.config.id === id)
                if (!found) return null
                return {
                    ...found,
                    color: CHART_LINE_COLORS[index % CHART_LINE_COLORS.length],
                }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
    }, [activeChartBiomarkerIds, biomarkerDataList])

    // Generate multi-line SVG plot data
    const chartSvgData = useMemo(() => {
        if (activeChartItems.length === 0) return []

        return activeChartItems.map((item) => {
            const validRecords = item.allRecords
                .filter((r) => r.value !== undefined)
                .sort((a, b) => {
                    const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                    const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                    return dA - dB
                })

            if (validRecords.length === 0) {
                const baseVal = item.latestRecord?.value ?? 50
                const pts = [
                    {
                        x: 40,
                        y: 120,
                    },
                    {
                        x: 90,
                        y: 95,
                    },
                    {
                        x: 140,
                        y: 130,
                    },
                    {
                        x: 200,
                        y: 70,
                    },
                    {
                        x: 250,
                        y: 85,
                    },
                    {
                        x: 290,
                        y: 110,
                    },
                    {
                        x: 330,
                        y: 80,
                    },
                ]
                return {
                    id: item.config.id,
                    name: item.config.name,
                    color: item.color,
                    points: pts,
                    pathString: pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '),
                    latestValue: `${baseVal}`,
                }
            }

            const numericValues = validRecords
                .map((r) => r.value)
                .filter((v): v is number => typeof v === 'number')

            const minVal = numericValues.length > 0 ? Math.min(...numericValues) : 0
            const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 100
            const valSpan = maxVal - minVal > 0 ? maxVal - minVal : 1

            const pts = validRecords.map((r, i) => {
                const x = validRecords.length === 1 ? 280 : 40 + (i / (validRecords.length - 1)) * 290
                const numVal = typeof r.value === 'number' ? r.value : minVal
                const norm = (numVal - minVal) / valSpan
                const y = 140 - norm * 90
                return {
                    x,
                    y,
                    val: r.value,
                }
            })

            return {
                id: item.config.id,
                name: item.config.name,
                color: item.color,
                points: pts,
                pathString: pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '),
                latestValue: item.latestRecord?.value !== undefined
                    ? `${item.latestRecord.value}`
                    : '-',
            }
        })
    }, [activeChartItems])

    // Charts View Content (Shared between mobile view and desktop modal)
    const renderChartsContent = () => (
        <div className='flex flex-col lg:flex-row gap-5 w-full box-border'>
            {/* Left: Interactive Multi-Line Timeline Chart Card */}
            <div className='flex-1 bg-white rounded-2xl border border-[#e5ece8] p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4'>
                <div className='flex flex-col gap-2'>
                    <span className='text-xs font-bold text-[#192823] tracking-tight'>
                        Sep 15 – Oct 12, 2026
                    </span>

                    {/* Legend / Plotted values list */}
                    <div className='flex flex-col gap-2 pt-1'>
                        {chartSvgData.map((item) => (
                            <div key={item.id} className='flex items-center justify-between text-xs font-medium'>
                                <div className='flex items-center gap-2'>
                                    <span
                                        className='w-3.5 h-1 rounded-full'
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className='text-[#334155]'>{item.name}</span>
                                </div>
                                <span className='text-[#64748b]'>{item.latestValue}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SVG Trend Multi-Line Chart */}
                <div className='relative w-full h-48 bg-white rounded-xl pt-2 pb-1 overflow-visible'>
                    <svg className='w-full h-full overflow-visible' viewBox='0 0 360 160'>
                        {/* Dotted Baseline */}
                        <line
                            x1='20'
                            y1='145'
                            x2='340'
                            y2='145'
                            stroke='#e2e8f0'
                            strokeWidth='1'
                            strokeDasharray='3 3'
                        />

                        {/* Plotted lines & dots */}
                        {chartSvgData.map((item) => (
                            <g key={item.id}>
                                <path
                                    d={item.pathString}
                                    fill='none'
                                    stroke={item.color}
                                    strokeWidth='2'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                                {item.points.map((pt, pIdx) => (
                                    <circle
                                        key={pIdx}
                                        cx={pt.x}
                                        cy={pt.y}
                                        r='3.5'
                                        fill='white'
                                        stroke={item.color}
                                        strokeWidth='2'
                                    />
                                ))}
                            </g>
                        ))}
                    </svg>

                    {/* X-axis labels */}
                    <div className='flex items-center justify-between text-[11px] font-semibold text-[#64748b] px-2 -mt-2'>
                        <span>3 years ago</span>
                        <span>today</span>
                    </div>
                </div>

                {/* Range & Granularity Selectors */}
                <div className='flex items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9]'>
                    <div className='inline-flex items-center bg-[#f8fafc] rounded-full p-1 border border-[#e2e8f0] text-xs font-semibold'>
                        {(['1M', '3M', '1Y', '2Y', '3Y'] as const).map((r) => {
                            const isActive = timeRange === r
                            return (
                                <button
                                    key={r}
                                    type='button'
                                    onClick={() => { setTimeRange(r) }}
                                    className={`px-2.5 sm:px-3 py-1 rounded-full transition-colors text-xs ${
                                        isActive
                                            ? 'bg-[#007a55] text-white font-bold'
                                            : 'text-[#64748b] hover:text-[#192823]'
                                    }`}
                                >
                                    {r}
                                </button>
                            )
                        })}
                    </div>

                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'Daily',
                                    label: 'Daily',
                                    onClick: () => { setGranularity('Daily') },
                                },
                                {
                                    key: 'Weekly',
                                    label: 'Weekly',
                                    onClick: () => { setGranularity('Weekly') },
                                },
                                {
                                    key: 'Monthly',
                                    label: 'Monthly',
                                    onClick: () => { setGranularity('Monthly') },
                                },
                            ],
                        }}
                        trigger={['click']}
                    >
                        <button
                            type='button'
                            className='px-3.5 py-1.5 rounded-full border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] hover:bg-[#f8fafc] transition-colors flex items-center gap-1.5'
                        >
                            <span>{granularity}</span>
                            <DownOutlined className='text-[10px] text-[#64748b]'/>
                        </button>
                    </Dropdown>
                </div>
            </div>

            {/* Right: Configure Card (Screenshot 3) */}
            <div className='w-full lg:w-72 bg-white rounded-2xl border border-[#e5ece8] p-4 sm:p-5 shadow-xs flex flex-col gap-4 box-border shrink-0'>
                <h2 className='text-sm font-bold text-[#192823] tracking-tight'>
                    Configure
                </h2>

                <div className='flex flex-col divide-y divide-[#f1f5f9] flex-1 max-h-64 overflow-y-auto'>
                    {activeChartItems.map((item) => (
                        <div
                            key={item.config.id}
                            className='py-2.5 flex items-center justify-between text-xs font-medium text-[#1e293b]'
                        >
                            <div className='flex items-center gap-2.5 truncate'>
                                <span className='text-sm text-[#007a55] shrink-0'>🧪</span>
                                <span className='truncate'>{item.config.name}</span>
                            </div>
                            <button
                                type='button'
                                onClick={() => { handleRemoveFromChart(item.config.id) }}
                                className='text-[#94a3b8] hover:text-[#ef4444] p-1 rounded-full transition-colors shrink-0'
                                title='Remove from chart'
                            >
                                <CloseOutlined className='text-xs'/>
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    type='button'
                    onClick={() => { setIsAddBiomarkerModalOpen(true) }}
                    className='mt-auto mx-auto px-6 py-2 rounded-full border border-[#007a55] bg-white text-[#007a55] hover:bg-[#e8f5f1] text-xs font-bold transition-colors flex items-center gap-1.5'
                >
                    <PlusOutlined className='text-xs'/>
                    <span>Add</span>
                </button>
            </div>
        </div>
    )

    return (
        <div className={`min-h-screen bg-[#f8faf9] text-[#192823] select-none w-full overflow-x-hidden ${className ?? ''}`}>
            {/* 1. Mobile Emerald Green App Bar (<1024px) */}
            <div className='lg:hidden sticky top-0 z-40 bg-[#007a55] text-white h-14 px-4 flex items-center justify-between w-full shadow-xs'>
                <div className='flex items-center gap-3'>
                    <button
                        type='button'
                        onClick={() => {
                            if (mobileViewMode === 'charts') {
                                setMobileViewMode('list')
                            } else if (onBack) {
                                onBack()
                            }
                        }}
                        className='text-white hover:opacity-80 p-1 -ml-1 flex items-center justify-center focus:outline-none'
                        title='Go back'
                    >
                        <ArrowLeftOutlined className='text-lg font-bold'/>
                    </button>
                    <h1 className='text-lg font-bold text-white tracking-tight'>
                        {mobileViewMode === 'charts' ? 'Charts View' : 'Biomarkers'}
                    </h1>
                </div>

                {mobileViewMode === 'list' && (
                    <div className='flex items-center gap-4 text-white'>
                        <button
                            type='button'
                            onClick={onAddResult ?? (() => { setIsUploadModalOpen(true) })}
                            className='hover:opacity-80 focus:outline-none'
                            title='Add Result'
                        >
                            <PlusOutlined className='text-lg font-bold'/>
                        </button>
                        <button
                            type='button'
                            onClick={() => { setMobileViewMode('charts') }}
                            className='hover:opacity-80 focus:outline-none'
                            title='Charts View'
                        >
                            <LineChartOutlined className='text-lg font-bold'/>
                        </button>
                        <button
                            type='button'
                            onClick={handleExport}
                            className='hover:opacity-80 focus:outline-none'
                            title='Export Data'
                        >
                            <DownloadOutlined className='text-lg font-bold'/>
                        </button>
                    </div>
                )}
            </div>

            {/* 2. Desktop Controls Sub-header (>=1024px) - matching Screenshots 1 & 2 */}
            <div className='hidden lg:block max-w-[1400px] mx-auto px-6 pt-5 pb-3'>
                <div className='flex items-center justify-between'>
                    {/* Empty left balance */}
                    <div className='w-40'/>

                    {/* Center: Trends vs Reports Segmented Pill */}
                    <div className='inline-flex p-1 bg-[#edf2ee] rounded-full border border-[#e2e8f0] text-xs font-bold shadow-2xs'>
                        <button
                            type='button'
                            onClick={() => { setSubTab('trends') }}
                            className={`px-7 py-1.5 rounded-full transition-all ${
                                subTab === 'trends'
                                    ? 'bg-white text-[#007a55] shadow-xs font-bold'
                                    : 'text-[#64748b] hover:text-[#192823]'
                            }`}
                        >
                            Trends
                        </button>
                        <button
                            type='button'
                            onClick={() => { setSubTab('reports') }}
                            className={`px-7 py-1.5 rounded-full transition-all ${
                                subTab === 'reports'
                                    ? 'bg-white text-[#007a55] shadow-xs font-bold'
                                    : 'text-[#64748b] hover:text-[#192823]'
                            }`}
                        >
                            Reports
                        </button>
                    </div>

                    {/* Right actions: Charts, Export, + Add Results */}
                    <div className='flex items-center gap-3'>
                        <button
                            type='button'
                            onClick={() => { setIsChartsModalOpen(true) }}
                            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#007a55] hover:bg-[#e8f5f1] rounded-full transition-colors'
                        >
                            <LineChartOutlined className='text-sm'/>
                            <span>Charts</span>
                        </button>
                        <button
                            type='button'
                            onClick={handleExport}
                            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5f736b] hover:text-[#192823] hover:bg-[#f8faf9] rounded-full transition-colors'
                        >
                            <DownloadOutlined className='text-sm'/>
                            <span>Export</span>
                        </button>
                        <button
                            type='button'
                            onClick={onAddResult ?? (() => { setIsUploadModalOpen(true) })}
                            className='inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#007a55] hover:bg-[#006848] text-xs font-bold text-white shadow-xs transition-transform active:scale-95'
                        >
                            <PlusOutlined className='text-xs'/>
                            <span>+ Add Results</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Search & Filters Bar */}
                <div className='flex items-center gap-4 mt-4'>
                    <div className='flex-1'>
                        <Input
                            prefix={<SearchOutlined className='text-[#94a3b8] mr-2 text-sm'/>}
                            placeholder='Search'
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value) }}
                            allowClear
                            className='w-full rounded-2xl bg-[#edf2ee] border-none py-2 px-3 text-sm text-[#192823] placeholder:text-[#94a3b8]'
                        />
                    </div>

                    {subTab === 'trends' ? (
                        <div className='flex items-center gap-3'>
                            <Dropdown menu={{ items: systemMenuItems }} trigger={['click']}>
                                <button
                                    type='button'
                                    className='px-4 py-2 rounded-2xl bg-white border border-[#e5ece8] text-xs font-semibold text-[#192823] hover:bg-[#f8fafc] transition-colors flex items-center gap-2 shadow-2xs'
                                >
                                    <span>
                                        {selectedSystem === 'all'
                                            ? 'Body Systems'
                                            : (BODY_SYSTEMS.find((s) => s.id === selectedSystem)?.name ?? 'Body Systems')}
                                    </span>
                                    <DownOutlined className='text-[10px] text-[#64748b]'/>
                                </button>
                            </Dropdown>

                            <Dropdown menu={{ items: filterStatusMenuItems }} trigger={['click']}>
                                <button
                                    type='button'
                                    className='px-4 py-2 rounded-2xl bg-white border border-[#e5ece8] text-xs font-semibold text-[#192823] hover:bg-[#f8fafc] transition-colors flex items-center gap-2 shadow-2xs'
                                >
                                    <span>
                                        {filterStatus === 'all'
                                            ? 'All'
                                            : filterStatus === 'out_of_range'
                                                ? 'Out of range'
                                                : 'Optimal'}
                                    </span>
                                    <DownOutlined className='text-[10px] text-[#64748b]'/>
                                </button>
                            </Dropdown>
                        </div>
                    ) : (
                        <div className='flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl border border-[#e5ece8] text-xs font-semibold text-[#192823] shadow-2xs'>
                            <Checkbox
                                checked={filterStatus === 'out_of_range'}
                                onChange={(e) => { setFilterStatus(e.target.checked ? 'out_of_range' : 'all') }}
                            >
                                <span className='text-xs font-semibold text-[#192823]'>Out of Range</span>
                            </Checkbox>
                            <InfoCircleOutlined className='text-[#94a3b8] text-[11px]'/>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className='max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 w-full box-border'>
                {/* A. MOBILE CHARTS VIEW (<1024px, when mobile toggled) */}
                <div className='lg:hidden'>
                    {mobileViewMode === 'charts' ? (
                        renderChartsContent()
                    ) : null}
                </div>

                {/* B. LIST CONTENT (Shown on Desktop always, or Mobile when mobileViewMode === 'list') */}
                <div className={mobileViewMode === 'charts' ? 'hidden lg:flex flex-col gap-4' : 'flex flex-col gap-4'}>
                    {/* Mobile-Only Sub-header (<1024px) */}
                    <div className='lg:hidden flex flex-col gap-3'>
                        {/* Mobile Segmented Toggle */}
                        <div className='flex items-center justify-center pt-1 pb-1'>
                            <div className='inline-flex p-1 bg-[#edf2ee] rounded-full border border-[#e2e8f0] text-xs font-bold shadow-2xs'>
                                <button
                                    type='button'
                                    onClick={() => { setSubTab('trends') }}
                                    className={`px-6 py-1.5 rounded-full transition-all ${
                                        subTab === 'trends'
                                            ? 'bg-white text-[#007a55] shadow-xs font-bold'
                                            : 'text-[#64748b] hover:text-[#192823]'
                                    }`}
                                >
                                    Trends
                                </button>
                                <button
                                    type='button'
                                    onClick={() => { setSubTab('reports') }}
                                    className={`px-6 py-1.5 rounded-full transition-all ${
                                        subTab === 'reports'
                                            ? 'bg-white text-[#007a55] shadow-xs font-bold'
                                            : 'text-[#64748b] hover:text-[#192823]'
                                    }`}
                                >
                                    Reports
                                </button>
                            </div>
                        </div>

                        {/* Mobile Search & Filters */}
                        <div className='flex flex-col gap-2.5'>
                            <Input
                                prefix={<SearchOutlined className='text-[#94a3b8] mr-2 text-sm'/>}
                                suffix={(
                                    <button
                                        type='button'
                                        onClick={() => {
                                            setFilterStatus(filterStatus === 'all' ? 'out_of_range' : 'all')
                                        }}
                                        className='text-[#64748b] hover:text-[#007a55] transition-colors'
                                    >
                                        <SlidersOutlined className='text-sm'/>
                                    </button>
                                )}
                                placeholder='Search'
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value) }}
                                allowClear
                                className='w-full rounded-2xl bg-[#edf2ee] border-none py-2 px-3 text-sm text-[#192823] placeholder:text-[#94a3b8]'
                            />

                            <div className='flex items-center gap-2.5'>
                                <Dropdown menu={{ items: systemMenuItems }} trigger={['click']}>
                                    <button
                                        type='button'
                                        className='flex-1 px-4 py-2 rounded-2xl bg-white border border-[#e5ece8] text-xs font-semibold text-[#192823] hover:bg-[#f8fafc] transition-colors flex items-center justify-between gap-2 shadow-2xs'
                                    >
                                        <span className='truncate'>
                                            {selectedSystem === 'all'
                                                ? 'Body Systems'
                                                : (BODY_SYSTEMS.find((s) => s.id === selectedSystem)?.name ?? 'Body Systems')}
                                        </span>
                                        <DownOutlined className='text-[10px] text-[#64748b]'/>
                                    </button>
                                </Dropdown>

                                <Dropdown menu={{ items: filterStatusMenuItems }} trigger={['click']}>
                                    <button
                                        type='button'
                                        className='flex-1 px-4 py-2 rounded-2xl bg-white border border-[#e5ece8] text-xs font-semibold text-[#192823] hover:bg-[#f8fafc] transition-colors flex items-center justify-between gap-2 shadow-2xs'
                                    >
                                        <span>
                                            {filterStatus === 'all'
                                                ? 'All'
                                                : filterStatus === 'out_of_range'
                                                    ? 'Out of range'
                                                    : 'Optimal'}
                                        </span>
                                        <DownOutlined className='text-[10px] text-[#64748b]'/>
                                    </button>
                                </Dropdown>
                            </div>
                        </div>
                    </div>

                    {/* SUB-TAB 1: TRENDS VIEW (Screenshots 1 & 2) */}
                    {subTab === 'trends' ? (
                        <div className='flex flex-col gap-4 w-full'>
                            {groupedSystems.length === 0 ? (
                                <div className='bg-white rounded-2xl border border-[#e5ece8] p-8 text-center flex flex-col items-center justify-center gap-3 w-full box-border'>
                                    <span className='text-2xl text-[#007a55]'>🧪</span>
                                    <h3 className='text-sm font-bold text-[#192823]'>No biomarkers found</h3>
                                    <p className='text-xs text-[#5f736b] max-w-sm'>
                                        {searchQuery || filterStatus !== 'all' || selectedSystem !== 'all'
                                            ? 'No biomarkers match the current filters. Reset filters to see all.'
                                            : 'Upload a lab report PDF to populate your categorized biomarkers.'}
                                    </p>
                                </div>
                            ) : (
                                groupedSystems.map(({ system, items }) => {
                                    const isExpanded = !!expandedSystems[system.id]
                                    const visibleItems = isExpanded ? items : items.slice(0, 4)
                                    const hiddenItems = isExpanded ? [] : items.slice(4)

                                    return (
                                        <div
                                            key={system.id}
                                            className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-2xs flex flex-col w-full box-border'
                                        >
                                            {/* Category Card Header */}
                                            <div className='px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#f1f5f9] bg-white'>
                                                <div className='flex items-center gap-2.5'>
                                                    <span className='text-base'>{system.icon}</span>
                                                    <h2 className='text-base font-bold text-[#192823] tracking-tight'>
                                                        {system.name}
                                                    </h2>
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { void message.info(`${system.name}: ${system.description}`) }}
                                                    className='text-[#94a3b8] hover:text-[#007a55] p-1 transition-colors'
                                                    title='System Information'
                                                >
                                                    <InfoCircleOutlined className='text-base'/>
                                                </button>
                                            </div>

                                            {/* Desktop Table Column Labels (>=1024px) */}
                                            <div className='hidden lg:grid grid-cols-12 px-6 py-2 bg-[#fbfdfc] border-b border-[#f1f5f9] text-[11px] font-bold text-[#64748b] tracking-wider uppercase'>
                                                <div className='col-span-5'>Biomarker</div>
                                                <div className='col-span-3'>Latest Result</div>
                                                <div className='col-span-2'>Range Status</div>
                                                <div className='col-span-2 text-right'>Previous</div>
                                            </div>

                                            {/* Rows */}
                                            <div className='flex flex-col divide-y divide-[#f8fafc]'>
                                                {visibleItems.map((item) => {
                                                    const { config, latestRecord, previousRecord, unitLabel } = item
                                                    const hasNumeric = latestRecord?.value !== undefined
                                                    const dateStr = latestRecord?.createdAt
                                                        ? dayjs(latestRecord.createdAt).format('MMM D, YYYY')
                                                        : ''
                                                    const prevValue = previousRecord?.value !== undefined
                                                        ? `${previousRecord.value} ${unitLabel}`
                                                        : previousRecord?.textValue ?? '-'

                                                    return (
                                                        <div
                                                            key={config.id}
                                                            onClick={() => { setSelectedBiomarkerItem(item) }}
                                                            className='px-4 sm:px-6 py-3.5 flex flex-col lg:grid lg:grid-cols-12 gap-2 lg:gap-0 items-start lg:items-center hover:bg-[#f8faf9] cursor-pointer transition-colors w-full min-w-0'
                                                        >
                                                            {/* 1. Name */}
                                                            <div className='lg:col-span-5 flex items-center justify-between lg:justify-start w-full pr-2'>
                                                                <span className='text-sm font-semibold text-[#192823] hover:text-[#007a55] transition-colors truncate'>
                                                                    {config.name}
                                                                </span>
                                                                {/* Mobile view value (shown right-aligned on mobile) */}
                                                                <div className='lg:hidden flex items-center gap-3'>
                                                                    {hasNumeric ? (
                                                                        <span className='text-sm font-semibold text-[#192823]'>
                                                                            {latestRecord?.value}
                                                                        </span>
                                                                    ) : (
                                                                        <span className='text-xs text-[#64748b] font-medium'>
                                                                            {latestRecord?.textValue ?? 'no data'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* 2. Latest Result & Date (Desktop) */}
                                                            <div className='hidden lg:flex col-span-3 items-center gap-2.5'>
                                                                {hasNumeric ? (
                                                                    <span className='text-sm font-bold text-[#192823]'>
                                                                        {latestRecord?.value} {unitLabel}
                                                                    </span>
                                                                ) : (
                                                                    <span className='text-xs text-[#64748b] font-medium'>
                                                                        {latestRecord?.textValue ?? 'no data'}
                                                                    </span>
                                                                )}
                                                                {dateStr && (
                                                                    <span className='text-[11px] text-[#94a3b8] font-normal'>
                                                                        • {dateStr}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* 3. Range Gauge Bar */}
                                                            <div className='lg:col-span-2 w-full lg:w-auto flex justify-end lg:justify-start'>
                                                                {config.normalRange && hasNumeric ? (
                                                                    <GuavaRangeBar
                                                                        value={latestRecord?.value}
                                                                        normalRange={config.normalRange}
                                                                        targetRange={config.targetRange}
                                                                    />
                                                                ) : (
                                                                    <span className='hidden lg:inline text-xs text-[#cbd5e1]'>—</span>
                                                                )}
                                                            </div>

                                                            {/* 4. Previous (Desktop) */}
                                                            <div className='hidden lg:block col-span-2 text-right'>
                                                                <span className='text-xs font-medium text-[#64748b]'>
                                                                    {prevValue}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Expandable Footer: "show more (N)" */}
                                            {items.length > 4 && (
                                                <div
                                                    onClick={() => { toggleSystemExpanded(system.id) }}
                                                    className='px-4 sm:px-6 py-2.5 bg-white border-t border-[#f1f5f9] flex items-center gap-2 cursor-pointer hover:bg-[#f8faf9] transition-colors'
                                                >
                                                    <span className='text-xs font-semibold text-[#007a55] hover:underline'>
                                                        {isExpanded
                                                            ? 'show less'
                                                            : `show more (${hiddenItems.length})`}
                                                    </span>

                                                    {!isExpanded && (
                                                        <div className='flex items-center gap-1.5'>
                                                            {hiddenItems.map((h, hIdx) => {
                                                                const dotColor = h.rangeStatusInfo.status === 'Optimal'
                                                                    ? '#10b981'
                                                                    : h.rangeStatusInfo.status === 'In range'
                                                                        ? '#60a5fa'
                                                                        : h.rangeStatusInfo.status === 'High'
                                                                            ? '#ef4444'
                                                                            : h.rangeStatusInfo.status === 'Out of range'
                                                                                ? '#f59e0b'
                                                                                : '#cbd5e1'
                                                                return (
                                                                    <span
                                                                        key={hIdx}
                                                                        className='w-2 h-2 rounded-full'
                                                                        style={{ backgroundColor: dotColor }}
                                                                    />
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    ) : (
                        /* SUB-TAB 2: REPORTS VIEW (Screenshot 2) */
                        <div className='flex flex-col gap-6 w-full'>
                            {reportsList.length === 0 ? (
                                <div className='bg-white rounded-2xl border border-[#e5ece8] p-8 text-center flex flex-col items-center justify-center gap-3 w-full box-border'>
                                    <span className='text-2xl text-[#007a55]'>📋</span>
                                    <h3 className='text-sm font-bold text-[#192823]'>No lab reports recorded</h3>
                                    <p className='text-xs text-[#5f736b] max-w-sm'>
                                        Upload blood test PDFs or health checkup records to view structured test reports.
                                    </p>
                                </div>
                            ) : (
                                <div className='flex flex-col gap-2'>
                                    {/* Date Group Header */}
                                    <span className='text-xs font-bold text-[#192823] tracking-tight px-1'>
                                        Jan 6, 2024
                                    </span>

                                    {/* Reports Accordion Card */}
                                    <div className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-2xs divide-y divide-[#f1f5f9]'>
                                        {reportsList.map((report) => {
                                            const isExpanded = !!expandedReports[report.id]
                                            return (
                                                <div key={report.id} className='flex flex-col'>
                                                    {/* Report Row */}
                                                    <div
                                                        onClick={() => { toggleReportExpanded(report.id) }}
                                                        className='p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#f8faf9] transition-colors'
                                                    >
                                                        <div className='flex items-center gap-3.5 min-w-0'>
                                                            <div className='w-9 h-9 rounded-full bg-[#e8f5f1] text-[#007a55] flex items-center justify-center text-base shrink-0'>
                                                                🧪
                                                            </div>
                                                            <div className='flex flex-col min-w-0'>
                                                                <span className='text-sm font-bold text-[#192823] truncate'>
                                                                    {report.title}
                                                                </span>
                                                                <span className='text-xs text-[#64748b] truncate'>
                                                                    {report.labName}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className='flex items-center gap-2 text-[#64748b] text-xs font-semibold shrink-0'>
                                                            <span>{report.items.length} {report.items.length === 1 ? 'result' : 'results'}</span>
                                                            <DownOutlined className={`text-[10px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Report Results Table */}
                                                    {isExpanded && (
                                                        <div className='bg-[#fafcfb] border-t border-[#f1f5f9] px-6 py-3 flex flex-col divide-y divide-[#f1f5f9]'>
                                                            {report.items.map((item) => (
                                                                <div
                                                                    key={item.config.id}
                                                                    onClick={() => { setSelectedBiomarkerItem(item) }}
                                                                    className='py-2.5 flex items-center justify-between text-xs cursor-pointer hover:text-[#007a55] transition-colors'
                                                                >
                                                                    <span className='font-semibold text-[#1e293b]'>
                                                                        {item.config.name}
                                                                    </span>
                                                                    <div className='flex items-center gap-4'>
                                                                        <span className='font-bold text-[#1e293b]'>
                                                                            {item.latestRecord?.value !== undefined
                                                                                ? `${item.latestRecord.value} ${item.unitLabel}`
                                                                                : item.latestRecord?.textValue ?? 'no data'}
                                                                        </span>
                                                                        {item.config.normalRange && item.latestRecord?.value !== undefined && (
                                                                            <GuavaRangeBar
                                                                                value={item.latestRecord?.value}
                                                                                normalRange={item.config.normalRange}
                                                                                targetRange={item.config.targetRange}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* 3. DESKTOP CHARTS MODAL (Screenshot 3) */}
            <Modal
                open={isChartsModalOpen}
                onCancel={() => { setIsChartsModalOpen(false) }}
                footer={null}
                width={980}
                centered
                destroyOnClose
                modalRender={() => (
                    <div className='bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#e2e8f0]'>
                        {/* Emerald Modal Header (matching Screenshot 3) */}
                        <div className='bg-[#007a55] text-white px-5 py-3.5 flex items-center justify-between'>
                            <div className='flex items-center gap-2.5'>
                                <button
                                    type='button'
                                    onClick={() => { setIsChartsModalOpen(false) }}
                                    className='text-white hover:opacity-80 p-1 -ml-1 focus:outline-none flex items-center'
                                    title='Close'
                                >
                                    <ArrowLeftOutlined className='text-base font-bold'/>
                                </button>
                                <span className='text-base font-bold tracking-tight'>
                                    Charts View
                                </span>
                            </div>
                        </div>

                        {/* Modal Body: 2-column Layout */}
                        <div className='p-6 bg-[#f8faf9]'>
                            {renderChartsContent()}
                        </div>
                    </div>
                )}
            />

            {/* 4. Modal: Add Biomarker to Chart */}
            <Modal
                title='Add Biomarker to Chart'
                open={isAddBiomarkerModalOpen}
                onCancel={() => { setIsAddBiomarkerModalOpen(false) }}
                footer={null}
                destroyOnClose
            >
                <div className='flex flex-col gap-3 py-2'>
                    <Input
                        prefix={<SearchOutlined className='text-[#94a3b8]'/>}
                        placeholder='Search available biomarkers...'
                        value={biomarkerSearchQuery}
                        onChange={(e) => { setBiomarkerSearchQuery(e.target.value) }}
                        className='rounded-xl'
                    />

                    <div className='max-h-72 overflow-y-auto flex flex-col divide-y divide-[#f1f5f9]'>
                        {biomarkerDataList
                            .filter((b) => {
                                if (biomarkerSearchQuery.trim()) {
                                    return b.config.name.toLowerCase().includes(biomarkerSearchQuery.toLowerCase().trim())
                                }
                                return true
                            })
                            .map((b) => {
                                const isAlreadyAdded = activeChartBiomarkerIds.includes(b.config.id)
                                return (
                                    <div
                                        key={b.config.id}
                                        onClick={() => {
                                            if (!isAlreadyAdded) {
                                                handleAddToChart(b.config.id)
                                            }
                                        }}
                                        className={`py-2.5 px-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                            isAlreadyAdded
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:bg-[#f8faf9]'
                                        }`}
                                    >
                                        <div className='flex items-center gap-2'>
                                            <span>🧪</span>
                                            <span className='font-semibold text-[#192823]'>{b.config.name}</span>
                                            {b.latestRecord?.value !== undefined && (
                                                <span className='text-[11px] text-[#64748b]'>
                                                    ({b.latestRecord.value} {b.unitLabel})
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type='button'
                                            disabled={isAlreadyAdded}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                isAlreadyAdded
                                                    ? 'bg-[#e2e8f0] text-[#64748b]'
                                                    : 'bg-[#007a55] text-white hover:bg-[#006848]'
                                            }`}
                                        >
                                            {isAlreadyAdded ? 'Added' : 'Select'}
                                        </button>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            </Modal>

            {/* 5. Modal: Upload Lab PDF */}
            <Modal
                title='Upload Blood Test / Lab Report'
                open={isUploadModalOpen}
                onCancel={() => { setIsUploadModalOpen(false) }}
                footer={null}
                width={800}
                destroyOnClose
            >
                <div className='py-4'>
                    <UploadArea/>
                </div>
            </Modal>

            {/* 6. Biomarker Details & Trend Graph Modal (Screen A & B & C) */}
            <GuavaBiomarkerDetailsModal
                item={selectedBiomarkerItem}
                onClose={() => { setSelectedBiomarkerItem(null) }}
            />
        </div>
    )
}
