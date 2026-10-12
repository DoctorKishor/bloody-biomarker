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
    CheckOutlined,
} from '@ant-design/icons'
import { Dropdown, Input, Modal, Tooltip, message, MenuProps } from 'antd'
import dayjs from 'dayjs'

import { GuavaRangeBar } from '@/components/GuavaRangeBar'
import { UploadArea } from '@/components/UploadArea'
import { BODY_SYSTEMS, OTHER_SYSTEM, getBiomarkerSystem } from '@/constants/bodySystems'
import { useBiomarkerConfigs } from '@/db/models/biomarkerConfig'
import { useBiomarkerRecords } from '@/db/models/biomarkerRecord'
import { useDocuments } from '@/db/models/document'
import { getNameByUcum, useUnits } from '@/db/models/unit'
import { useCurrentUser } from '@/db/models/user'
import { exportData } from '@/utils/exportData'
import { evaluateBiomarkerRange } from '@/utils/referenceRange/biomarkerRangeEngine'

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
    const [focusedChartBiomarkerId, setFocusedChartBiomarkerId] = useState<string | null>(null)
    const [hoveredPointData, setHoveredPointData] = useState<{
        x: number
        dateStr: string
        items: Array<{ name: string, value: number, unit: string, color: string, isFocused: boolean }>
    } | null>(null)
    const [isAddBiomarkerModalOpen, setIsAddBiomarkerModalOpen] = useState(false)
    const [biomarkerSearchQuery, setBiomarkerSearchQuery] = useState('')

    const currentUser = useCurrentUser()
    const userGender = currentUser?.gender ?? 'male'
    const userAge = currentUser?.age ?? 35

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

            const reportRangeRaw = latestRecord?.referenceRange ?? latestRecord?.referenceRangeString ?? config.normalRange
            const evaluation = evaluateBiomarkerRange({
                biomarkerName: config.name,
                value: latestRecord?.value,
                unit: unitLabel,
                reportRangeRaw,
                userGender,
                userAge,
            })

            const rangeStatusInfo = {
                status: evaluation.statusLabel,
                color: evaluation.statusColor,
                clinicalStatus: evaluation.status,
            }
            const isOutOfRange = evaluation.isAbnormal

            const doc = latestRecord?.documentId
                ? documents.find((d) => d.id === latestRecord.documentId)
                : undefined

            return {
                config,
                latestRecord,
                previousRecord,
                allRecords: configRecords,
                system,
                unitLabel,
                rangeStatusInfo,
                isOutOfRange,
                reportRangeRaw,
                documentTitle: doc ? (doc.lab ?? doc.originalName ?? doc.fileName) : undefined,
            }
        })
    }, [configs, records, units, documents, userGender, userAge])

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

    // Group records into Reports (Screenshot 2), filtered by search & out-of-range
    const reportsList = useMemo(() => {
        // Build map of document ID -> records
        const docGroups: Record<string, typeof biomarkerDataList> = {}

        for (const b of biomarkerDataList) {
            // Apply Out of Range filter
            if (filterStatus === 'out_of_range' && !b.isOutOfRange) {
                continue
            }
            if (filterStatus === 'optimal' && b.rangeStatusInfo.status !== 'Optimal') {
                continue
            }

            // Apply search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim()
                const matchesName = b.config.name.toLowerCase().includes(q)
                const matchesSystem = b.system.name.toLowerCase().includes(q)
                if (!matchesName && !matchesSystem) continue
            }

            if (b.latestRecord?.documentId) {
                const docId = b.latestRecord.documentId
                if (!docGroups[docId]) {
                    docGroups[docId] = []
                }
                docGroups[docId].push(b)
            } else if (b.latestRecord) {
                const directId = 'direct-health-entry'
                if (!docGroups[directId]) {
                    docGroups[directId] = []
                }
                docGroups[directId].push(b)
            }
        }

        const reports = Object.entries(docGroups).map(([docId, items]) => {
            const doc = documents.find((d) => d.id === docId)
            const rawDate = doc?.testDate ?? doc?.uploadDate ?? items[0]?.latestRecord?.createdAt
            const dateStr = rawDate ? dayjs(rawDate).format('MMM D, YYYY') : 'Recent'
            const labName = doc?.lab?.trim() ? doc.lab.trim() : (doc?.originalName ?? 'Clinical Laboratory')

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

        return reports
    }, [biomarkerDataList, documents, filterStatus, searchQuery])

    // Group reports by date string for structured timeline display
    const reportsByDate = useMemo(() => {
        const groups: Record<string, typeof reportsList> = {}
        for (const r of reportsList) {
            const d = r.dateStr || 'Recent'
            if (!groups[d]) {
                groups[d] = []
            }
            groups[d].push(r)
        }
        return groups
    }, [reportsList])

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
            [reportId]: !(prev[reportId] ?? true),
        }))
    }

    const handleRemoveFromChart = (id: string) => {
        const next = activeChartBiomarkerIds.filter((item) => item !== id)
        setSelectedChartBiomarkerIds(next)
        if (focusedChartBiomarkerId === id) {
            setFocusedChartBiomarkerId(next[0] ?? null)
        }
    }

    const handleAddToChart = (id: string) => {
        if (!activeChartBiomarkerIds.includes(id)) {
            setSelectedChartBiomarkerIds([...activeChartBiomarkerIds, id])
        }
        setFocusedChartBiomarkerId(id)
        setIsAddBiomarkerModalOpen(false)
        void message.success('Added biomarker to chart')
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

    // Time range configuration and dynamic X-axis domain
    const timeRangeConfig = useMemo(() => {
        const now = dayjs()
        let start = now.subtract(3, 'year')

        switch (timeRange) {
            case '1M':
                start = now.subtract(1, 'month')
                break
            case '3M':
                start = now.subtract(3, 'month')
                break
            case '1Y':
                start = now.subtract(1, 'year')
                break
            case '2Y':
                start = now.subtract(2, 'year')
                break
            case '3Y':
            default:
                start = now.subtract(3, 'year')
                break
        }

        const startMs = start.valueOf()
        const endMs = now.valueOf()
        const totalMs = Math.max(1, endMs - startMs)

        // 4 Dynamic date ticks along the X-axis
        const tickCount = 4
        const ticks: Array<{ label: string, pct: number, dateStr: string }> = []
        for (let i = 0; i <= tickCount; i++) {
            const tMs = startMs + (i / tickCount) * totalMs
            const d = dayjs(tMs)
            let label = d.format('MMM YYYY')
            if (timeRange === '1M' || timeRange === '3M') {
                label = d.format('MMM D')
            }
            if (i === tickCount) {
                label = 'Today'
            }
            ticks.push({
                label,
                pct: (i / tickCount) * 100,
                dateStr: d.format('MMM D, YYYY'),
            })
        }

        return {
            start,
            end: now,
            startMs,
            endMs,
            totalMs,
            ticks,
            headerRangeText: `${start.format('MMM D, YYYY')} – ${now.format('MMM D, YYYY')}`,
        }
    }, [timeRange])

    // Currently focused metric for primary Y-axis scale
    const focusedBiomarker = useMemo(() => {
        if (focusedChartBiomarkerId) {
            const found = activeChartItems.find((b) => b.config.id === focusedChartBiomarkerId)
            if (found) return found
        }
        return activeChartItems[0] ?? null
    }, [activeChartItems, focusedChartBiomarkerId])

    // Generate comprehensive timeline plot data with Y-axis and multi-series curves
    const chartRenderData = useMemo(() => {
        if (activeChartItems.length === 0) return null

        const { startMs, endMs, totalMs } = timeRangeConfig
        const SVG_WIDTH = 520
        const SVG_HEIGHT = 200
        const PAD_LEFT = 48
        const PAD_RIGHT = 24
        const PAD_TOP = 24
        const PAD_BOTTOM = 30
        const PLOT_W = SVG_WIDTH - PAD_LEFT - PAD_RIGHT
        const PLOT_H = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM

        // 1. Determine Y-scale for the focused biomarker
        let fMin = 0
        let fMax = 100
        const fNormalMin = focusedBiomarker?.config.normalRange?.min
        const fNormalMax = focusedBiomarker?.config.normalRange?.max

        if (focusedBiomarker) {
            const fVals = focusedBiomarker.allRecords
                .map((r) => r.value)
                .filter((v): v is number => typeof v === 'number')
            const allRef = [
                ...fVals,
                fNormalMin,
                fNormalMax,
                focusedBiomarker.latestRecord?.value,
            ].filter((v): v is number => typeof v === 'number')

            if (allRef.length > 0) {
                const maxV = Math.max(...allRef)
                const minV = Math.min(...allRef)
                fMax = maxV <= 5 ? Math.ceil(maxV * 1.3 * 10) / 10 : Math.ceil(maxV * 1.25)
                fMin = minV < 0 ? Math.floor(minV * 1.1) : 0
            }
        }
        const fSpan = Math.max(0.1, fMax - fMin)

        // 4 Clean Y-Ticks for focused metric
        const yTicks = [
            {
                val: Math.round(fMax * 10) / 10,
                y: PAD_TOP,
            },
            {
                val: Math.round((fMin + fSpan * 0.66) * 10) / 10,
                y: PAD_TOP + PLOT_H * 0.33,
            },
            {
                val: Math.round((fMin + fSpan * 0.33) * 10) / 10,
                y: PAD_TOP + PLOT_H * 0.66,
            },
            {
                val: Math.round(fMin * 10) / 10,
                y: PAD_TOP + PLOT_H,
            },
        ]

        // 2. Normal range band for focused biomarker
        let optimalBand: { y: number, height: number } | null = null
        if (fNormalMax !== undefined || fNormalMin !== undefined) {
            const topVal = fNormalMax ?? fMax
            const botVal = fNormalMin ?? 0
            const topRatio = Math.max(0, Math.min(1, (topVal - fMin) / fSpan))
            const botRatio = Math.max(0, Math.min(1, (botVal - fMin) / fSpan))
            const yTop = PAD_TOP + PLOT_H - topRatio * PLOT_H
            const yBot = PAD_TOP + PLOT_H - botRatio * PLOT_H
            optimalBand = {
                y: yTop,
                height: Math.max(12, yBot - yTop),
            }
        }

        // 3. Process records and plot points for each selected biomarker
        const series = activeChartItems.map((item, itemIdx) => {
            const isFocused = item.config.id === focusedBiomarker?.config.id
            const sortedRecords = item.allRecords
                .filter((r) => r.value !== undefined)
                .sort((a, b) => {
                    const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                    const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                    return dA - dB
                })

            // Filter by time range, but ensure at least latest record is included if empty
            let inRangeRecords = sortedRecords.filter((r) => {
                const t = r.createdAt ? new Date(r.createdAt).getTime() : 0
                return t >= startMs && t <= endMs
            })
            if (inRangeRecords.length === 0 && sortedRecords.length > 0) {
                inRangeRecords = [sortedRecords[sortedRecords.length - 1]]
            }

            // Apply Granularity bucket sampling
            const bucketedRecords: typeof inRangeRecords = []
            const seenBuckets = new Set<string>()

            for (let i = inRangeRecords.length - 1; i >= 0; i--) {
                const rec = inRangeRecords[i]
                const d = dayjs(rec.createdAt ?? undefined)
                let bucketKey = d.format('YYYY-MM-DD')
                if (granularity === 'Monthly') bucketKey = d.format('YYYY-MM')
                if (granularity === 'Weekly') bucketKey = `${d.year()}-W${Math.ceil(d.date() / 7)}`

                if (!seenBuckets.has(bucketKey)) {
                    seenBuckets.add(bucketKey)
                    bucketedRecords.unshift(rec)
                }
            }

            // Fallback points if biomarker has 0 records in database
            if (bucketedRecords.length === 0) {
                const defaultVal = item.latestRecord?.value ?? 50
                const pts = [
                    {
                        x: PAD_LEFT + PLOT_W * 0.2,
                        y: PAD_TOP + PLOT_H * 0.5,
                        val: defaultVal,
                        dateStr: 'Recent',
                    },
                    {
                        x: PAD_LEFT + PLOT_W * 0.8,
                        y: PAD_TOP + PLOT_H * 0.45,
                        val: defaultVal,
                        dateStr: 'Today',
                    },
                ]
                return {
                    item,
                    isFocused,
                    points: pts,
                    pathString: `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`,
                    latestValue: `${defaultVal}`,
                    unitLabel: item.unitLabel,
                }
            }

            // Item-specific scaling for non-focused metrics
            const itemVals = sortedRecords.map((r) => r.value).filter((v): v is number => typeof v === 'number')
            const itemMax = itemVals.length > 0 ? Math.max(...itemVals) * 1.25 : 100
            const itemMin = itemVals.length > 0 && Math.min(...itemVals) < 0 ? Math.min(...itemVals) * 1.1 : 0
            const itemSpan = Math.max(0.1, itemMax - itemMin)

            const points = bucketedRecords.map((rec) => {
                const recTime = rec.createdAt ? new Date(rec.createdAt).getTime() : endMs
                const xRatio = Math.max(0.04, Math.min(0.96, (recTime - startMs) / totalMs))
                const x = PAD_LEFT + xRatio * PLOT_W

                let y: number
                const pointVal = rec.value ?? 0
                if (isFocused) {
                    const yRatio = (pointVal - fMin) / fSpan
                    y = PAD_TOP + PLOT_H - Math.max(0.05, Math.min(0.95, yRatio)) * PLOT_H
                } else {
                    // Staggered distinct vertical positioning ensuring all metrics are visible
                    const selfRatio = (pointVal - itemMin) / itemSpan
                    const baseStagger = PAD_TOP + 28 + ((itemIdx % 3) * 44)
                    y = Math.max(PAD_TOP + 12, Math.min(PAD_TOP + PLOT_H - 12, baseStagger - (selfRatio - 0.5) * 30))
                }

                return {
                    dateStr: rec.createdAt ? dayjs(rec.createdAt).format('MMM D, YYYY') : 'Recent',
                    val: pointVal,
                    x,
                    y,
                }
            })

            let pathString = ''
            if (points.length >= 2) {
                pathString = points.map((p, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
            }

            return {
                item,
                isFocused,
                points,
                pathString,
                latestValue: item.latestRecord?.value !== undefined ? `${item.latestRecord.value}` : '-',
                unitLabel: item.unitLabel,
            }
        })

        return {
            SVG_WIDTH,
            SVG_HEIGHT,
            PAD_LEFT,
            PAD_RIGHT,
            PAD_TOP,
            PAD_BOTTOM,
            PLOT_W,
            PLOT_H,
            yTicks,
            optimalBand,
            series,
        }
    }, [activeChartItems, focusedBiomarker, timeRangeConfig, granularity])

    // Charts View Content (Shared between mobile view and desktop modal)
    const renderChartsContent = () => (
        <div className='flex flex-col lg:flex-row gap-5 w-full box-border'>
            {/* Left: Interactive Multi-Line Timeline Chart Card */}
            <div className='flex-1 bg-white rounded-2xl border border-[#e5ece8] p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4'>
                <div className='flex flex-col gap-2'>
                    {/* Dynamic Date Header */}
                    <div className='flex items-center justify-between'>
                        <span className='text-xs font-bold text-[#192823] tracking-tight'>
                            {timeRangeConfig.headerRangeText}
                        </span>
                        {focusedBiomarker && (
                            <span className='text-[11px] font-semibold text-[#007a55] bg-[#e8f5f1] px-2.5 py-0.5 rounded-full'>
                                Y-Axis: {focusedBiomarker.config.name} ({focusedBiomarker.unitLabel})
                            </span>
                        )}
                    </div>

                    {/* Interactive Legend / Plotted values list (Clickable to switch focused Y-axis) */}
                    <div className='flex flex-wrap gap-2 pt-1'>
                        {chartRenderData?.series.map(({ item, isFocused, latestValue }) => (
                            <button
                                key={item.config.id}
                                type='button'
                                onClick={() => { setFocusedChartBiomarkerId(item.config.id) }}
                                className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                                    isFocused
                                        ? 'bg-[#f0fdf4] border-[#007a55] text-[#007a55] shadow-xs'
                                        : 'bg-white border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc]'
                                }`}
                                title='Click to focus this biomarker on Y-axis'
                            >
                                <span
                                    className='w-3 h-3 rounded-full shrink-0 flex items-center justify-center'
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className='font-semibold'>{item.config.name}</span>
                                <span className='text-[#64748b] font-bold'>{latestValue} {item.unitLabel}</span>
                                {isFocused && (
                                    <span className='text-[10px] text-[#007a55] font-bold ml-0.5'>✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SVG Trend Multi-Line Chart with Real Axes */}
                <div className='relative w-full bg-[#fafcfb] rounded-2xl border border-[#eef2f0] p-2.5 shadow-2xs overflow-visible'>
                    {chartRenderData ? (
                        <svg
                            className='w-full h-56 sm:h-64 overflow-visible select-none'
                            viewBox={`0 0 ${chartRenderData.SVG_WIDTH} ${chartRenderData.SVG_HEIGHT}`}
                            onMouseLeave={() => { setHoveredPointData(null) }}
                        >
                            {/* Horizontal Gridlines & Y-Axis Numeric Ticks */}
                            {chartRenderData.yTicks.map((yt, idx) => (
                                <g key={idx}>
                                    <line
                                        x1={chartRenderData.PAD_LEFT}
                                        y1={yt.y}
                                        x2={chartRenderData.PAD_LEFT + chartRenderData.PLOT_W}
                                        y2={yt.y}
                                        stroke='#e2e8f0'
                                        strokeWidth='1'
                                        strokeDasharray={idx === chartRenderData.yTicks.length - 1 ? undefined : '3 3'}
                                    />
                                    <text
                                        x={chartRenderData.PAD_LEFT - 8}
                                        y={yt.y + 3}
                                        textAnchor='end'
                                        fill='#64748b'
                                        fontSize='10'
                                        fontWeight='500'
                                    >
                                        {yt.val}
                                    </text>
                                </g>
                            ))}

                            {/* Shaded Optimal Range Zone */}
                            {chartRenderData.optimalBand && (
                                <g>
                                    <rect
                                        x={chartRenderData.PAD_LEFT}
                                        y={chartRenderData.optimalBand.y}
                                        width={chartRenderData.PLOT_W}
                                        height={chartRenderData.optimalBand.height}
                                        fill='#10b981'
                                        fillOpacity='0.08'
                                        stroke='#10b981'
                                        strokeOpacity='0.25'
                                        strokeDasharray='3 3'
                                        rx='4'
                                    />
                                    <text
                                        x={chartRenderData.PAD_LEFT + chartRenderData.PLOT_W - 6}
                                        y={chartRenderData.optimalBand.y + 11}
                                        textAnchor='end'
                                        fill='#059669'
                                        fontSize='8.5'
                                        fontWeight='600'
                                    >
                                        Optimal Zone
                                    </text>
                                </g>
                            )}

                            {/* Vertical Date Gridlines */}
                            {timeRangeConfig.ticks.map((t, idx) => {
                                const xPos = chartRenderData.PAD_LEFT + (t.pct / 100) * chartRenderData.PLOT_W
                                return (
                                    <line
                                        key={idx}
                                        x1={xPos}
                                        y1={chartRenderData.PAD_TOP}
                                        x2={xPos}
                                        y2={chartRenderData.PAD_TOP + chartRenderData.PLOT_H}
                                        stroke='#f1f5f9'
                                        strokeWidth='1'
                                    />
                                )
                            })}

                            {/* Plotted Series Lines & Points */}
                            {chartRenderData.series.map(({ item, isFocused, points, pathString }) => (
                                <g key={item.config.id}>
                                    {/* Continuous connecting line */}
                                    {points.length >= 2 && (
                                        <path
                                            d={pathString}
                                            fill='none'
                                            stroke={item.color}
                                            strokeWidth={isFocused ? 2.5 : 1.8}
                                            strokeDasharray={isFocused ? undefined : '4 2'}
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            className='transition-all'
                                        />
                                    )}

                                    {/* Single record dashed level guide */}
                                    {points.length === 1 && (
                                        <line
                                            x1={chartRenderData.PAD_LEFT}
                                            y1={points[0].y}
                                            x2={chartRenderData.PAD_LEFT + chartRenderData.PLOT_W}
                                            y2={points[0].y}
                                            stroke={item.color}
                                            strokeWidth='1.2'
                                            strokeDasharray='3 3'
                                            opacity='0.4'
                                        />
                                    )}

                                    {/* Data Points and Value Badges */}
                                    {points.map((pt, pIdx) => {
                                        const badgeW = 75
                                        const badgeX = Math.min(
                                            pt.x + 8,
                                            chartRenderData.PAD_LEFT + chartRenderData.PLOT_W - badgeW,
                                        )
                                        const badgeY = Math.max(chartRenderData.PAD_TOP + 4, pt.y - 12)

                                        return (
                                            <g key={pIdx}>
                                                {/* Point halo & circle */}
                                                <circle
                                                    cx={pt.x}
                                                    cy={pt.y}
                                                    r={isFocused ? '5' : '4'}
                                                    fill={item.color}
                                                    stroke='white'
                                                    strokeWidth='2'
                                                    className='cursor-pointer'
                                                    onMouseEnter={() => {
                                                        setHoveredPointData({
                                                            x: pt.x,
                                                            dateStr: pt.dateStr,
                                                            items: chartRenderData.series.map((s) => ({
                                                                name: s.item.config.name,
                                                                value: s.points[0]?.val ?? 0,
                                                                unit: s.unitLabel,
                                                                color: s.item.color,
                                                                isFocused: s.isFocused,
                                                            })),
                                                        })
                                                    }}
                                                />

                                                {/* Readable Value Pill Label */}
                                                <g transform={`translate(${badgeX}, ${badgeY})`} className='pointer-events-none'>
                                                    <rect
                                                        width={badgeW}
                                                        height='18'
                                                        rx='4'
                                                        fill='white'
                                                        stroke={item.color}
                                                        strokeWidth='1'
                                                        filter='drop-shadow(0px 1px 2px rgba(0,0,0,0.06))'
                                                    />
                                                    <text
                                                        x={badgeW / 2}
                                                        y='12'
                                                        textAnchor='middle'
                                                        fill={item.color}
                                                        fontSize='9'
                                                        fontWeight='bold'
                                                    >
                                                        {pt.val} {item.unitLabel}
                                                    </text>
                                                </g>
                                            </g>
                                        )
                                    })}
                                </g>
                            ))}

                            {/* Interactive Hover Crosshair */}
                            {hoveredPointData && (
                                <line
                                    x1={hoveredPointData.x}
                                    y1={chartRenderData.PAD_TOP}
                                    x2={hoveredPointData.x}
                                    y2={chartRenderData.PAD_TOP + chartRenderData.PLOT_H}
                                    stroke='#007a55'
                                    strokeWidth='1.5'
                                    strokeDasharray='3 3'
                                />
                            )}
                        </svg>
                    ) : (
                        <div className='h-48 flex items-center justify-center text-xs text-[#94a3b8]'>
                            No biomarkers selected. Use '+ Add' below to display biomarkers.
                        </div>
                    )}

                    {/* Dynamic X-Axis Date Ticks along timeline */}
                    <div
                        className='relative w-full h-5 mt-1'
                        style={{
                            paddingLeft: `${chartRenderData?.PAD_LEFT ?? 48}px`,
                            paddingRight: `${chartRenderData?.PAD_RIGHT ?? 24}px`,
                        }}
                    >
                        <div className='relative w-full h-full'>
                            {timeRangeConfig.ticks.map((t, idx) => (
                                <span
                                    key={idx}
                                    className='absolute -translate-x-1/2 text-[10px] text-[#64748b] font-semibold'
                                    style={{ left: `${t.pct}%` }}
                                >
                                    {t.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Range & Granularity Selectors (Fully Interactive) */}
                <div className='flex items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9]'>
                    {/* Time Range Pills */}
                    <div className='inline-flex items-center bg-[#f8fafc] rounded-full p-1 border border-[#e2e8f0] text-xs font-semibold'>
                        {(['1M', '3M', '1Y', '2Y', '3Y'] as const).map((r) => {
                            const isActive = timeRange === r
                            return (
                                <button
                                    key={r}
                                    type='button'
                                    onClick={() => { setTimeRange(r) }}
                                    className={`px-3 py-1 rounded-full transition-colors text-xs cursor-pointer ${
                                        isActive
                                            ? 'bg-[#007a55] text-white font-bold shadow-xs'
                                            : 'text-[#64748b] hover:text-[#192823]'
                                    }`}
                                >
                                    {r}
                                </button>
                            )
                        })}
                    </div>

                    {/* Granularity Dropdown */}
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
                            className='px-3.5 py-1.5 rounded-full border border-[#cbd5e1] bg-white text-xs font-semibold text-[#1e293b] hover:bg-[#f8fafc] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs'
                        >
                            <span>{granularity}</span>
                            <DownOutlined className='text-[10px] text-[#64748b]'/>
                        </button>
                    </Dropdown>
                </div>
            </div>

            {/* Right: Configure Card (Interactive Add/Remove) */}
            <div className='w-full lg:w-72 bg-white rounded-2xl border border-[#e5ece8] p-4 sm:p-5 shadow-xs flex flex-col gap-4 box-border shrink-0'>
                <div className='flex items-center justify-between'>
                    <h2 className='text-sm font-bold text-[#192823] tracking-tight'>
                        Configure
                    </h2>
                    <span className='text-[11px] text-[#64748b] font-medium'>
                        {activeChartItems.length} selected
                    </span>
                </div>

                <div className='flex flex-col divide-y divide-[#f1f5f9] flex-1 max-h-64 overflow-y-auto'>
                    {activeChartItems.map((item) => {
                        const isFocused = item.config.id === focusedBiomarker?.config.id
                        return (
                            <div
                                key={item.config.id}
                                onClick={() => { setFocusedChartBiomarkerId(item.config.id) }}
                                className={`py-2.5 px-2 rounded-xl flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
                                    isFocused ? 'bg-[#f0fdf4]' : 'hover:bg-[#f8fafc]'
                                }`}
                            >
                                <div className='flex items-center gap-2.5 truncate'>
                                    <span
                                        className='w-2.5 h-2.5 rounded-full shrink-0'
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className='truncate font-semibold text-[#1e293b]'>{item.config.name}</span>
                                </div>
                                <div className='flex items-center gap-2 shrink-0'>
                                    {item.latestRecord?.value !== undefined && (
                                        <span className='text-[#64748b] text-[11px] font-bold'>
                                            {item.latestRecord.value} {item.unitLabel}
                                        </span>
                                    )}
                                    <button
                                        type='button'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveFromChart(item.config.id)
                                        }}
                                        className='text-[#94a3b8] hover:text-[#ef4444] p-1 rounded-full transition-colors'
                                        title='Remove from chart'
                                    >
                                        <CloseOutlined className='text-xs'/>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <button
                    type='button'
                    onClick={() => { setIsAddBiomarkerModalOpen(true) }}
                    className='mt-auto mx-auto px-6 py-2 rounded-full border border-[#007a55] bg-white text-[#007a55] hover:bg-[#e8f5f1] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs'
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
                        <button
                            type='button'
                            onClick={() => {
                                setFilterStatus((prev) => (prev === 'out_of_range' ? 'all' : 'out_of_range'))
                            }}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer select-none ${
                                filterStatus === 'out_of_range'
                                    ? 'bg-[#e8f5f1] border-[#007a55] text-[#007a55]'
                                    : 'bg-white border-[#e5ece8] text-[#192823] hover:bg-[#f8fafc]'
                            }`}
                        >
                            <span
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                    filterStatus === 'out_of_range'
                                        ? 'border-[#007a55] bg-[#007a55] text-white text-[9px]'
                                        : 'border-[#94a3b8] bg-white'
                                }`}
                            >
                                {filterStatus === 'out_of_range' ? (
                                    <CheckOutlined className='text-[8px] text-white'/>
                                ) : null}
                            </span>
                            <span>Out of Range</span>
                            <Tooltip title='Filter to show only out-of-range biomarkers'>
                                <InfoCircleOutlined
                                    className={`text-[11px] transition-colors ${
                                        filterStatus === 'out_of_range' ? 'text-[#007a55]' : 'text-[#94a3b8]'
                                    }`}
                                />
                            </Tooltip>
                        </button>
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
                                                                {hasNumeric ? (
                                                                    <GuavaRangeBar
                                                                        value={latestRecord?.value}
                                                                        normalRange={config.normalRange}
                                                                        targetRange={config.targetRange}
                                                                        biomarkerName={config.name}
                                                                        unitLabel={unitLabel}
                                                                        reportRangeRaw={latestRecord?.referenceRange ?? latestRecord?.referenceRangeString}
                                                                        userGender={userGender}
                                                                        userAge={userAge}
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
                                    <h3 className='text-sm font-bold text-[#192823]'>
                                        {filterStatus === 'out_of_range'
                                            ? 'No out-of-range biomarkers found'
                                            : 'No lab reports recorded'}
                                    </h3>
                                    <p className='text-xs text-[#5f736b] max-w-sm'>
                                        {filterStatus === 'out_of_range'
                                            ? 'All biomarkers in your lab reports are within their optimal reference ranges.'
                                            : 'Upload blood test PDFs or health checkup records to view structured test reports.'}
                                    </p>
                                    {filterStatus === 'out_of_range' && (
                                        <button
                                            type='button'
                                            onClick={() => { setFilterStatus('all') }}
                                            className='mt-2 px-4 py-1.5 rounded-full bg-[#007a55] text-white text-xs font-semibold hover:bg-[#006244] transition-colors cursor-pointer shadow-xs'
                                        >
                                            Show All Biomarkers
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className='flex flex-col gap-6'>
                                    {Object.entries(reportsByDate).map(([dateStr, reportsInDate]) => (
                                        <div key={dateStr} className='flex flex-col gap-2'>
                                            {/* Date Group Header */}
                                            <span className='text-xs font-bold text-[#192823] tracking-tight px-1'>
                                                {dateStr}
                                            </span>

                                            {/* Reports Accordion Card */}
                                            <div className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-2xs divide-y divide-[#f1f5f9]'>
                                                {reportsInDate.map((report) => {
                                                    const isExpanded = expandedReports[report.id] ?? true
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
                                                                                {item.latestRecord?.value !== undefined && (
                                                                                    <GuavaRangeBar
                                                                                        value={item.latestRecord?.value}
                                                                                        normalRange={item.config.normalRange}
                                                                                        targetRange={item.config.targetRange}
                                                                                        biomarkerName={item.config.name}
                                                                                        unitLabel={item.unitLabel}
                                                                                        reportRangeRaw={item.latestRecord?.referenceRange ?? item.latestRecord?.referenceRangeString}
                                                                                        userGender={userGender}
                                                                                        userAge={userAge}
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
                                    ))}
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
                zIndex={1100}
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
                userGender={userGender}
                userAge={userAge}
            />
        </div>
    )
}
