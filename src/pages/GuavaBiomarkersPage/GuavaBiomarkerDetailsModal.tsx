import { useState, useEffect } from 'react'

import {
    ArrowLeftOutlined,
    CloseOutlined,
    DownOutlined,
    DownloadOutlined,
    EditOutlined,
    LeftOutlined,
    LineChartOutlined,
    LoadingOutlined,
    RightOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons'
import { Dropdown, message, Tooltip } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { getBiomarkerClinicalDetails } from '@/constants/biomarkerAboutData'
import { BiomarkerConfig } from '@/db/models/biomarkerConfig'
import { BiomarkerRecord, updateBiomarkerRecord } from '@/db/models/biomarkerRecord'
import { useDocument } from '@/db/models/document'
import { Range } from '@/db/types'
import { renderDocumentPageAsImage } from '@/utils/pdf'
import { evaluateBiomarkerRange, BiomarkerRangeEvaluation } from '@/utils/referenceRange/biomarkerRangeEngine'

dayjs.extend(relativeTime)

export interface BiomarkerItemData {
    config: BiomarkerConfig
    latestRecord?: BiomarkerRecord
    previousRecord?: BiomarkerRecord
    allRecords: BiomarkerRecord[]
    system: { id: string, name: string, icon: string, description: string }
    unitLabel: string
    rangeStatusInfo?: { status: string, color?: string, percentage?: number }
    isOutOfRange?: boolean
    reportRangeRaw?: string | Range
    documentTitle?: string
}

export interface GuavaBiomarkerDetailsModalProps {
    item: BiomarkerItemData | null
    onClose: () => void
    userGender?: 'male' | 'female'
    userAge?: number
}

const TIME_RANGE_LABELS: Record<'1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'All', string> = {
    '1M': '1 month',
    '3M': '3 months',
    '6M': '6 months',
    '1Y': '1 year',
    '3Y': '3 years',
    '5Y': '5 years',
    All: 'All time',
}

export const GuavaBiomarkerDetailsModal = ({
    item,
    onClose,
    userGender = 'male',
    userAge = 35,
}: GuavaBiomarkerDetailsModalProps) => {
    const [viewMode, setViewMode] = useState<'details' | 'records_list' | 'file_preview'>('details')
    const [isEditingReading, setIsEditingReading] = useState(false)
    const [editValue, setEditValue] = useState('')
    const [selectedRecord, setSelectedRecord] = useState<BiomarkerRecord | null>(null)
    const [pageOverride, setPageOverride] = useState<number | null>(null)
    const activeRecord = selectedRecord ?? item?.latestRecord
    const previewPage = pageOverride ?? activeRecord?.page ?? 1

    const [pageImageUrl, setPageImageUrl] = useState<string | null>(null)
    const [totalPages, setTotalPages] = useState<number>(1)
    const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false)

    const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'All'>('3Y')
    const [granularity, setGranularity] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Raw'>('Daily')

    const { data: activeDocument } = useDocument(activeRecord?.documentId)

    // Render document page to image dynamically when in file_preview mode
    useEffect(() => {
        let isMounted = true

        if (!activeDocument?.fileData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPageImageUrl('/sample-lab-report.png')
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTotalPages(activeDocument?.totalPages ?? 1)
            return
        }

        setIsLoadingPage(true)
        renderDocumentPageAsImage(activeDocument.fileData, previewPage, activeDocument.mimeType)
            .then((res) => {
                if (isMounted) {
                    setPageImageUrl(res.imageUrl)
                    setTotalPages(res.totalPages)
                    setIsLoadingPage(false)
                }
            })
            .catch((err) => {
                console.error('Failed to render document page as image:', err)
                if (isMounted) {
                    setPageImageUrl('/sample-lab-report.png')
                    setIsLoadingPage(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [activeDocument?.fileData, activeDocument?.mimeType, activeDocument?.totalPages, previewPage])

    if (!item) return null

    const { config, latestRecord, allRecords, unitLabel } = item
    const biomarkerName = config.name

    const isPlatelets = /platelet/i.test(biomarkerName)
    const isThousandUnit = /10|x10|k|\^3|\*3/i.test(unitLabel)

    const getNormalizedRecordValue = (rec?: BiomarkerRecord): number | undefined => {
        if (rec?.value === undefined) return undefined
        if (isPlatelets && isThousandUnit && rec.value > 5000) {
            return Math.round((rec.value / 1000) * 10) / 10
        }
        return rec.value
    }

    const hasData = latestRecord !== undefined && (latestRecord.value !== undefined || (latestRecord.textValue !== undefined && latestRecord.textValue.trim() !== ''))
    const hasNumericValue = latestRecord?.value !== undefined
    const numericVal = getNormalizedRecordValue(latestRecord)
    const displayVal = hasNumericValue && numericVal !== undefined ? `${numericVal}` : (latestRecord?.textValue ?? 'No data')
    const displayUnit = unitLabel !== '' ? unitLabel : ''
    const facilityName = item.documentTitle ?? latestRecord?.notes
    const recordDateStr = latestRecord?.createdAt
        ? dayjs(latestRecord.createdAt).format('MMM D, YYYY')
        : undefined
    const recordDateRelative = latestRecord?.createdAt
        ? dayjs(latestRecord.createdAt).fromNow()
        : undefined

    // Unified Reference Range Evaluation Engine
    const evaluation: BiomarkerRangeEvaluation = evaluateBiomarkerRange({
        biomarkerName,
        value: numericVal,
        unit: displayUnit,
        reportRangeRaw: latestRecord?.referenceRange ?? latestRecord?.referenceRangeString ?? item.reportRangeRaw ?? config.normalRange,
        userGender,
        userAge,
    })

    const clinicalDetail = getBiomarkerClinicalDetails(
        biomarkerName,
        item.system.name,
        evaluation.rangeText,
    )

    // Timeline and chart data computation
    const now = dayjs()
    let cutoffDate: dayjs.Dayjs
    let timeRangeStartLabel = '3 years ago'

    switch (timeRange) {
        case '1M':
            cutoffDate = now.subtract(1, 'month')
            timeRangeStartLabel = '1 month ago'
            break
        case '3M':
            cutoffDate = now.subtract(3, 'month')
            timeRangeStartLabel = '3 months ago'
            break
        case '6M':
            cutoffDate = now.subtract(6, 'month')
            timeRangeStartLabel = '6 months ago'
            break
        case '1Y':
            cutoffDate = now.subtract(1, 'year')
            timeRangeStartLabel = '1 year ago'
            break
        case '3Y':
            cutoffDate = now.subtract(3, 'year')
            timeRangeStartLabel = '3 years ago'
            break
        case '5Y':
            cutoffDate = now.subtract(5, 'year')
            timeRangeStartLabel = '5 years ago'
            break
        case 'All':
        default: {
            const earliest = allRecords.reduce((min, r) => {
                if (!r.createdAt) return min
                const d = dayjs(r.createdAt)
                return d.isBefore(min) ? d : min
            }, now.subtract(3, 'year'))
            cutoffDate = earliest
            timeRangeStartLabel = earliest.format('MMM YYYY')
            break
        }
    }

    const recordsInWindow = allRecords.filter((r) => {
        if (!r.createdAt) return true
        if (timeRange === 'All') return true
        return dayjs(r.createdAt).isAfter(cutoffDate) || dayjs(r.createdAt).isSame(cutoffDate)
    })

    interface ChartPoint {
        id: string
        date: Date
        dateStr: string
        value: number
        record: BiomarkerRecord
    }

    const chartPoints: ChartPoint[] = []

    if (granularity === 'Raw') {
        recordsInWindow.forEach((r) => {
            const normVal = getNormalizedRecordValue(r)
            if (normVal !== undefined) {
                chartPoints.push({
                    id: r.id,
                    date: r.createdAt ? new Date(r.createdAt) : new Date(),
                    dateStr: r.createdAt ? dayjs(r.createdAt).format('MMM D, YYYY') : 'Recent',
                    value: normVal,
                    record: r,
                })
            }
        })
    } else {
        const groups = new Map<string, BiomarkerRecord[]>()
        recordsInWindow.forEach((r) => {
            if (r.value === undefined) return
            const d = dayjs(r.createdAt ?? new Date())
            let key = ''
            if (granularity === 'Daily') {
                key = d.format('YYYY-MM-DD')
            } else if (granularity === 'Weekly') {
                key = `${d.year()}-W${Math.ceil(d.date() / 7)}`
            } else if (granularity === 'Monthly') {
                key = d.format('YYYY-MM')
            } else if (granularity === 'Yearly') {
                key = d.format('YYYY')
            }
            const existing = groups.get(key) ?? []
            existing.push(r)
            groups.set(key, existing)
        })

        groups.forEach((groupRecords) => {
            if (groupRecords.length === 0) return
            const latestInGroup = groupRecords[groupRecords.length - 1]
            const vals = groupRecords.map(getNormalizedRecordValue).filter((v): v is number => v !== undefined)
            if (vals.length === 0) return
            const avgVal = vals.reduce((sum, v) => sum + v, 0) / vals.length

            const date = latestInGroup.createdAt ? new Date(latestInGroup.createdAt) : new Date()
            chartPoints.push({
                id: latestInGroup.id,
                date,
                dateStr: latestInGroup.createdAt ? dayjs(latestInGroup.createdAt).format('MMM D, YYYY') : 'Recent',
                value: Math.round(avgVal * 10) / 10,
                record: latestInGroup,
            })
        })
    }

    chartPoints.sort((a, b) => a.date.getTime() - b.date.getTime())

    const timelineStart = cutoffDate.valueOf()
    const timelineEnd = now.valueOf()
    const timelineSpan = timelineEnd - timelineStart > 0 ? timelineEnd - timelineStart : 1

    const yMin = evaluation.graphMin
    const yMax = evaluation.graphMax
    const ySpan = yMax - yMin > 0 ? yMax - yMin : 1

    const plottedPoints = chartPoints.map((pt) => {
        let xPct = ((pt.date.getTime() - timelineStart) / timelineSpan) * 100
        if (chartPoints.length === 1) {
            xPct = 50
        } else {
            xPct = Math.max(6, Math.min(94, xPct))
        }

        // Reconcile scale between pt.value and the graph's Y scale if there's a magnitude difference
        let valForY = pt.value
        if (yMax > 5000 && pt.value < 2000 && (isThousandUnit || /platelet|wbc|leukocyte/i.test(biomarkerName))) {
            valForY = pt.value * 1000
        } else if (yMax < 2000 && pt.value > 5000) {
            valForY = pt.value / 1000
        } else if (yMax > 500000 && pt.value < 20 && (/rbc|erythrocyte/i.test(biomarkerName) || /10\*6|10\^6|m\//i.test(unitLabel))) {
            valForY = pt.value * 1000000
        }

        const rawYPct = ((valForY - yMin) / ySpan) * 100
        const yPct = Math.max(6, Math.min(94, rawYPct))
        return {
            ...pt,
            xPct,
            yPct,
        }
    })

    const activePoint = (selectedRecord
        ? plottedPoints.find((p) => p.id === selectedRecord.id)
        : undefined) ?? plottedPoints[plottedPoints.length - 1]

    const handleSaveReading = async () => {
        if (activeRecord?.id) {
            const num = parseFloat(editValue)
            const isNum = !isNaN(num)
            await updateBiomarkerRecord(activeRecord.id, {
                value: isNum ? num : undefined,
                textValue: !isNum ? editValue : undefined,
            })
        }
        setIsEditingReading(false)
        void message.success('Updated parameter reading')
    }

    // Coordinates for bounding box in Screen C
    const isTargetPage = previewPage === (activeRecord?.page ?? 1)
    const boundingBox = activeRecord?.boundingBox
    const boxStyle = boundingBox
        ? {
            top: `${boundingBox.top}%`,
            left: `${boundingBox.left}%`,
            width: `${boundingBox.width}%`,
            height: `${boundingBox.height}%`,
        }
        : {
            top: `${Math.min(85, Math.max(25, 26 + ((activeRecord?.order ?? 0) * 3.8)))}%`,
            left: '12%',
            width: '76%',
            height: '3.2%',
        }

    const activeDisplayVal = activeRecord?.value !== undefined
        ? `${activeRecord.value}`
        : (activeRecord?.textValue ?? displayVal)

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
            className='fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center bg-black/55 backdrop-blur-[1px] lg:p-4 transition-all'
        >
            {/* Modal Container: Full Screen on Mobile, Centered Card on Desktop */}
            <div className='w-full h-full lg:h-auto lg:max-h-[92vh] lg:max-w-[490px] bg-white lg:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in'>
                {/* ========================================================================= */}
                {/* 1. SCREEN A: BIOMARKER DETAILS & TREND GRAPH (Screenshot 1)              */}
                {/* ========================================================================= */}
                {viewMode === 'details' && (
                    <>
                        {/* Header Banner matching Screenshot 1 */}
                        <div className='bg-[#008272] px-4 sm:px-5 py-3.5 flex items-center justify-between text-white shrink-0 shadow-xs'>
                            <div className='flex items-center gap-3'>
                                <button
                                    type='button'
                                    onClick={onClose}
                                    aria-label='Close'
                                    className='p-1 rounded-full hover:bg-white/15 transition-colors text-white text-base sm:text-lg flex items-center justify-center -ml-1'
                                >
                                    <ArrowLeftOutlined className='stroke-[2]'/>
                                </button>
                                <div className='flex flex-col'>
                                    <h2 className='text-base sm:text-lg font-bold text-white tracking-tight leading-tight select-none'>
                                        {biomarkerName}
                                    </h2>
                                    <span className='text-xs text-white/80 font-normal leading-tight'>
                                        {clinicalDetail.subtitle}
                                    </span>
                                </div>
                            </div>

                            {/* Top-Right Hamburger / List Icon -> opens All-Time Records List */}
                            <button
                                type='button'
                                onClick={() => { setViewMode('records_list') }}
                                aria-label='All Time Records'
                                title='All time records'
                                className='p-1.5 rounded-lg hover:bg-white/15 transition-colors text-white text-lg flex items-center justify-center'
                            >
                                <UnorderedListOutlined className='text-xl'/>
                            </button>
                        </div>

                        {/* Body Content */}
                        <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-6 text-sm divide-y divide-[#f1f5f9]'>
                            {/* Top Summary Section */}
                            <div className='flex flex-col items-center text-center gap-1.5 pt-1'>
                                {hasData ? (
                                    <>
                                        <span className='text-sm font-semibold text-[#008272] hover:underline cursor-pointer'>
                                            {facilityName ?? 'Uploaded Lab Report'}
                                        </span>
                                        {recordDateStr && (
                                            <span className='text-xs text-[#64748b]'>
                                                {recordDateStr} {recordDateRelative ? `(${recordDateRelative})` : ''}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <div className='flex flex-col items-center gap-1'>
                                        <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]'>
                                            No Lab Records Found
                                        </span>
                                        <span className='text-xs text-[#94a3b8]'>
                                            Not detected in uploaded medical reports
                                        </span>
                                    </div>
                                )}

                                {/* Large measurement display with clinical status color */}
                                {hasData ? (
                                    <>
                                        <div className='flex items-baseline justify-center gap-1 mt-2'>
                                            <span className='text-4xl sm:text-5xl font-extrabold' style={{ color: evaluation.statusColor }}>
                                                {displayVal}
                                            </span>
                                            {displayUnit !== '' && (
                                                <span className='text-xs font-semibold text-[#64748b]'>
                                                    {displayUnit}
                                                </span>
                                            )}
                                        </div>

                                        <span className='text-base font-bold tracking-tight' style={{ color: evaluation.statusColor }}>
                                            {evaluation.statusLabel}
                                        </span>
                                    </>
                                ) : (
                                    <div className='flex flex-col items-center gap-1 mt-2'>
                                        <span className='text-3xl sm:text-4xl font-extrabold text-[#94a3b8]'>
                                            No data
                                        </span>
                                        <span className='text-xs font-medium text-[#64748b]'>
                                            Standard Reference Scale ({evaluation.primarySource})
                                        </span>
                                    </div>
                                )}

                                {/* Continuous segmented gauge slider with dynamic ticks */}
                                <div className='w-full max-w-sm mt-3 flex flex-col gap-1'>
                                    {/* Dynamic tick numbers above slider */}
                                    <div className='relative w-full h-4 text-[10px] text-[#64748b] font-medium'>
                                        {evaluation.ticks.map((t, idx) => (
                                            <span
                                                key={idx}
                                                className='absolute -translate-x-1/2'
                                                style={{ left: `${t.pct}%` }}
                                            >
                                                {t.label}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Multi-segmented bar with circular indicator */}
                                    <div className='relative w-full h-3 rounded-full overflow-hidden flex shadow-2xs'>
                                        {evaluation.segments.map((seg, idx) => (
                                            <div
                                                key={idx}
                                                className='h-full transition-all'
                                                style={{
                                                    width: `${seg.widthPct}%`,
                                                    backgroundColor: seg.color,
                                                }}
                                            />
                                        ))}

                                        {/* White circle indicator position at exact identical percentage (only when numeric value is present) */}
                                        {hasNumericValue && evaluation.markerPct !== undefined && (
                                            <div
                                                className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md transition-all'
                                                style={{
                                                    left: `${evaluation.markerPct}%`,
                                                    borderColor: evaluation.statusColor,
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Text labels below segments */}
                                    <div className='relative w-full h-5 text-[9px] font-semibold mt-1'>
                                        {evaluation.labels.map((lbl, idx) => (
                                            <span
                                                key={idx}
                                                className='absolute -translate-x-1/2'
                                                style={{
                                                    left: `${lbl.pct}%`,
                                                    color: lbl.color,
                                                }}
                                            >
                                                {lbl.text}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Primary Range Citation */}
                                    <span className='text-[11px] text-[#94a3b8] mt-1'>
                                        Range: {evaluation.primarySource} ({evaluation.rangeText})
                                    </span>
                                </div>

                                {/* Secondary ABIM Comparison Callout (User Requirement 2: Shown only when report range is abnormal) */}
                                {hasData && evaluation.secondaryAbimComparison && (
                                    <div
                                        className={`w-full max-w-sm mt-2.5 rounded-xl p-3 flex flex-col gap-1 text-xs text-left shadow-2xs animate-fade-in border ${
                                            evaluation.secondaryAbimComparison.isAbnormal
                                                ? 'bg-[#fffbeb] border-[#fde68a] text-[#78350f]'
                                                : 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]'
                                        }`}
                                    >
                                        <div className='flex items-center justify-between'>
                                            <span className='font-bold'>
                                                ABIM 2026 Reference (Secondary)
                                            </span>
                                            <span
                                                className='font-bold px-2.5 py-0.5 rounded-full text-[11px]'
                                                style={{
                                                    backgroundColor: `${evaluation.secondaryAbimComparison.statusColor}22`,
                                                    color: evaluation.secondaryAbimComparison.statusColor,
                                                    border: `1px solid ${evaluation.secondaryAbimComparison.statusColor}44`,
                                                }}
                                            >
                                                {evaluation.secondaryAbimComparison.statusText}
                                            </span>
                                        </div>
                                        <span className='text-[11px] font-medium opacity-90'>
                                            Standard Range: {evaluation.secondaryAbimComparison.rangeText}
                                        </span>
                                        <span className='text-[11px] opacity-80'>
                                            {evaluation.secondaryAbimComparison.notes}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Middle Trend Graph Section matching Screenshot 1 */}
                            <div className='flex flex-col gap-2.5 pt-5'>
                                {hasData && allRecords.length > 0 ? (
                                    <>
                                        <div className='flex flex-col'>
                                            <div className='flex items-baseline gap-1'>
                                                <span className='text-lg font-bold text-[#0f172a]'>
                                                    {activePoint?.value ?? displayVal}
                                                </span>
                                                {displayUnit !== '' && (
                                                    <span className='text-xs text-[#64748b] font-medium'>
                                                        {displayUnit}
                                                    </span>
                                                )}
                                            </div>
                                            <span className='text-xs text-[#64748b]'>
                                                {activePoint?.dateStr ?? recordDateStr ?? 'Recent'} {facilityName ? `• ${facilityName}` : ''}
                                            </span>
                                        </div>

                                        {/* Dynamic Graph Area with Colored Horizontal Bands */}
                                        <div className='relative w-full h-56 rounded-xl overflow-hidden border border-[#e2e8f0] flex flex-col justify-between'>
                                            {/* Dynamic Background Colored Bands */}
                                            <div className='absolute inset-0 flex flex-col-reverse'>
                                                {evaluation.graphBands.map((band, idx) => (
                                                    <div
                                                        key={idx}
                                                        className='w-full border-t border-black/5 transition-all'
                                                        style={{
                                                            height: `${band.heightPct}%`,
                                                            backgroundColor: `${band.color}35`,
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Left Y-axis labels */}
                                            <div className='absolute left-2 inset-y-1 flex flex-col justify-between text-[10px] font-semibold text-[#64748b] z-10 pointer-events-none'>
                                                {evaluation.graphYAxis.map((y, idx) => (
                                                    <span key={idx}>{y.label}</span>
                                                ))}
                                            </div>

                                            {/* Multi-point Trend Line when >= 2 points */}
                                            {plottedPoints.length > 1 && (
                                                <svg
                                                    className='absolute inset-0 w-full h-full pointer-events-none z-10'
                                                    viewBox='0 0 100 100'
                                                    preserveAspectRatio='none'
                                                >
                                                    <polyline
                                                        points={plottedPoints.map((p) => `${p.xPct},${100 - p.yPct}`).join(' ')}
                                                        fill='none'
                                                        stroke='#0284c7'
                                                        strokeWidth='2'
                                                        vectorEffect='non-scaling-stroke'
                                                    />
                                                </svg>
                                            )}

                                            {/* Vertical Timeline Guide & Markers */}
                                            {activePoint && (
                                                <div
                                                    className='absolute top-0 bottom-0 w-[1px] bg-[#93c5fd] z-10'
                                                    style={{ left: `${activePoint.xPct}%` }}
                                                />
                                            )}

                                            {/* Plotted Data Points */}
                                            {plottedPoints.map((pt) => {
                                                const isActive = activePoint?.id === pt.id
                                                return (
                                                    <Tooltip
                                                        key={pt.id}
                                                        title={`${pt.value} ${displayUnit} • ${pt.dateStr}`}
                                                    >
                                                        <button
                                                            type='button'
                                                            onClick={() => { setSelectedRecord(pt.record) }}
                                                            className={`absolute -translate-x-1/2 translate-y-1/2 rounded-full cursor-pointer transition-all z-20 p-0 border-0 ${
                                                                isActive
                                                                    ? 'w-4 h-4 bg-[#0284c7] border-2 border-white shadow-md'
                                                                    : 'w-2.5 h-2.5 bg-white border-2 border-[#0284c7] hover:scale-125'
                                                            }`}
                                                            style={{
                                                                left: `${pt.xPct}%`,
                                                                bottom: `${pt.yPct}%`,
                                                            }}
                                                            aria-label={`${pt.value} on ${pt.dateStr}`}
                                                        />
                                                    </Tooltip>
                                                )
                                            })}

                                            {/* Bottom X-axis label row */}
                                            <div className='relative z-10 flex items-center justify-between px-3 py-1 text-[11px] text-[#64748b] font-medium bg-white/70 border-t border-[#e2e8f0]'>
                                                <span>{timeRangeStartLabel}</span>
                                                <span>today</span>
                                            </div>
                                        </div>

                                        {/* Capsule Toolbar at bottom of chart */}
                                        <div className='bg-[#f4f4f5] rounded-full p-1 flex items-center justify-between text-xs font-semibold text-[#3f3f46] border border-[#e4e4e7]'>
                                            {/* Left: Time Range Dropdown */}
                                            <Dropdown
                                                menu={{
                                                    items: [
                                                        {
                                                            key: '1M',
                                                            label: '1 month',
                                                            onClick: () => { setTimeRange('1M') },
                                                        },
                                                        {
                                                            key: '3M',
                                                            label: '3 months',
                                                            onClick: () => { setTimeRange('3M') },
                                                        },
                                                        {
                                                            key: '6M',
                                                            label: '6 months',
                                                            onClick: () => { setTimeRange('6M') },
                                                        },
                                                        {
                                                            key: '1Y',
                                                            label: '1 year',
                                                            onClick: () => { setTimeRange('1Y') },
                                                        },
                                                        {
                                                            key: '3Y',
                                                            label: '3 years',
                                                            onClick: () => { setTimeRange('3Y') },
                                                        },
                                                        {
                                                            key: '5Y',
                                                            label: '5 years',
                                                            onClick: () => { setTimeRange('5Y') },
                                                        },
                                                        {
                                                            key: 'All',
                                                            label: 'All time',
                                                            onClick: () => { setTimeRange('All') },
                                                        },
                                                    ],
                                                    selectedKeys: [timeRange],
                                                }}
                                                trigger={['click']}
                                            >
                                                <button
                                                    type='button'
                                                    className='pl-3 pr-2 py-1 text-xs text-[#52525b] hover:text-[#18181b] font-semibold flex items-center gap-1 cursor-pointer transition-colors bg-transparent border-0'
                                                >
                                                    <span>{TIME_RANGE_LABELS[timeRange]}</span>
                                                    <DownOutlined className='text-[9px] text-[#71717a]'/>
                                                </button>
                                            </Dropdown>

                                            {/* Right: Granularity Dropdown (Circled by user: Daily ▾) */}
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
                                                        {
                                                            key: 'Yearly',
                                                            label: 'Yearly',
                                                            onClick: () => { setGranularity('Yearly') },
                                                        },
                                                        {
                                                            key: 'Raw',
                                                            label: 'Each record',
                                                            onClick: () => { setGranularity('Raw') },
                                                        },
                                                    ],
                                                    selectedKeys: [granularity],
                                                }}
                                                trigger={['click']}
                                            >
                                                <button
                                                    type='button'
                                                    className='bg-white rounded-full px-3 py-1 border border-[#e4e4e7] shadow-2xs flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 transition-colors text-xs font-semibold text-[#3f3f46]'
                                                >
                                                    <span>{granularity === 'Raw' ? 'Each record' : granularity}</span>
                                                    <DownOutlined className='text-[9px] text-[#71717a]'/>
                                                </button>
                                            </Dropdown>
                                        </div>
                                    </>
                                ) : (
                                    <div className='rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 flex flex-col items-center justify-center text-center gap-2'>
                                        <div className='w-10 h-10 rounded-full bg-[#e2e8f0] flex items-center justify-center text-[#64748b] text-base'>
                                            <LineChartOutlined/>
                                        </div>
                                        <span className='text-sm font-bold text-[#334155]'>No Trend Data Available</span>
                                        <p className='text-xs text-[#64748b] max-w-xs m-0'>
                                            Upload a lab report or log a reading for {biomarkerName} to view trend graphs and historical progression.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* About Section */}
                            <div className='flex flex-col gap-2.5 pt-5'>
                                <h3 className='text-sm font-bold text-[#0f172a]'>
                                    About: {biomarkerName}
                                </h3>
                                <p className='text-xs text-[#475569] leading-relaxed m-0'>
                                    {clinicalDetail.description}
                                </p>

                                {/* Clinical Significance Card */}
                                <div className='bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 flex flex-col gap-1 mt-1'>
                                    <span className='text-[11px] font-bold text-[#334155]'>
                                        Clinical Significance
                                    </span>
                                    <p className='text-xs text-[#64748b] leading-relaxed m-0'>
                                        {clinicalDetail.clinicalRole}
                                    </p>
                                </div>

                                {/* Reference Range & Interpretation Breakdown Card */}
                                <div className='bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 flex flex-col gap-2.5 mt-1'>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-xs font-bold text-[#007a55]'>
                                            Reference Range & Interpretation
                                        </span>
                                        <span className='text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#007a55]'>
                                            {evaluation.rangeText || clinicalDetail.referenceRangeText}
                                        </span>
                                    </div>

                                    <div className='flex flex-col gap-2 pt-1 border-t border-emerald-200/50 text-[11px] leading-relaxed'>
                                        <div className='flex flex-col gap-0.5'>
                                            <span className='font-bold text-red-600'>
                                                When High (Elevated):
                                            </span>
                                            <span className='text-[#475569]'>
                                                {clinicalDetail.highInterpretation}
                                            </span>
                                        </div>
                                        <div className='flex flex-col gap-0.5'>
                                            <span className='font-bold text-amber-600'>
                                                When Low (Decreased):
                                            </span>
                                            <span className='text-[#475569]'>
                                                {clinicalDetail.lowInterpretation}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sources Section */}
                            <div className='flex flex-col gap-1.5 pt-5 pb-6'>
                                <h4 className='text-xs font-bold text-[#0f172a]'>
                                    Sources
                                </h4>
                                <div className='flex flex-col gap-0.5 text-xs text-[#008272] font-medium'>
                                    <span className='cursor-pointer hover:underline'>
                                        Reference Range: {evaluation.primarySource === 'Lab Report' ? 'Laboratory Report Specification' : 'American Board of Internal Medicine (ABIM 2026)'}
                                    </span>
                                    <span className='cursor-pointer hover:underline'>
                                        About: {clinicalDetail.sources}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ========================================================================= */}
                {/* 2. SCREEN B: ALL-TIME RECORDS LIST (Screenshot 2)                        */}
                {/* ========================================================================= */}
                {viewMode === 'records_list' && (
                    <>
                        {/* Header Banner matching Screenshot 2 */}
                        <div className='bg-[#008272] px-4 sm:px-5 py-3.5 flex items-center justify-between text-white shrink-0 shadow-xs'>
                            <div className='flex items-center gap-3'>
                                <button
                                    type='button'
                                    onClick={() => { setViewMode('details') }}
                                    aria-label='Back to Details'
                                    className='p-1 rounded-full hover:bg-white/15 transition-colors text-white text-base sm:text-lg flex items-center justify-center -ml-1'
                                >
                                    <ArrowLeftOutlined className='stroke-[2]'/>
                                </button>
                                <h2 className='text-base sm:text-lg font-bold text-white tracking-tight leading-tight select-none'>
                                    {biomarkerName}
                                </h2>
                            </div>

                            <button
                                type='button'
                                onClick={() => { void message.info('Exporting biomarker records...') }}
                                aria-label='Download records'
                                title='Export records'
                                className='p-1.5 rounded-lg hover:bg-white/15 transition-colors text-white text-lg flex items-center justify-center'
                            >
                                <DownloadOutlined className='text-xl'/>
                            </button>
                        </div>

                        {/* Records List Body */}
                        <div className='flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-4 text-sm'>
                            {allRecords.length === 0 ? (
                                <div className='py-12 px-4 flex flex-col items-center justify-center text-center gap-2'>
                                    <div className='w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#94a3b8] text-xl'>
                                        <UnorderedListOutlined/>
                                    </div>
                                    <span className='text-sm font-bold text-[#334155]'>No Historical Records Found</span>
                                    <span className='text-xs text-[#64748b] max-w-xs'>
                                        There are no saved lab records or manual entries for {biomarkerName}.
                                    </span>
                                </div>
                            ) : (
                                allRecords.map((rec, idx) => {
                                    const recVal = rec.value
                                    const recText = rec.textValue
                                    const recDateStr = rec.createdAt ? dayjs(rec.createdAt).format('ddd, MMM D, YYYY') : 'Recent Record'
                                    const recRelative = rec.createdAt ? dayjs(rec.createdAt).fromNow() : ''
                                    const recFac = item.documentTitle ?? rec.notes ?? 'Lab Report'

                                    const recEval = evaluateBiomarkerRange({
                                        biomarkerName,
                                        value: recVal,
                                        unit: displayUnit,
                                        reportRangeRaw: rec.referenceRange ?? rec.referenceRangeString ?? item.reportRangeRaw ?? config.normalRange,
                                        userGender,
                                        userAge,
                                    })

                                    return (
                                        <div key={rec.id ?? idx} className='flex flex-col gap-1.5'>
                                            <span className='text-[11px] font-bold text-[#71717a] tracking-wider uppercase'>
                                                {recDateStr} {recRelative ? `(${recRelative.toUpperCase()})` : ''}
                                            </span>
                                            <div
                                                onClick={() => {
                                                    setSelectedRecord(rec)
                                                    setPageOverride(rec.page ?? 1)
                                                    setViewMode('file_preview')
                                                }}
                                                className='bg-[#f4f4f5]/60 hover:bg-[#f4f4f5] border border-[#e4e4e7] p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all shadow-2xs flex flex-col gap-2'
                                            >
                                                <div className='flex items-start justify-between'>
                                                    <div className='flex flex-col'>
                                                        <span className='text-sm font-bold text-[#18181b]'>
                                                            {biomarkerName}
                                                        </span>
                                                        <div className='flex items-baseline gap-1 mt-0.5'>
                                                            <span className='text-base font-extrabold text-[#18181b]'>
                                                                {recVal ?? recText ?? 'no data'}
                                                            </span>
                                                            {recVal !== undefined && displayUnit !== '' && (
                                                                <span className='text-xs text-[#71717a] font-medium'>
                                                                    {displayUnit}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className='flex flex-col items-end gap-1'>
                                                        <span
                                                            className='text-xs font-bold'
                                                            style={{ color: recEval.statusColor }}
                                                        >
                                                            {recEval.statusLabel}
                                                        </span>
                                                        <div className='relative w-28 h-2 rounded-full overflow-hidden flex'>
                                                            {recEval.segments.map((seg, sIdx) => (
                                                                <div
                                                                    key={sIdx}
                                                                    className='h-full'
                                                                    style={{
                                                                        width: `${seg.widthPct}%`,
                                                                        backgroundColor: seg.color,
                                                                    }}
                                                                />
                                                            ))}
                                                            {recEval.markerPct !== undefined && (
                                                                <div
                                                                    className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border shadow-xs'
                                                                    style={{
                                                                        left: `${recEval.markerPct}%`,
                                                                        borderColor: recEval.statusColor,
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className='flex flex-col text-xs text-[#52525b] mt-0.5'>
                                                    <span>{recFac}</span>
                                                    <span className='text-[11px] text-[#008272] font-semibold'>
                                                        {rec.documentId ? 'View scanned document →' : '(AI Parsed)'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </>
                )}

                {/* ========================================================================= */}
                {/* 3. SCREEN C: FILE PREVIEW SCREEN WITH BOUNDING BOX OVERLAY                */}
                {/* ========================================================================= */}
                {viewMode === 'file_preview' && (
                    <div className='flex flex-col h-full bg-[#0f172a] text-white overflow-hidden relative'>
                        {/* Top Bar with File Preview title & Pagination Capsule */}
                        <div className='h-14 px-4 sm:px-5 flex items-center justify-between shrink-0 border-b border-white/10 bg-[#0f172a] z-20'>
                            <button
                                type='button'
                                onClick={() => { setViewMode('records_list') }}
                                className='text-white hover:opacity-80 flex items-center gap-2 font-bold text-sm sm:text-base transition-opacity -ml-1'
                            >
                                <ArrowLeftOutlined className='text-base'/>
                                <span>File Preview</span>
                            </button>

                            {/* Pagination Tool */}
                            <div className='bg-white/10 rounded-full px-3 py-1 flex items-center gap-2 text-xs font-semibold text-white'>
                                <button
                                    type='button'
                                    onClick={() => { setPageOverride(Math.max(1, previewPage - 1)) }}
                                    className='hover:text-[#4ade80] p-0.5'
                                >
                                    <LeftOutlined className='text-[10px]'/>
                                </button>
                                <span>Page {previewPage}/{totalPages}</span>
                                <button
                                    type='button'
                                    onClick={() => { setPageOverride(Math.min(totalPages, previewPage + 1)) }}
                                    className='hover:text-[#4ade80] p-0.5'
                                >
                                    <RightOutlined className='text-[10px]'/>
                                </button>
                            </div>

                            <button
                                type='button'
                                onClick={onClose}
                                className='text-white/70 hover:text-white p-1'
                            >
                                <CloseOutlined className='text-base'/>
                            </button>
                        </div>

                        {/* Document Scan Image with Highlighted Bounding Box */}
                        <div className='flex-1 overflow-y-auto bg-black flex items-center justify-center p-3 relative'>
                            <div className='relative max-w-full bg-white shadow-2xl rounded-xs flex items-center justify-center overflow-hidden min-h-[300px]'>
                                {isLoadingPage ? (
                                    <div className='w-72 h-80 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-900'>
                                        <LoadingOutlined className='text-3xl text-[#008272]'/>
                                        <span className='text-xs font-medium'>Rendering document page {previewPage}...</span>
                                    </div>
                                ) : (
                                    <img
                                        src={pageImageUrl ?? '/sample-lab-report.png'}
                                        alt={`Lab scan page ${previewPage}`}
                                        className='w-full max-h-[58vh] object-contain select-none'
                                    />
                                )}

                                {/* Bounding Box Highlight on parameter row on the target page */}
                                {!isLoadingPage && isTargetPage && (
                                    <div
                                        className='absolute border-2 border-[#3b82f6] bg-[#3b82f6]/25 rounded-xs pointer-events-none shadow-md transition-all animate-pulse'
                                        style={boxStyle}
                                    >
                                        <span className='absolute -top-4 left-0 px-1.5 py-0.5 rounded bg-[#2563eb] text-[9px] font-bold text-white shadow-xs whitespace-nowrap pointer-events-none'>
                                            {activeRecord?.originalName ?? biomarkerName}: {activeDisplayVal}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Floating Parameter Card at bottom with option to correct reading */}
                        <div className='p-3 sm:p-4 bg-[#1e293b] border-t border-white/10 shrink-0 flex flex-col gap-2.5'>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col'>
                                    <span className='text-xs font-bold text-white'>
                                        {biomarkerName}
                                    </span>
                                    <span
                                        className='text-xs font-semibold'
                                        style={{ color: evaluation.statusColor }}
                                    >
                                        {activeDisplayVal} {displayUnit !== '' ? displayUnit : ''} ({evaluation.statusLabel})
                                    </span>
                                </div>

                                <button
                                    type='button'
                                    onClick={() => {
                                        setEditValue(`${activeDisplayVal}`)
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
                                        onClick={() => { void handleSaveReading() }}
                                        className='px-4 py-1.5 rounded-lg bg-[#008272] hover:bg-[#008272]/90 text-white text-xs font-bold transition-colors'
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
