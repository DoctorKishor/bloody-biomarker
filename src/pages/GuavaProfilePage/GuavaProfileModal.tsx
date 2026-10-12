import { useState, useRef } from 'react'

import {
    ArrowLeftOutlined,
    CalendarOutlined,
    CameraOutlined,
    ClockCircleOutlined,
    InfoCircleOutlined,
    PlusOutlined,
    SearchOutlined,
} from '@ant-design/icons'

export type ProfileSectionType =
    | 'meds'
    | 'conditions'
    | 'allergies'
    | 'lifestyle'
    | 'vaccinations'
    | 'events'
    | 'genetics'
    | 'providers'

export interface ProfileRecordItem {
    id: string
    title: string
    subtitle?: string
    details?: string
    date?: string
    notes?: string
    badge?: string
    badgeColor?: string
}

export interface GuavaProfileModalProps {
    section: ProfileSectionType | null
    onClose: () => void
    onAdd: (section: ProfileSectionType, item: ProfileRecordItem) => void
}

interface ThemeConfig {
    title: string
    headerBg: string
    buttonBg: string
    accentColor: string
}

const SECTION_THEMES: Record<ProfileSectionType, ThemeConfig> = {
    meds: {
        title: 'New Medication',
        headerBg: 'bg-[#2563eb]',
        buttonBg: 'bg-[#2563eb]',
        accentColor: '#2563eb',
    },
    conditions: {
        title: 'Add Condition',
        headerBg: 'bg-[#a37f4e]',
        buttonBg: 'bg-[#a37f4e]',
        accentColor: '#a37f4e',
    },
    allergies: {
        title: 'Add Allergy',
        headerBg: 'bg-[#c25953]',
        buttonBg: 'bg-[#c25953]',
        accentColor: '#c25953',
    },
    lifestyle: {
        title: 'Add Lifestyle Habit',
        headerBg: 'bg-[#6f82cb]',
        buttonBg: 'bg-[#6f82cb]',
        accentColor: '#6f82cb',
    },
    vaccinations: {
        title: 'Add Vaccination',
        headerBg: 'bg-[#cca023]',
        buttonBg: 'bg-[#cca023]',
        accentColor: '#cca023',
    },
    events: {
        title: 'Add Appointment',
        headerBg: 'bg-[#8062b8]',
        buttonBg: 'bg-[#8062b8]',
        accentColor: '#8062b8',
    },
    genetics: {
        title: 'Add Family History',
        headerBg: 'bg-[#00875a]',
        buttonBg: 'bg-[#00875a]',
        accentColor: '#00875a',
    },
    providers: {
        title: 'New Provider',
        headerBg: 'bg-[#12828b]',
        buttonBg: 'bg-[#12828b]',
        accentColor: '#12828b',
    },
}

export const GuavaProfileModal = ({ section, onClose, onAdd }: GuavaProfileModalProps) => {
    // Common / Basic States
    const [name, setName] = useState('')
    const [dosage, setDosage] = useState('')
    const [prescriber, setPrescriber] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [showEndDate, setShowEndDate] = useState(false)
    const [isResolved, setIsResolved] = useState(false)
    const [showNotes, setShowNotes] = useState(false)
    const [notes, setNotes] = useState('')
    const [photoUploaded, setPhotoUploaded] = useState(false)

    // Allergy-specific state
    const [allergyType, setAllergyType] = useState<'Allergy' | 'Intolerance'>('Allergy')
    const [isLifeThreatening, setIsLifeThreatening] = useState(false)
    const [severity, setSeverity] = useState<'Low' | 'Moderate' | 'High' | 'Very High'>('Moderate')
    const [category, setCategory] = useState<'Drug' | 'Food' | 'Environment / Animal' | 'Other'>('Drug')

    // Lifestyle-specific state (Screenshot 5)
    const [habitType, setHabitType] = useState('Drinking Caffeine')
    const [lifestyleStatus, setLifestyleStatus] = useState<'Never' | 'Former' | 'Some Days' | 'Daily'>('Never')

    // Vaccination-specific state (Screenshot 1)
    const [protectsAgainst, setProtectsAgainst] = useState('')
    const [isVaxDateActive, setIsVaxDateActive] = useState(false)

    // Provider-specific state (Screenshot 2)
    const [specialty, setSpecialty] = useState('')
    const [phone, setPhone] = useState('')
    const [showPhone, setShowPhone] = useState(false)
    const [fax, setFax] = useState('')
    const [showFax, setShowFax] = useState(false)
    const [email, setEmail] = useState('')
    const [showEmail, setShowEmail] = useState(false)
    const [website, setWebsite] = useState('')
    const [showWebsite, setShowWebsite] = useState(false)
    const [location, setLocation] = useState('')
    const [showLocation, setShowLocation] = useState(false)
    const [firstSeenDate, setFirstSeenDate] = useState('')
    const [showFirstSeenDate, setShowFirstSeenDate] = useState(false)
    const [isNoLongerSeeing, setIsNoLongerSeeing] = useState(false)

    // Appointment / Events-specific state (Screenshot 3)
    const [appointmentTime, setAppointmentTime] = useState('')
    const [appointmentProvider, setAppointmentProvider] = useState('')
    const [appointmentTitle, setAppointmentTitle] = useState('')
    const [showAppointmentTitle, setShowAppointmentTitle] = useState(false)
    const [showAppointmentLocation, setShowAppointmentLocation] = useState(false)
    const [appointmentTags, setAppointmentTags] = useState('')
    const [showAppointmentTags, setShowAppointmentTags] = useState(false)

    // Genetics / Family History-specific state (Screenshot 4)
    const [selectedRelatives, setSelectedRelatives] = useState<string[]>([])

    const fileInputRef = useRef<HTMLInputElement | null>(null)

    if (!section) return null

    const theme = SECTION_THEMES[section]

    const toggleRelative = (rel: string) => {
        setSelectedRelatives((prev) =>
            prev.includes(rel) ? prev.filter((r) => r !== rel) : [...prev, rel],
        )
    }

    const handleSubmit = () => {
        let item: ProfileRecordItem

        if (section === 'meds') {
            const fallback = name.trim() || 'Vitamin D3'
            item = {
                id: `med-${Date.now()}`,
                title: fallback,
                subtitle: dosage.trim() || undefined,
                details: prescriber.trim() ? `Prescriber: ${prescriber.trim()}` : undefined,
                date: startDate ? `Started: ${startDate}` : undefined,
                badge: isResolved ? 'Ended' : 'Active',
                badgeColor: isResolved ? '#64748b' : '#2563eb',
                notes: notes.trim() || undefined,
            }
        } else if (section === 'conditions') {
            const fallback = name.trim() || 'Type II Diabetes'
            item = {
                id: `cond-${Date.now()}`,
                title: fallback,
                date: startDate ? `Onset: ${startDate}` : undefined,
                badge: isResolved ? 'Resolved' : 'Active',
                badgeColor: isResolved ? '#64748b' : '#a37f4e',
                notes: notes.trim() || undefined,
            }
        } else if (section === 'allergies') {
            const fallback = name.trim() || 'Substance'
            item = {
                id: `allg-${Date.now()}`,
                title: fallback,
                subtitle: `${allergyType} • ${category}`,
                details: `Severity: ${severity}${isLifeThreatening ? ' • Life-threatening' : ''}`,
                badge: severity,
                badgeColor: '#c25953',
                notes: notes.trim() || undefined,
            }
        } else if (section === 'lifestyle') {
            item = {
                id: `life-${Date.now()}`,
                title: habitType,
                subtitle: `Status: ${lifestyleStatus}`,
                date: startDate ? `Start: ${startDate}${endDate ? ` • End: ${endDate}` : ''}` : undefined,
                badge: lifestyleStatus,
                badgeColor: '#6f82cb',
                notes: notes.trim() || undefined,
            }
        } else if (section === 'vaccinations') {
            const fallback = name.trim() || 'Pfizer COVID-19 Vaccine'
            item = {
                id: `vax-${Date.now()}`,
                title: fallback,
                subtitle: protectsAgainst.trim() ? `Protects Against: ${protectsAgainst.trim()}` : undefined,
                date: startDate ? `Administered: ${startDate}` : undefined,
                badge: 'Vaccine',
                badgeColor: '#cca023',
                notes: notes.trim() || undefined,
            }
        } else if (section === 'events') {
            const fallback = appointmentTitle.trim() || (appointmentProvider.trim() ? `Appointment with ${appointmentProvider.trim()}` : 'Medical Appointment')
            item = {
                id: `evt-${Date.now()}`,
                title: fallback,
                subtitle: appointmentProvider.trim() ? `Provider: ${appointmentProvider.trim()}` : undefined,
                details: location.trim() ? `Location: ${location.trim()}` : undefined,
                date: startDate ? `${startDate}${appointmentTime ? ` at ${appointmentTime}` : ''}` : undefined,
                badge: 'Appointment',
                badgeColor: '#8062b8',
                notes: notes.trim() || undefined,
            }
        } else if (section === 'genetics') {
            const fallback = name.trim() || 'Condition'
            const relativesLabel = selectedRelatives.length > 0 ? selectedRelatives.join(', ') : 'Family'
            item = {
                id: `gen-${Date.now()}`,
                title: `${relativesLabel}: ${fallback}`,
                subtitle: selectedRelatives.length > 0 ? `Relatives: ${selectedRelatives.join(', ')}` : undefined,
                badge: 'Family History',
                badgeColor: '#00875a',
                notes: notes.trim() || undefined,
            }
        } else {
            // providers
            const fallback = name.trim() || 'Jane Smith, MD'
            const detailsList = [
                phone.trim(),
                fax.trim() ? `Fax: ${fax.trim()}` : '',
                email.trim(),
                location.trim(),
            ].filter(Boolean)
            item = {
                id: `prov-${Date.now()}`,
                title: fallback,
                subtitle: specialty.trim() || undefined,
                details: detailsList.length > 0 ? detailsList.join(' • ') : undefined,
                date: firstSeenDate ? `First seen: ${firstSeenDate}` : undefined,
                badge: isNoLongerSeeing ? 'Past' : (specialty.trim() || 'Care Provider'),
                badgeColor: isNoLongerSeeing ? '#64748b' : '#12828b',
                notes: notes.trim() || undefined,
            }
        }

        onAdd(section, item)
    }

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
            className='fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center bg-black/45 backdrop-blur-[1px] lg:p-4 transition-all'
        >
            {/* Modal Container: Full Screen on Mobile, Centered Card on Desktop */}
            <div className='w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-[490px] bg-white lg:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in'>
                {/* Header matching exact reference screenshot */}
                <div className={`${theme.headerBg} px-4 sm:px-5 py-3.5 sm:py-4 flex items-center gap-3 text-white shrink-0`}>
                    <button
                        type='button'
                        onClick={onClose}
                        aria-label='Back'
                        className='p-1 rounded-full hover:bg-white/15 transition-colors text-white text-base sm:text-lg flex items-center justify-center -ml-1'
                    >
                        <ArrowLeftOutlined className='stroke-[2]'/>
                    </button>
                    <h2 className='text-base sm:text-lg font-semibold text-white tracking-tight leading-tight select-none'>
                        {theme.title}
                    </h2>
                </div>

                {/* Form Body: Scrollable */}
                <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col gap-4 text-sm'>
                    {/* 1. Meds & Supplements Form */}
                    {section === 'meds' && (
                        <>
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Medication or Supplement Name
                                </label>
                                <input
                                    type='text'
                                    value={name}
                                    onChange={(e) => { setName(e.target.value) }}
                                    placeholder='Vitamin D3'
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] transition-colors'
                                />
                            </div>

                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Dosage & Timing
                                </label>
                                <input
                                    type='text'
                                    value={dosage}
                                    onChange={(e) => { setDosage(e.target.value) }}
                                    placeholder='125 mcg daily with breakfast'
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] transition-colors'
                                />
                            </div>

                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Prescriber
                                </label>
                                <input
                                    type='text'
                                    value={prescriber}
                                    onChange={(e) => { setPrescriber(e.target.value) }}
                                    placeholder='Dr. Smith'
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] transition-colors'
                                />
                            </div>

                            {/* Photos Button */}
                            <div
                                onClick={() => {
                                    fileInputRef.current?.click()
                                    setPhotoUploaded(true)
                                }}
                                className='flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] w-fit border border-[#e2e8f0] cursor-pointer transition-colors pr-5'
                            >
                                <div className='w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm text-[#64748b] shadow-2xs'>
                                    <CameraOutlined className='text-base text-[#475569]'/>
                                </div>
                                <div className='flex flex-col'>
                                    <span className='text-xs font-semibold text-[#1e293b]'>Photos</span>
                                    <span className='text-xs font-bold text-[#2563eb]'>
                                        {photoUploaded ? '✓ Added' : '+ Add'}
                                    </span>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type='file'
                                    accept='image/*'
                                    className='hidden'
                                    onChange={() => { setPhotoUploaded(true) }}
                                />
                            </div>

                            {/* Start Date + End Date */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Start Date
                                </label>
                                <div className='flex flex-wrap items-center gap-3'>
                                    <div className='relative flex items-center flex-1 min-w-[150px] max-w-[200px]'>
                                        <input
                                            type='date'
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value) }}
                                            className='w-full pl-3.5 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#2563eb]'
                                        />
                                        <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                    </div>
                                    {!showEndDate ? (
                                        <button
                                            type='button'
                                            onClick={() => { setShowEndDate(true) }}
                                            className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 py-1 px-2 rounded-md hover:bg-[#f1f5f9] transition-colors'
                                        >
                                            + Add End Date
                                        </button>
                                    ) : (
                                        <div className='relative flex items-center flex-1 min-w-[150px] max-w-[200px]'>
                                            <input
                                                type='date'
                                                value={endDate}
                                                onChange={(e) => { setEndDate(e.target.value) }}
                                                className='w-full pl-3.5 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#2563eb]'
                                            />
                                            <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Checkbox */}
                            <label className='flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-[#334155] select-none'>
                                <input
                                    type='checkbox'
                                    checked={isResolved}
                                    onChange={(e) => { setIsResolved(e.target.checked) }}
                                    className='w-4 h-4 rounded border-[#cbd5e1] text-[#2563eb] focus:ring-0 cursor-pointer'
                                />
                                <span>I'm no longer taking this</span>
                            </label>

                            {/* Notes toggle */}
                            {!showNotes ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowNotes(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit py-1'
                                >
                                    + Add Notes
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-semibold text-[#475569]'>Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => { setNotes(e.target.value) }}
                                        rows={3}
                                        placeholder='Add notes or instructions...'
                                        className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb]'
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* 2. Conditions Form */}
                    {section === 'conditions' && (
                        <>
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Condition
                                </label>
                                <input
                                    type='text'
                                    value={name}
                                    onChange={(e) => { setName(e.target.value) }}
                                    placeholder='Type II Diabetes'
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#a37f4e] transition-colors'
                                />
                            </div>

                            {/* Onset Date + End Date */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Onset Date
                                </label>
                                <div className='flex flex-wrap items-center gap-3'>
                                    <div className='relative flex items-center flex-1 min-w-[150px] max-w-[200px]'>
                                        <input
                                            type='date'
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value) }}
                                            className='w-full pl-3.5 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#a37f4e]'
                                        />
                                        <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                    </div>
                                    {!showEndDate ? (
                                        <button
                                            type='button'
                                            onClick={() => { setShowEndDate(true) }}
                                            className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 py-1 px-2 rounded-md hover:bg-[#f1f5f9] transition-colors'
                                        >
                                            + Add End Date
                                        </button>
                                    ) : (
                                        <div className='relative flex items-center flex-1 min-w-[150px] max-w-[200px]'>
                                            <input
                                                type='date'
                                                value={endDate}
                                                onChange={(e) => { setEndDate(e.target.value) }}
                                                className='w-full pl-3.5 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#a37f4e]'
                                            />
                                            <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Checkbox */}
                            <label className='flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-[#334155] select-none'>
                                <input
                                    type='checkbox'
                                    checked={isResolved}
                                    onChange={(e) => { setIsResolved(e.target.checked) }}
                                    className='w-4 h-4 rounded border-[#cbd5e1] text-[#a37f4e] focus:ring-0 cursor-pointer'
                                />
                                <span>I no longer have this condition</span>
                            </label>

                            {/* Notes toggle */}
                            {!showNotes ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowNotes(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit py-1'
                                >
                                    + Add Notes
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-semibold text-[#475569]'>Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => { setNotes(e.target.value) }}
                                        rows={3}
                                        placeholder='Add notes or history...'
                                        className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#a37f4e]'
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* 3. Allergies Form */}
                    {section === 'allergies' && (
                        <>
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Substance
                                </label>
                                <input
                                    type='text'
                                    value={name}
                                    onChange={(e) => { setName(e.target.value) }}
                                    placeholder='Penicillin, Peanuts, Pollen...'
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#c25953] transition-colors'
                                />
                            </div>

                            {/* Type Segmented Control with Info tooltip */}
                            <div className='flex flex-col gap-1.5'>
                                <div className='flex items-center gap-1.5'>
                                    <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>Type</label>
                                    <InfoCircleOutlined className='text-xs text-[#94a3b8]'/>
                                </div>
                                <div className='flex items-center gap-2'>
                                    <button
                                        type='button'
                                        onClick={() => { setAllergyType('Allergy') }}
                                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            allergyType === 'Allergy'
                                                ? 'bg-[#c25953] text-white shadow-xs'
                                                : 'bg-[#e2e8f0]/80 text-[#475569] hover:bg-[#cbd5e1]'
                                        }`}
                                    >
                                        Allergy
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => { setAllergyType('Intolerance') }}
                                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            allergyType === 'Intolerance'
                                                ? 'bg-[#c25953] text-white shadow-xs'
                                                : 'bg-[#e2e8f0]/80 text-[#475569] hover:bg-[#cbd5e1]'
                                        }`}
                                    >
                                        Intolerance
                                    </button>
                                </div>
                            </div>

                            {/* Checkbox */}
                            <label className='flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-[#334155] select-none'>
                                <input
                                    type='checkbox'
                                    checked={isLifeThreatening}
                                    onChange={(e) => { setIsLifeThreatening(e.target.checked) }}
                                    className='w-4 h-4 rounded border-[#cbd5e1] text-[#c25953] focus:ring-0 cursor-pointer'
                                />
                                <span>Life-threatening (e.g. Anaphylaxis)</span>
                            </label>

                            {/* Estimated Severity */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Estimated Severity
                                </label>
                                <div className='flex flex-wrap items-center gap-2'>
                                    {(['Low', 'Moderate', 'High', 'Very High'] as const).map((sev) => (
                                        <button
                                            key={sev}
                                            type='button'
                                            onClick={() => { setSeverity(sev) }}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                severity === sev
                                                    ? 'bg-[#c25953] text-white shadow-xs font-semibold'
                                                    : 'bg-[#e2e8f0]/80 text-[#475569] hover:bg-[#cbd5e1]'
                                            }`}
                                        >
                                            {sev}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Category
                                </label>
                                <div className='flex flex-wrap items-center gap-2'>
                                    {(['Drug', 'Food', 'Environment / Animal', 'Other'] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            type='button'
                                            onClick={() => { setCategory(cat) }}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                category === cat
                                                    ? 'bg-[#c25953] text-white shadow-xs font-semibold'
                                                    : 'bg-[#e2e8f0]/80 text-[#475569] hover:bg-[#cbd5e1]'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes Textarea */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => { setNotes(e.target.value) }}
                                    rows={3}
                                    placeholder='Describe symptoms, reactions, or treatments...'
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#c25953]'
                                />
                            </div>
                        </>
                    )}

                    {/* 4. Lifestyle Habit Form (Screenshot 5) */}
                    {section === 'lifestyle' && (
                        <>
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Habit Type
                                </label>
                                <div className='relative'>
                                    <select
                                        value={habitType}
                                        onChange={(e) => { setHabitType(e.target.value) }}
                                        className='w-full appearance-none bg-white px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#6f82cb] transition-colors pr-9'
                                    >
                                        <option value='Drinking Caffeine'>Drinking Caffeine</option>
                                        <option value='Alcohol'>Alcohol</option>
                                        <option value='Exercise'>Exercise</option>
                                        <option value='Sleep'>Sleep</option>
                                        <option value='Smoking'>Smoking</option>
                                        <option value='Meditation'>Meditation</option>
                                        <option value='Diet'>Diet</option>
                                        <option value='Hydration'>Hydration</option>
                                        <option value='Other'>Other</option>
                                    </select>
                                    <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748b] text-xs'>
                                        ▼
                                    </div>
                                </div>
                            </div>

                            {/* Status Pills */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Status
                                </label>
                                <div className='flex flex-wrap items-center gap-2'>
                                    {(['Never', 'Former', 'Some Days', 'Daily'] as const).map((st) => (
                                        <button
                                            key={st}
                                            type='button'
                                            onClick={() => { setLifestyleStatus(st) }}
                                            className={`px-3.5 py-1.5 rounded-md text-xs transition-all ${
                                                lifestyleStatus === st
                                                    ? 'bg-[#6f82cb] text-white shadow-xs font-semibold'
                                                    : 'bg-[#e4e4e7] text-[#3f3f46] hover:bg-[#d4d4d8]'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Start Date + End Date (if not current) Side-by-Side */}
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                        Start Date
                                    </label>
                                    <div className='relative flex items-center'>
                                        <input
                                            type='date'
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value) }}
                                            className='w-full pl-3.5 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#6f82cb]'
                                        />
                                        <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                    </div>
                                </div>

                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                        End Date (if not current)
                                    </label>
                                    <div className='relative flex items-center'>
                                        <input
                                            type='date'
                                            value={endDate}
                                            onChange={(e) => { setEndDate(e.target.value) }}
                                            className='w-full pl-3.5 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#6f82cb]'
                                        />
                                        <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                    </div>
                                </div>
                            </div>

                            {/* Notes toggle */}
                            {!showNotes ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowNotes(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit py-1'
                                >
                                    + Add Notes
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-semibold text-[#475569]'>Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => { setNotes(e.target.value) }}
                                        rows={3}
                                        placeholder='Add notes or routine details...'
                                        className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#6f82cb]'
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* 5. Vaccinations Form (Screenshot 1) */}
                    {section === 'vaccinations' && (
                        <>
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Vaccination Name
                                </label>
                                <input
                                    type='text'
                                    value={name}
                                    onChange={(e) => { setName(e.target.value) }}
                                    placeholder='DTaP-IPV, Pfizer COVID-19 Vaccine, ...'
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#cca023] transition-colors'
                                />
                            </div>

                            {/* Protects Against (optional) with search input */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Protects Against (optional)
                                </label>
                                <div className='relative flex items-center'>
                                    <SearchOutlined className='absolute left-3.5 text-sm text-[#94a3b8] pointer-events-none'/>
                                    <input
                                        type='text'
                                        value={protectsAgainst}
                                        onChange={(e) => { setProtectsAgainst(e.target.value) }}
                                        placeholder='Add Vaccine Group...'
                                        className='w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-[#f4f4f5] border border-transparent hover:border-[#cbd5e1] focus:bg-white focus:border-[#cca023] text-sm text-[#1e293b] placeholder-[#71717a] focus:outline-none transition-colors'
                                    />
                                </div>
                            </div>

                            {/* Date Administered with 'Set Date' button or Date picker */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Date Administered
                                </label>
                                {!isVaxDateActive ? (
                                    <button
                                        type='button'
                                        onClick={() => { setIsVaxDateActive(true) }}
                                        className='inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#f4f4f5] hover:bg-[#e4e4e7] text-xs font-semibold text-[#3f3f46] transition-colors w-fit border border-[#e4e4e7]'
                                    >
                                        <CalendarOutlined className='text-sm text-[#52525b]'/>
                                        <span>Set Date</span>
                                    </button>
                                ) : (
                                    <div className='relative flex items-center max-w-[200px]'>
                                        <input
                                            type='date'
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value) }}
                                            className='w-full pl-3.5 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#cca023]'
                                        />
                                        <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                    </div>
                                )}
                            </div>

                            {/* Notes toggle */}
                            {!showNotes ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowNotes(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit py-1'
                                >
                                    + Add Notes
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-semibold text-[#475569]'>Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => { setNotes(e.target.value) }}
                                        rows={3}
                                        placeholder='Dose number, lot code, or reactions...'
                                        className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#cca023]'
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* 6. Events / Appointments Form (Screenshot 3) */}
                    {section === 'events' && (
                        <>
                            {/* Notification Info Banner */}
                            <div className='text-xs text-[#52525b] leading-relaxed font-normal bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]'>
                                Adding an appointment will not notify your provider, and is for tracking and preparation purposes only.
                            </div>

                            {/* Date / Time Row */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Date/Time
                                </label>
                                <div className='grid grid-cols-2 gap-3 max-w-[320px]'>
                                    <div className='relative flex items-center'>
                                        <input
                                            type='date'
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value) }}
                                            className='w-full pl-3 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-xs sm:text-sm text-[#1e293b] focus:outline-none focus:border-[#8062b8]'
                                        />
                                        <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                    </div>
                                    <div className='relative flex items-center'>
                                        <input
                                            type='time'
                                            value={appointmentTime}
                                            onChange={(e) => { setAppointmentTime(e.target.value) }}
                                            className='w-full pl-3 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-xs sm:text-sm text-[#1e293b] focus:outline-none focus:border-[#8062b8]'
                                        />
                                        <ClockCircleOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                    </div>
                                </div>
                            </div>

                            {/* Provider Search Box */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Provider
                                </label>
                                <div className='relative flex items-center'>
                                    <SearchOutlined className='absolute left-3.5 text-sm text-[#94a3b8] pointer-events-none'/>
                                    <input
                                        type='text'
                                        value={appointmentProvider}
                                        onChange={(e) => { setAppointmentProvider(e.target.value) }}
                                        placeholder='Select Provider...'
                                        className='w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-[#f4f4f5] border border-transparent hover:border-[#cbd5e1] focus:bg-white focus:border-[#8062b8] text-sm text-[#1e293b] placeholder-[#71717a] focus:outline-none transition-colors'
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            {!showAppointmentTitle ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowAppointmentTitle(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Title
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Title</label>
                                    <input
                                        type='text'
                                        value={appointmentTitle}
                                        onChange={(e) => { setAppointmentTitle(e.target.value) }}
                                        placeholder='Annual Checkup, Consultation...'
                                        className='w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#8062b8]'
                                    />
                                </div>
                            )}

                            {!showAppointmentLocation ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowAppointmentLocation(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Location
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Location</label>
                                    <input
                                        type='text'
                                        value={location}
                                        onChange={(e) => { setLocation(e.target.value) }}
                                        placeholder='Clinic, Room # or Address...'
                                        className='w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#8062b8]'
                                    />
                                </div>
                            )}

                            {!showAppointmentTags ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowAppointmentTags(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Tags
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Tags</label>
                                    <input
                                        type='text'
                                        value={appointmentTags}
                                        onChange={(e) => { setAppointmentTags(e.target.value) }}
                                        placeholder='e.g. routine, urgent, specialist'
                                        className='w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#8062b8]'
                                    />
                                </div>
                            )}

                            {!showNotes ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowNotes(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Notes
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-semibold text-[#475569]'>Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => { setNotes(e.target.value) }}
                                        rows={3}
                                        placeholder='Preparation instructions, questions to ask...'
                                        className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#8062b8]'
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* 7. Genetics / Family History Form (Screenshot 4) */}
                    {section === 'genetics' && (
                        <>
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Condition
                                </label>
                                <input
                                    type='text'
                                    value={name}
                                    onChange={(e) => { setName(e.target.value) }}
                                    placeholder=''
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#00875a] transition-colors'
                                />
                            </div>

                            {/* Relatives Affected Pills matching Screenshot 4 */}
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Relatives Affected
                                </label>
                                <div className='flex flex-wrap items-center gap-2'>
                                    {['Mother', 'Father', 'Sibling', 'Grandparent', 'Aunt', 'Uncle', 'Child', 'Cousin', 'Other'].map((rel) => {
                                        const isSelected = selectedRelatives.includes(rel)
                                        return (
                                            <button
                                                key={rel}
                                                type='button'
                                                onClick={() => { toggleRelative(rel) }}
                                                className={`px-3.5 py-1.5 rounded-md text-xs transition-all ${
                                                    isSelected
                                                        ? 'bg-[#00875a] text-white shadow-xs font-semibold'
                                                        : 'bg-[#e4e4e7] text-[#3f3f46] hover:bg-[#d4d4d8]'
                                                }`}
                                            >
                                                {rel}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Notes toggle */}
                            {!showNotes ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowNotes(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit py-1'
                                >
                                    + Add Notes
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-semibold text-[#475569]'>Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => { setNotes(e.target.value) }}
                                        rows={3}
                                        placeholder='Additional genetic details, tests, or notes...'
                                        className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#00875a]'
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* 8. Care Providers Form (Screenshot 2) */}
                    {section === 'providers' && (
                        <>
                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Name
                                </label>
                                <input
                                    type='text'
                                    value={name}
                                    onChange={(e) => { setName(e.target.value) }}
                                    placeholder='Jane Smith, MD'
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#12828b] transition-colors'
                                />
                            </div>

                            <div className='flex flex-col gap-1.5'>
                                <label className='text-xs sm:text-sm font-semibold text-[#1e293b]'>
                                    Specialty
                                </label>
                                <input
                                    type='text'
                                    value={specialty}
                                    onChange={(e) => { setSpecialty(e.target.value) }}
                                    placeholder=''
                                    className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#12828b]'
                                />
                            </div>

                            {/* Additional fields with + Add toggles matching Screenshot 2 */}
                            {!showPhone ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowPhone(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Phone Number
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Phone Number</label>
                                    <input
                                        type='tel'
                                        value={phone}
                                        onChange={(e) => { setPhone(e.target.value) }}
                                        placeholder='(555) 123-4567'
                                        className='w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#12828b]'
                                    />
                                </div>
                            )}

                            {!showFax ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowFax(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Fax Number
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Fax Number</label>
                                    <input
                                        type='tel'
                                        value={fax}
                                        onChange={(e) => { setFax(e.target.value) }}
                                        placeholder='(555) 987-6543'
                                        className='w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#12828b]'
                                    />
                                </div>
                            )}

                            {!showEmail ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowEmail(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Email Address
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Email Address</label>
                                    <input
                                        type='email'
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value) }}
                                        placeholder='doctor@clinic.com'
                                        className='w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#12828b]'
                                    />
                                </div>
                            )}

                            {!showWebsite ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowWebsite(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Website
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Website</label>
                                    <input
                                        type='url'
                                        value={website}
                                        onChange={(e) => { setWebsite(e.target.value) }}
                                        placeholder='https://clinic.org'
                                        className='w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#12828b]'
                                    />
                                </div>
                            )}

                            {!showLocation ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowLocation(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Location
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>Location</label>
                                    <input
                                        type='text'
                                        value={location}
                                        onChange={(e) => { setLocation(e.target.value) }}
                                        placeholder='Hospital name or clinic address...'
                                        className='w-full px-3 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#12828b]'
                                    />
                                </div>
                            )}

                            {!showFirstSeenDate ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowFirstSeenDate(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add First Seen Date
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1'>
                                    <label className='text-xs font-semibold text-[#475569]'>First Seen Date</label>
                                    <div className='relative flex items-center max-w-[200px]'>
                                        <input
                                            type='date'
                                            value={firstSeenDate}
                                            onChange={(e) => { setFirstSeenDate(e.target.value) }}
                                            className='w-full pl-3.5 pr-8 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#12828b]'
                                        />
                                        <CalendarOutlined className='absolute right-2.5 text-xs text-[#64748b] pointer-events-none'/>
                                    </div>
                                </div>
                            )}

                            {/* Checkbox: I'm no longer seeing this provider */}
                            <label className='flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-[#334155] select-none mt-1'>
                                <input
                                    type='checkbox'
                                    checked={isNoLongerSeeing}
                                    onChange={(e) => { setIsNoLongerSeeing(e.target.checked) }}
                                    className='w-4 h-4 rounded border-[#cbd5e1] text-[#12828b] focus:ring-0 cursor-pointer'
                                />
                                <span>I'm no longer seeing this provider</span>
                            </label>

                            {/* Notes toggle */}
                            {!showNotes ? (
                                <button
                                    type='button'
                                    onClick={() => { setShowNotes(true) }}
                                    className='text-xs font-semibold text-[#475569] hover:text-[#1e293b] flex items-center gap-1 w-fit py-1'
                                >
                                    <PlusOutlined className='text-[10px]'/> Add Notes
                                </button>
                            ) : (
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-semibold text-[#475569]'>Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => { setNotes(e.target.value) }}
                                        rows={3}
                                        placeholder='Office hours, patient portal, or direct contact...'
                                        className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:border-[#12828b]'
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Bottom Add Pill Button matching reference screenshot */}
                    <div className='pt-5 pb-8 sm:pb-6 flex justify-center shrink-0'>
                        <button
                            type='button'
                            onClick={handleSubmit}
                            className={`px-12 py-2.5 rounded-full text-white font-semibold text-sm shadow-md transition-all hover:opacity-90 active:scale-95 ${theme.buttonBg}`}
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
