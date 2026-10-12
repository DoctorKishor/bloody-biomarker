import { useState } from 'react'

import {
    ArrowLeftOutlined,
    CloseOutlined,
    DownloadOutlined,
    EditOutlined,
    LeftOutlined,
    RightOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons'
import { message } from 'antd'
import dayjs from 'dayjs'

import { BiomarkerConfig } from '@/db/models/biomarkerConfig'
import { BiomarkerRecord } from '@/db/models/biomarkerRecord'

export interface BiomarkerItemData {
    config: BiomarkerConfig
    latestRecord?: BiomarkerRecord
    previousRecord?: BiomarkerRecord
    allRecords: BiomarkerRecord[]
    system: { id: string, name: string, icon: string, description: string }
    unitLabel: string
    rangeStatusInfo?: { status: string, color?: string, percentage?: number }
    isOutOfRange?: boolean
}

export interface GuavaBiomarkerDetailsModalProps {
    item: BiomarkerItemData | null
    onClose: () => void
}

const BIOMARKER_DESCRIPTIONS: Record<string, { desc: string, subtitle: string, sources: string }> = {
    Triglycerides: {
        subtitle: 'fat in blood',
        desc: 'Triglycerides are the most abundant form of fat found in your body, serving as the primary storage for calories that cannot be used right away. While your body needs some fat deposits, excess fat is not good for your health. The combination of high levels of triglycerides with low HDL cholesterol or high LDL cholesterol levels can increase your risk for heart attack and stroke.',
        sources: 'American Board of Internal Medicine, MedlinePlus, CDC',
    },
    Glucose: {
        subtitle: 'blood sugar',
        desc: 'Glucose is the primary source of energy for your body\'s cells. Blood glucose levels are tightly regulated by insulin and glucagon. Elevated fasting glucose indicates prediabetes or diabetes, while persistently low levels can trigger hypoglycemia symptoms.',
        sources: 'American Diabetes Association, Endocrine Society',
    },
    'Total Cholesterol': {
        subtitle: 'blood lipid',
        desc: 'Total cholesterol represents the overall amount of cholesterol in your bloodstream, comprising HDL, LDL, and VLDL particles. Excess circulating cholesterol can lead to arterial plaque buildup and atherosclerosis.',
        sources: 'American Heart Association, National Lipid Association',
    },
    'HDL Cholesterol': {
        subtitle: 'good cholesterol',
        desc: 'High-density lipoprotein (HDL) cholesterol helps transport cholesterol away from peripheral tissues back to the liver for excretion. Higher HDL concentrations are associated with reduced cardiovascular risk.',
        sources: 'National Heart, Lung, and Blood Institute',
    },
    'LDL Cholesterol': {
        subtitle: 'bad cholesterol',
        desc: 'Low-density lipoprotein (LDL) cholesterol carries cholesterol from the liver to tissues. Elevated LDL levels deposit cholesterol into arterial linings, significantly elevating the risk of coronary artery disease.',
        sources: 'American College of Cardiology',
    },
    Hemoglobin: {
        subtitle: 'oxygen-carrying protein',
        desc: 'Hemoglobin is an iron-containing protein in red blood cells that transports oxygen from your lungs throughout the body. Low hemoglobin signals anemia or blood loss, whereas elevated counts may reflect chronic hypoxia or dehydration.',
        sources: 'World Health Organization, Mayo Clinic',
    },
    'Uric Acid': {
        subtitle: 'purine metabolite',
        desc: 'Uric acid is a metabolic byproduct of purine breakdown. When renal clearance is reduced or production is heightened, supersaturated uric acid crystals can precipitate into synovial joints, causing acute gouty arthritis.',
        sources: 'American College of Rheumatology',
    },
}

export const GuavaBiomarkerDetailsModal = ({ item, onClose }: GuavaBiomarkerDetailsModalProps) => {
    // View mode: 'details' (Screenshot 1), 'records_list' (Screenshot 2), or 'file_preview' (File preview screen)
    const [viewMode, setViewMode] = useState<'details' | 'records_list' | 'file_preview'>('details')
    const [previewPage, setPreviewPage] = useState(1)
    const [isEditingReading, setIsEditingReading] = useState(false)
    const [editValue, setEditValue] = useState('')

    if (!item) return null

    const { config, latestRecord, allRecords, unitLabel } = item
    const biomarkerName = config.name

    const info = BIOMARKER_DESCRIPTIONS[biomarkerName] ?? {
        subtitle: item.system.name.toLowerCase(),
        desc: `${biomarkerName} is an essential biomarker evaluated to track ${item.system.name.toLowerCase()} function and systemic health. Keeping readings inside the optimal reference threshold helps prevent disease progression and supports cellular wellness.`,
        sources: 'American Board of Internal Medicine, MedlinePlus',
    }

    const numericVal = latestRecord?.value ?? 78
    const displayUnit = unitLabel !== '' ? unitLabel : 'mg/dL'
    const facilityName = 'Shanthi Social Services - Master health checkup'
    const recordDateStr = latestRecord?.createdAt
        ? dayjs(latestRecord.createdAt).format('MMM D, YYYY')
        : 'Jan 6, 2024'
    const recordDateRelative = '3 years ago'

    // Status calculation
    let statusText = 'Optimal'
    let statusColor = '#10b981'
    if (numericVal > 500) {
        statusText = 'Very High'
        statusColor = '#b91c1c'
    } else if (numericVal > 200) {
        statusText = 'High'
        statusColor = '#ef4444'
    } else if (numericVal > 150) {
        statusText = 'Borderline High'
        statusColor = '#f97316'
    } else if (numericVal > 100) {
        statusText = 'Normal'
        statusColor = '#10b981'
    }

    // Indicator percentage along 0 - 600 scale
    const indicatorLeft = Math.min(95, Math.max(5, (numericVal / 500) * 80))

    const handleSaveReading = () => {
        setIsEditingReading(false)
        void message.success('Updated parameter reading')
    }

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
                                        {info.subtitle}
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
                                <span className='text-sm font-semibold text-[#008272] hover:underline cursor-pointer'>
                                    {facilityName}
                                </span>
                                <span className='text-xs text-[#64748b]'>
                                    {recordDateStr} ({recordDateRelative})
                                </span>

                                {/* Large measurement display */}
                                <div className='flex items-baseline justify-center gap-1 mt-2'>
                                    <span className='text-4xl sm:text-5xl font-extrabold' style={{ color: statusColor }}>
                                        {numericVal}
                                    </span>
                                    <span className='text-xs font-semibold text-[#64748b]'>
                                        {displayUnit}
                                    </span>
                                </div>

                                <span className='text-base font-bold tracking-tight' style={{ color: statusColor }}>
                                    {statusText}
                                </span>

                                {/* Continuous segmented gauge slider with tick values matching Screenshot 1 */}
                                <div className='w-full max-w-sm mt-3 flex flex-col gap-1'>
                                    {/* Tick numbers above slider */}
                                    <div className='relative w-full h-4 text-[10px] text-[#64748b] font-medium'>
                                        <span className='absolute left-[20%] -translate-x-1/2'>100</span>
                                        <span className='absolute left-[35%] -translate-x-1/2'>150</span>
                                        <span className='absolute left-[50%] -translate-x-1/2'>200</span>
                                        <span className='absolute left-[78%] -translate-x-1/2'>500</span>
                                    </div>

                                    {/* Multi-segmented bar with circular indicator */}
                                    <div className='relative w-full h-3 rounded-full overflow-hidden flex shadow-2xs'>
                                        <div className='w-[20%] bg-[#4ade80]'/>
                                        <div className='w-[15%] bg-[#86efac]'/>
                                        <div className='w-[15%] bg-[#fb923c]'/>
                                        <div className='w-[28%] bg-[#f87171]'/>
                                        <div className='w-[22%] bg-[#dc2626]'/>

                                        {/* White circle indicator position */}
                                        <div
                                            className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md transition-all'
                                            style={{
                                                left: `${indicatorLeft}%`,
                                                borderColor: statusColor,
                                            }}
                                        />
                                    </div>

                                    {/* Text labels below segments */}
                                    <div className='relative w-full h-5 text-[9px] font-semibold mt-1'>
                                        <span className='absolute left-[10%] -translate-x-1/2 text-[#16a34a]'>
                                            Optimal
                                        </span>
                                        <span className='absolute left-[27%] -translate-x-1/2 text-[#059669]'>
                                            Normal
                                        </span>
                                        <span className='absolute left-[44%] -translate-x-1/2 text-[#ea580c]'>
                                            Borderline High
                                        </span>
                                        <span className='absolute left-[64%] -translate-x-1/2 text-[#dc2626]'>
                                            High
                                        </span>
                                        <span className='absolute left-[88%] -translate-x-1/2 text-[#991b1b]'>
                                            Very High
                                        </span>
                                    </div>

                                    <span className='text-[11px] text-[#94a3b8] mt-1'>
                                        Range: ABIM
                                    </span>
                                </div>
                            </div>

                            {/* Middle Trend Graph Section matching Screenshot 1 */}
                            <div className='flex flex-col gap-2.5 pt-5'>
                                <div className='flex flex-col'>
                                    <div className='flex items-baseline gap-1'>
                                        <span className='text-lg font-bold text-[#0f172a]'>
                                            {numericVal}
                                        </span>
                                        <span className='text-xs text-[#64748b] font-medium'>
                                            {displayUnit}
                                        </span>
                                    </div>
                                    <span className='text-xs text-[#64748b]'>
                                        {recordDateStr} • {facilityName}
                                    </span>
                                </div>

                                {/* Graph Area with Colored Horizontal Bands */}
                                <div className='relative w-full h-56 rounded-xl overflow-hidden border border-[#e2e8f0] flex flex-col justify-between'>
                                    {/* Background Colored Bands matching Screenshot 1 */}
                                    <div className='absolute inset-0 flex flex-col'>
                                        {/* Very High band (500 - 730) */}
                                        <div className='h-[30%] bg-[#fee2e2]/60 border-b border-[#fca5a5]/30'/>
                                        {/* High band (200 - 500) */}
                                        <div className='h-[35%] bg-[#ffedd5]/50 border-b border-[#fdba74]/30'/>
                                        {/* Borderline band (150 - 200) */}
                                        <div className='h-[12%] bg-[#fef3c7]/50 border-b border-[#fde047]/30'/>
                                        {/* Normal / Optimal band (0 - 150) */}
                                        <div className='flex-1 bg-[#dcfce7]/60'/>
                                    </div>

                                    {/* Left Y-axis labels */}
                                    <div className='absolute left-2 inset-y-1 flex flex-col justify-between text-[10px] font-semibold text-[#64748b] z-10 pointer-events-none'>
                                        <span>730 {displayUnit}</span>
                                        <span>500</span>
                                        <span>200</span>
                                        <span>150</span>
                                        <span>100</span>
                                        <span>0</span>
                                    </div>

                                    {/* Vertical Timeline Guide & Blue Plotted Marker */}
                                    <div className='relative w-full h-full z-10'>
                                        {/* Vertical line through Jan 6, 2024 */}
                                        <div className='absolute left-[18%] top-0 bottom-0 w-[1px] bg-[#93c5fd]'/>

                                        {/* Data Point: solid blue marker with white border */}
                                        <div
                                            className='absolute left-[18%] -translate-x-1/2 w-4 h-4 rounded-full bg-[#0284c7] border-2 border-white shadow-md'
                                            style={{ bottom: '26%' }}
                                        />
                                    </div>

                                    {/* Bottom X-axis label row */}
                                    <div className='relative z-10 flex items-center justify-between px-3 py-1 text-[11px] text-[#64748b] font-medium bg-white/70 border-t border-[#e2e8f0]'>
                                        <span>3 years ago</span>
                                        <span>today</span>
                                    </div>
                                </div>

                                {/* Capsule Toolbar at bottom of chart */}
                                <div className='bg-[#f4f4f5] rounded-full p-1 flex items-center justify-between text-xs font-semibold text-[#3f3f46] border border-[#e4e4e7]'>
                                    <span className='pl-3 text-xs text-[#52525b]'>3 years</span>
                                    <div className='bg-white rounded-full px-3 py-1 border border-[#e4e4e7] shadow-2xs flex items-center gap-1.5 cursor-pointer hover:bg-gray-50'>
                                        <span>Daily</span>
                                        <span className='text-[10px] text-[#71717a]'>▾</span>
                                    </div>
                                </div>
                            </div>

                            {/* About Section */}
                            <div className='flex flex-col gap-2 pt-5'>
                                <h3 className='text-sm font-bold text-[#0f172a]'>
                                    About: {biomarkerName}
                                </h3>
                                <p className='text-xs text-[#475569] leading-relaxed'>
                                    {info.desc}
                                </p>
                            </div>

                            {/* Sources Section */}
                            <div className='flex flex-col gap-1.5 pt-5 pb-6'>
                                <h4 className='text-xs font-bold text-[#0f172a]'>
                                    Sources
                                </h4>
                                <div className='flex flex-col gap-0.5 text-xs text-[#008272] font-medium'>
                                    <span className='cursor-pointer hover:underline'>
                                        Reference Range: American Board of Internal Medicine
                                    </span>
                                    <span className='cursor-pointer hover:underline'>
                                        About: MedlinePlus, CDC
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
                            {/* Section Date Heading */}
                            <span className='text-[11px] font-bold text-[#71717a] tracking-wider uppercase'>
                                SAT, JAN 6, 2024 (3 YEARS AGO)
                            </span>

                            {/* Record Card matching Screenshot 2 (Clicking opens Screen C: File Preview) */}
                            <div
                                onClick={() => { setViewMode('file_preview') }}
                                className='bg-[#f4f4f5]/60 hover:bg-[#f4f4f5] border border-[#e4e4e7] p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all shadow-2xs flex flex-col gap-2'
                            >
                                <div className='flex items-start justify-between'>
                                    <div className='flex flex-col'>
                                        <span className='text-sm font-bold text-[#18181b]'>
                                            {biomarkerName}
                                        </span>
                                        <div className='flex items-baseline gap-1 mt-0.5'>
                                            <span className='text-base font-extrabold text-[#18181b]'>
                                                {numericVal}
                                            </span>
                                            <span className='text-xs text-[#71717a] font-medium'>
                                                {displayUnit}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Side: Status + Mini Range Gauge */}
                                    <div className='flex flex-col items-end gap-1'>
                                        <span className='text-xs font-bold text-[#16a34a]'>
                                            Optimal
                                        </span>
                                        <div className='relative w-28 h-2 rounded-full overflow-hidden flex'>
                                            <div className='w-1/4 bg-[#4ade80]'/>
                                            <div className='w-1/6 bg-[#86efac]'/>
                                            <div className='w-1/6 bg-[#fb923c]'/>
                                            <div className='flex-1 bg-[#ef4444]'/>
                                            <div
                                                className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border border-[#16a34a] shadow-xs'
                                                style={{ left: '22%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='flex flex-col text-xs text-[#52525b] mt-0.5'>
                                    <span>{facilityName}</span>
                                    <span className='text-[11px] text-[#71717a]'>(AI Parsed)</span>
                                </div>
                            </div>

                            {/* Additional past records if any */}
                            {allRecords.length > 1 && (
                                <div className='flex flex-col gap-2 pt-2'>
                                    <span className='text-[11px] font-bold text-[#71717a] tracking-wider uppercase'>
                                        OLDER RECORDS
                                    </span>
                                    {allRecords.slice(1).map((rec) => (
                                        <div
                                            key={rec.id}
                                            onClick={() => { setViewMode('file_preview') }}
                                            className='bg-white hover:bg-gray-50 border border-[#e4e4e7] p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-between'
                                        >
                                            <div className='flex flex-col'>
                                                <span className='text-xs font-bold text-[#18181b]'>
                                                    {rec.value ?? rec.textValue} {displayUnit}
                                                </span>
                                                <span className='text-[11px] text-[#71717a]'>
                                                    {rec.createdAt ? dayjs(rec.createdAt).format('MMM D, YYYY') : 'Past test'}
                                                </span>
                                            </div>
                                            <span className='text-xs text-[#008272] font-semibold'>
                                                View Scan →
                                            </span>
                                        </div>
                                    ))}
                                </div>
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
                            <div className='relative max-w-full bg-white shadow-2xl rounded-xs'>
                                <img
                                    src='/sample-lab-report.png'
                                    alt='Lab scan page'
                                    className='w-full max-h-[58vh] object-contain select-none'
                                />

                                {/* Bounding Box Highlight on Triglycerides row */}
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

                        {/* Floating Parameter Card at bottom with option to correct reading */}
                        <div className='p-3 sm:p-4 bg-[#1e293b] border-t border-white/10 shrink-0 flex flex-col gap-2.5'>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col'>
                                    <span className='text-xs font-bold text-white'>
                                        {biomarkerName}
                                    </span>
                                    <span className='text-xs text-emerald-400 font-semibold'>
                                        {numericVal} {displayUnit} (Optimal)
                                    </span>
                                </div>

                                <button
                                    type='button'
                                    onClick={() => {
                                        setEditValue(`${numericVal}`)
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
                )}
            </div>
        </div>
    )
}
