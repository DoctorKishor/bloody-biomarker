import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

import {
    EditOutlined,
    RightOutlined,
    PlusOutlined,
    CalendarOutlined,
    MedicineBoxOutlined,
    UserOutlined,
    DeleteOutlined,
} from '@ant-design/icons'
import { message } from 'antd'

import { HealthScoresDrawer } from '@/components/HealthScoresDrawer'
import { getBiomarkerSystem } from '@/constants/bodySystems'
import { BIOMARKER_CONFIGS, useBiomarkerConfigs } from '@/db/models/biomarkerConfig'
import { useBiomarkerRecords } from '@/db/models/biomarkerRecord'
import { getNameByUcum, useUnits } from '@/db/models/unit'
import {
    useCurrentUser,
    useUsers,
    updateUser,
    createNewProfile,
    deleteProfileWithCascade,
    User,
} from '@/db/models/user'
import { switchActiveUserId } from '@/db/services/db.service'
import { evaluateBiomarkerRange } from '@/utils/referenceRange'

import {
    EditProfileModal,
    AddProfileModal,
} from './GuavaProfileEditModal'
import {
    GuavaProfileModal,
    ProfileSectionType,
    ProfileRecordItem,
} from './GuavaProfileModal'

export interface GuavaProfilePageProps {
    onNavigateToBiomarkers: () => void
    onAddResult?: () => void
}

export const GuavaProfilePage = (props: GuavaProfilePageProps) => {
    const { onNavigateToBiomarkers, onAddResult } = props
    const currentUser = useCurrentUser()
    const userGender = currentUser?.gender ?? 'male'
    const userAge = currentUser?.age ?? 35

    const [isScoreDrawerOpen, setIsScoreDrawerOpen] = useState(false)
    const [activeNav, setActiveNav] = useState('basic')
    const [activeModal, setActiveModal] = useState<ProfileSectionType | null>(null)
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false)
    const [isAddProfileModalOpen, setIsAddProfileModalOpen] = useState(false)
    const [profileVersion, setProfileVersion] = useState(0)

    const { data: allProfiles = [] } = useUsers()

    // Load profile records partitioned by active user ID cleanly without cascading effects
    const profileRecords = useMemo((): Record<ProfileSectionType, ProfileRecordItem[]> => {
        const defaultEmpty: Record<ProfileSectionType, ProfileRecordItem[]> = {
            meds: [],
            conditions: [],
            allergies: [],
            lifestyle: [],
            vaccinations: [],
            events: [],
            genetics: [],
            providers: [],
        }
        if (!currentUser?.id) return defaultEmpty
        try {
            const raw = localStorage.getItem(`guava_profile_records_${currentUser.id}`)
            if (raw) {
                const parsed = JSON.parse(raw) as unknown
                if (typeof parsed === 'object' && parsed !== null) {
                    return parsed as Record<ProfileSectionType, ProfileRecordItem[]>
                }
            }
        } catch {
            // Ignore parse errors
        }
        return defaultEmpty
    }, [currentUser?.id, profileVersion])

    const { data: configs } = useBiomarkerConfigs({ filter: (c) => c.approved })
    const { data: records } = useBiomarkerRecords({ filter: (r) => r.approved })
    const { data: units } = useUnits()

    const handleToggleGender = async () => {
        if (!currentUser) return
        const nextGender = userGender === 'male' ? 'female' : 'male'
        await updateUser(currentUser.id, {
            gender: nextGender,
            updatedAt: new Date(),
        })
        void message.success(`Profile updated to ${nextGender === 'male' ? 'Male (♂)' : 'Female (♀)'}`)
    }

    const sidebarItems = [
        {
            id: 'basic',
            label: 'Basic Info',
            icon: <UserOutlined/>,
        },
        {
            id: 'biomarkers',
            label: 'Biomarkers',
            icon: <span className='text-sm'>🧪</span>,
        },
        {
            id: 'meds',
            label: 'Medications & Supplements',
            icon: <MedicineBoxOutlined/>,
        },
        {
            id: 'conditions',
            label: 'Conditions & Injuries',
            icon: <span className='text-sm'>🩹</span>,
        },
        {
            id: 'allergies',
            label: 'Allergies',
            icon: <span className='text-sm'>✳️</span>,
        },
        {
            id: 'vaccinations',
            label: 'Vaccinations',
            icon: <span className='text-sm'>💉</span>,
        },
        {
            id: 'events',
            label: 'Events',
            icon: <CalendarOutlined/>,
        },
        {
            id: 'genetics',
            label: 'Genetics',
            icon: <span className='text-sm'>🧬</span>,
        },
        {
            id: 'providers',
            label: 'Care Providers',
            icon: <span className='text-sm'>🧑‍⚕️</span>,
        },
        {
            id: 'lifestyle',
            label: 'Lifestyle',
            icon: <span className='text-sm'>🧘</span>,
        },
    ]

    const mainScrollRef = useRef<HTMLElement | null>(null)

    const scrollToSection = useCallback((id: string) => {
        setActiveNav(id)
        const element = document.getElementById(`section-${id}`)
        const mainEl = mainScrollRef.current

        if (mainEl && window.innerWidth >= 1024) {
            if (element) {
                const mainRect = mainEl.getBoundingClientRect()
                const elemRect = element.getBoundingClientRect()
                const targetScrollTop = mainEl.scrollTop + (elemRect.top - mainRect.top) - 16
                mainEl.scrollTo({
                    top: Math.max(0, targetScrollTop),
                    behavior: 'smooth',
                })
            }
        } else if (element) {
            const headerOffset = 80
            const elementPosition = element.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            })
        }
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            const sectionIds = sidebarItems.map((item) => item.id)
            const mainEl = mainScrollRef.current

            if (mainEl && window.innerWidth >= 1024) {
                const mainTop = mainEl.getBoundingClientRect().top
                for (let i = sectionIds.length - 1; i >= 0; i--) {
                    const sectionId = sectionIds[i]
                    const element = document.getElementById(`section-${sectionId}`)
                    if (element) {
                        const elemTop = element.getBoundingClientRect().top - mainTop
                        if (elemTop <= 140) {
                            setActiveNav(sectionId)
                            break
                        }
                    }
                }
            } else {
                const scrollPosition = window.scrollY + 100
                for (let i = sectionIds.length - 1; i >= 0; i--) {
                    const sectionId = sectionIds[i]
                    const element = document.getElementById(`section-${sectionId}`)
                    if (element && element.offsetTop <= scrollPosition) {
                        setActiveNav(sectionId)
                        break
                    }
                }
            }
        }

        const mainEl = mainScrollRef.current
        if (mainEl) {
            mainEl.addEventListener('scroll', handleScroll, { passive: true })
        }
        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            if (mainEl) {
                mainEl.removeEventListener('scroll', handleScroll)
            }
            window.removeEventListener('scroll', handleScroll)
        }
    }, [sidebarItems])

    // Calculate system biomarker status dots based on real DB configs and records
    const systemSummaries = useMemo(() => {
        const systems = [
            {
                id: 'heart',
                name: 'Heart',
                icon: '❤️',
            },
            {
                id: 'kidney',
                name: 'Kidney',
                icon: '🫘',
            },
            {
                id: 'liver',
                name: 'Liver',
                icon: '🫁',
            },
            {
                id: 'metabolic',
                name: 'Metabolic',
                icon: '⚡',
            },
            {
                id: 'blood',
                name: 'Blood',
                icon: '🩸',
            },
            {
                id: 'immune',
                name: 'Immune',
                icon: '🛡️',
            },
            {
                id: 'electrolytes',
                name: 'Electrolytes',
                icon: '💧',
            },
        ]

        return systems.map((sys) => {
            // Find all biomarker configs belonging to this system
            const matchingConfigs = configs.filter((c) => getBiomarkerSystem(c.name).id === sys.id)

            // If no configs in DB yet for this system, fall back to initial default configs so system has defined tests
            const configsToUse = matchingConfigs.length > 0
                ? matchingConfigs
                : BIOMARKER_CONFIGS.filter((c) => c.name && getBiomarkerSystem(c.name).id === sys.id)

            const dots = configsToUse.map((cfg, idx) => {
                const configId = cfg.id ?? `def-${sys.id}-${idx}`
                const configName = cfg.name ?? 'Biomarker'

                const configRecords = records
                    .filter((r) => (r.biomarkerId === configId || (cfg.name && r.originalName === cfg.name)) &&
                        (r.value !== undefined || r.textValue !== undefined))
                    .sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                        return dateB - dateA
                    })

                const latestRecord = configRecords[0]

                if (!latestRecord || (latestRecord.value === undefined && !latestRecord.textValue)) {
                    return {
                        biomarkerId: configId,
                        name: configName,
                        status: 'no-data' as const,
                        colorClass: 'bg-[#cbd5e1]',
                        tooltip: `${configName}: No data`,
                    }
                }

                const resolvedUnitName = getNameByUcum(units, cfg.ucumCode)
                const unitLabel = resolvedUnitName && resolvedUnitName.length > 0
                    ? resolvedUnitName
                    : (cfg.ucumCode ?? '')

                const reportRangeRaw = latestRecord.referenceRange ?? latestRecord.referenceRangeString ?? cfg.normalRange
                const evaluation = evaluateBiomarkerRange({
                    biomarkerName: configName,
                    value: latestRecord.value,
                    unit: unitLabel,
                    reportRangeRaw,
                    userGender,
                    userAge,
                })

                const displayVal = latestRecord.value !== undefined ? String(latestRecord.value) : (latestRecord.textValue ?? '')
                const valueWithUnit = `${displayVal}${unitLabel ? ' ' + unitLabel : ''}`

                if (!evaluation.isAbnormal || evaluation.status === 'Optimal' || evaluation.status === 'Normal' || evaluation.status === 'In range') {
                    return {
                        biomarkerId: configId,
                        name: configName,
                        status: 'normal' as const,
                        colorClass: 'bg-[#10b981]',
                        tooltip: `${configName}: ${evaluation.statusLabel} (${valueWithUnit})`,
                    }
                }

                const labelLower = evaluation.statusLabel.toLowerCase()
                const isBorderline = evaluation.status === 'Borderline High' || labelLower.includes('borderline') || labelLower.includes('impaired')

                if (isBorderline) {
                    return {
                        biomarkerId: configId,
                        name: configName,
                        status: 'borderline' as const,
                        colorClass: 'bg-[#f59e0b]',
                        tooltip: `${configName}: ${evaluation.statusLabel} (${valueWithUnit})`,
                    }
                }

                return {
                    biomarkerId: configId,
                    name: configName,
                    status: 'abnormal' as const,
                    colorClass: 'bg-[#ef4444]',
                    tooltip: `${configName}: ${evaluation.statusLabel} (${valueWithUnit})`,
                }
            })

            // Sort dots: Green (normal) -> Orange (borderline) -> Red (abnormal) -> Grey (no data)
            const statusOrder: Record<string, number> = {
                normal: 1,
                borderline: 2,
                abnormal: 3,
                'no-data': 4,
            }

            const sortedDots = [...dots].sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5))

            return {
                ...sys,
                totalTests: dots.length,
                normalCount: dots.filter((d) => d.status === 'normal').length,
                borderlineCount: dots.filter((d) => d.status === 'borderline').length,
                abnormalCount: dots.filter((d) => d.status === 'abnormal').length,
                noDataCount: dots.filter((d) => d.status === 'no-data').length,
                dots: sortedDots,
            }
        })
    }, [configs, records, units, userGender, userAge])

    const handleAddRecord = (section: ProfileSectionType, item: ProfileRecordItem) => {
        if (currentUser?.id) {
            try {
                const current = profileRecords[section] ?? []
                const updated = {
                    ...profileRecords,
                    [section]: [item, ...current],
                }
                localStorage.setItem(`guava_profile_records_${currentUser.id}`, JSON.stringify(updated))
                setProfileVersion((v) => v + 1)
            } catch {
                // Ignore storage errors
            }
        }
        setActiveModal(null)
        void message.success(`${item.title} added to profile`)
    }

    const handleDeleteRecord = (section: ProfileSectionType, id: string) => {
        if (currentUser?.id) {
            try {
                const current = profileRecords[section] ?? []
                const updated = {
                    ...profileRecords,
                    [section]: current.filter((item) => item.id !== id),
                }
                localStorage.setItem(`guava_profile_records_${currentUser.id}`, JSON.stringify(updated))
                setProfileVersion((v) => v + 1)
            } catch {
                // Ignore storage errors
            }
        }
        void message.info('Item removed')
    }

    const handleCreateProfile = async (params: {
        name: string
        gender: 'male' | 'female'
        age: number
        birthDate?: string
        bloodType?: string
        height?: string
        email?: string
    }) => {
        const newUser = await createNewProfile(params)
        void message.success(`Profile "${newUser.name}" created and selected!`)
    }

    const handleSaveProfile = async (updates: Partial<User>) => {
        if (!currentUser) return
        await updateUser(currentUser.id, {
            ...updates,
            updatedAt: new Date(),
        })
        void message.success('Profile details updated successfully')
    }

    const handleDeleteCurrentProfile = async () => {
        if (!currentUser) return
        await deleteProfileWithCascade(currentUser.id)
        void message.success('Profile deleted')
    }

    const handleActionClick = (featureName: string) => {
        if (featureName === 'Edit Profile' || featureName === 'Add Blood Type') {
            setIsEditProfileModalOpen(true)
        } else if (featureName === 'Add Medication' || featureName === 'New Med') {
            setActiveModal('meds')
        } else if (featureName === 'Add Condition' || featureName === 'Add Injury') {
            setActiveModal('conditions')
        } else if (featureName === 'Add Allergy') {
            setActiveModal('allergies')
        } else if (featureName === 'Add Vaccination') {
            setActiveModal('vaccinations')
        } else if (featureName === 'Add Event' || featureName === 'Add Appointment' || featureName === 'New Appointment') {
            setActiveModal('events')
        } else if (featureName === 'Add Family History') {
            setActiveModal('genetics')
        } else if (featureName === 'Add Provider') {
            setActiveModal('providers')
        } else if (featureName === 'Add Lifestyle Habit') {
            setActiveModal('lifestyle')
        } else {
            void message.info(`${featureName} will be configurable here soon.`)
        }
    }

    return (
        <div className='min-h-screen lg:min-h-0 lg:h-full bg-[#f8faf9] text-[#192823] select-none w-full overflow-x-hidden lg:overflow-hidden'>
            <div className='max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-0 flex flex-col lg:flex-row gap-4 lg:gap-8 w-full box-border lg:h-full lg:overflow-hidden'>
                {/* Left Navigation Rail (Constant, stays stationary) */}
                <aside className='w-72 shrink-0 hidden lg:flex flex-col py-6 h-full justify-start'>
                    <div className='bg-white rounded-2xl border border-[#e5ece8] p-3 flex flex-col gap-1 shadow-sm w-full'>
                        {sidebarItems.map((item) => {
                            const isActive = activeNav === item.id
                            return (
                                <button
                                    key={item.id}
                                    type='button'
                                    onClick={() => { scrollToSection(item.id) }}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                                        isActive
                                            ? 'bg-[#e8f5f1] text-[#0d9468] font-semibold'
                                            : 'text-[#5f736b] hover:bg-[#f0f4f2] hover:text-[#192823]'
                                    }`}
                                >
                                    <span className='shrink-0'>{item.icon}</span>
                                    <span className='truncate'>{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </aside>

                {/* Main Content Area (Only this section scrolls up or down) */}
                <main
                    ref={mainScrollRef}
                    className='flex-1 flex flex-col gap-4 sm:gap-6 max-w-4xl w-full min-w-0 box-border lg:h-full lg:overflow-y-auto lg:py-6 lg:pr-3 pb-24 lg:pb-32 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#cbd5e1] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#94a3b8]'
                >
                    {/* 1. User Header & Health Score Card */}
                    <div id='section-basic' className='bg-white rounded-2xl border border-[#e5ece8] p-4 sm:p-5 shadow-xs flex flex-col gap-4 w-full box-border overflow-hidden scroll-mt-24 shrink-0'>
                        {/* Multiple Profiles Switcher Bar */}
                        <div className='flex flex-col gap-2 pb-3 border-b border-[#edf2ee]'>
                            <div className='flex items-center justify-between'>
                                <span className='text-[11px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5'>
                                    <span>👤</span> Profiles ({allProfiles.length})
                                </span>
                                <button
                                    type='button'
                                    onClick={() => { setIsAddProfileModalOpen(true) }}
                                    className='inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d9468] hover:text-[#0b7a56] py-1 px-2.5 rounded-lg hover:bg-[#e8f5f1] transition-colors border border-dashed border-[#0d9468]/40'
                                >
                                    <PlusOutlined className='text-[10px]'/>
                                    <span>Add Profile</span>
                                </button>
                            </div>

                            {/* Scrollable Profiles Pills */}
                            <div className='flex items-center gap-2 overflow-x-auto py-1 no-scrollbar'>
                                {allProfiles.map((prof) => {
                                    const isActive = prof.id === currentUser?.id
                                    const initials = prof.name ? prof.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'P'
                                    return (
                                        <button
                                            key={prof.id}
                                            type='button'
                                            onClick={() => {
                                                if (!isActive) {
                                                    switchActiveUserId(prof.id)
                                                    void message.success(`Switched to profile: ${prof.name ?? 'User'}`)
                                                }
                                            }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shrink-0 ${
                                                isActive
                                                    ? 'bg-[#e8f5f1] border-[#0d9468] text-[#0d9468] shadow-2xs font-semibold ring-2 ring-[#0d9468]/20'
                                                    : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1] hover:bg-[#f8faf9]'
                                            }`}
                                        >
                                            <span
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                                    isActive ? 'bg-[#0d9468]' : 'bg-[#94a3b8]'
                                                }`}
                                            >
                                                {initials}
                                            </span>
                                            <span className='truncate max-w-[130px] font-semibold'>{prof.name ?? 'Unnamed'}</span>
                                            {isActive && (
                                                <span className='w-2 h-2 rounded-full bg-[#0d9468] shrink-0'/>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className='flex items-start justify-between'>
                            <div>
                                <div className='flex items-center gap-3'>
                                    <h1 className='text-2xl font-bold text-[#192823] tracking-tight leading-tight'>
                                        {currentUser?.name ?? 'Dr. Kishor Anbazhakan'}
                                    </h1>
                                    <button
                                        type='button'
                                        onClick={() => { setIsEditProfileModalOpen(true) }}
                                        className='text-[#5f736b] hover:text-[#192823] p-1.5 rounded-full hover:bg-[#f0f4f2] transition-colors -mt-1'
                                        title='Edit Profile Details'
                                    >
                                        <EditOutlined className='text-base'/>
                                    </button>
                                    <span className='text-[#0d9468] text-lg font-bold -mt-1'>✳️</span>
                                </div>

                                {/* Patient Demographics Chips */}
                                <div className='flex flex-wrap items-center gap-2 mt-3'>
                                    <button
                                        type='button'
                                        onClick={() => { setIsEditProfileModalOpen(true) }}
                                        className='px-3 py-1 rounded-full border border-[#0d9468]/30 bg-[#f0fdf4] text-xs font-semibold text-[#166534] hover:bg-[#dcfce7] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer'
                                        title='Click to edit age'
                                    >
                                        <span>🎂 Age: {userAge} yrs</span>
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => { void handleToggleGender() }}
                                        className='px-3 py-1 rounded-full border border-[#0d9468]/30 bg-[#f0fdf4] text-xs font-semibold text-[#166534] hover:bg-[#dcfce7] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer'
                                        title='Click to toggle gender'
                                    >
                                        <span>{userGender === 'female' ? '♀ Female' : '♂ Male'}</span>
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => { setIsEditProfileModalOpen(true) }}
                                        className='px-3 py-1 rounded-full border border-[#e5ece8] bg-white text-xs font-semibold text-[#192823] hover:bg-[#f8faf9] transition-colors cursor-pointer'
                                        title='Click to edit height'
                                    >
                                        {currentUser?.height ?? '167cm'}
                                    </button>
                                    <div className='basis-full h-0 sm:hidden'/>
                                    <button
                                        type='button'
                                        onClick={() => { setIsEditProfileModalOpen(true) }}
                                        className='px-3 py-1 rounded-full border border-[#e5ece8] bg-white text-xs font-medium text-[#192823] hover:bg-[#f8faf9] transition-colors cursor-pointer'
                                        title='Click to edit blood type'
                                    >
                                        {currentUser?.bloodType ? `🩸 ${currentUser.bloodType}` : '+ Add Blood Type'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Health Score Widget */}
                        <div
                            onClick={() => { setIsScoreDrawerOpen(true) }}
                            className='flex items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-[#edf2ee] bg-[#fbfdfc] hover:bg-[#f4f8f6] cursor-pointer transition-colors w-full min-w-0 box-border overflow-hidden'
                        >
                            <div className='flex items-center gap-3 sm:gap-4 flex-1 min-w-0'>
                                {/* Circular Score 22 with dashed perimeter */}
                                <div className='relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center'>
                                    <svg className='w-full h-full -rotate-90' viewBox='0 0 100 100'>
                                        <circle
                                            cx='50'
                                            cy='50'
                                            r='42'
                                            fill='none'
                                            stroke='#e2e8f0'
                                            strokeWidth='5'
                                            strokeDasharray='4 4'
                                        />
                                        <circle
                                            cx='50'
                                            cy='50'
                                            r='42'
                                            fill='none'
                                            stroke='#4338ca'
                                            strokeWidth='5'
                                            strokeDasharray='264'
                                            strokeDashoffset={264 - (264 * 22) / 100}
                                            strokeLinecap='round'
                                        />
                                    </svg>
                                    <span className='absolute text-lg sm:text-xl font-bold text-[#192823]'>
                                        22
                                    </span>
                                </div>

                                {/* Progress Metrics Table */}
                                <div className='flex flex-col gap-1.5 flex-1 min-w-0'>
                                    {/* Prevention */}
                                    <div className='flex items-center justify-between gap-1.5 sm:gap-2 min-w-0'>
                                        <span className='text-[11px] sm:text-xs font-medium text-[#475569] shrink-0 w-16 sm:w-20'>Prevention</span>
                                        <div className='flex flex-col items-start gap-0.5 flex-1 min-w-0'>
                                            <div className='flex items-center gap-1 w-full'>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#4338ca]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#4338ca]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#e2e8f0]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#e2e8f0]'/>
                                            </div>
                                            <span className='text-[9px] sm:text-[10px] text-[#64748b] leading-tight'>2/4 complete</span>
                                        </div>
                                    </div>

                                    {/* Monitoring */}
                                    <div className='flex items-center justify-between gap-1.5 sm:gap-2 min-w-0'>
                                        <span className='text-[11px] sm:text-xs font-medium text-[#475569] shrink-0 w-16 sm:w-20'>Monitoring</span>
                                        <div className='flex flex-col items-start gap-0.5 flex-1 min-w-0'>
                                            <div className='flex items-center gap-0.5 sm:gap-1 w-full'>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#0d9468]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#d1efe5]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#e2e8f0]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#e2e8f0]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#e2e8f0]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#e2e8f0]'/>
                                            </div>
                                            <span className='text-[9px] sm:text-[10px] text-[#64748b] leading-tight'>1/6 complete</span>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className='flex items-center justify-between gap-1.5 sm:gap-2 min-w-0'>
                                        <span className='text-[11px] sm:text-xs font-medium text-[#475569] shrink-0 w-16 sm:w-20'>Action</span>
                                        <div className='flex flex-col items-start gap-0.5 flex-1 min-w-0'>
                                            <div className='flex items-center gap-1 w-full'>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#f43f5e]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#fce7f3]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#fce7f3]'/>
                                                <span className='h-1.5 flex-1 rounded-full bg-[#fce7f3]'/>
                                            </div>
                                            <span className='text-[9px] sm:text-[10px] text-[#64748b] leading-tight'>0/0 complete</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <RightOutlined className='text-xs sm:text-sm text-[#94a3b8] shrink-0 ml-1'/>
                        </div>

                        {/* Insurance Line */}
                        <div className='flex items-center gap-3 pt-1 text-xs'>
                            <span className='font-bold text-[#64748b] tracking-wider uppercase text-[10px]'>INSURANCE</span>
                            <button
                                type='button'
                                onClick={() => { handleActionClick('Add Insurance') }}
                                className='px-3 py-1 rounded-full border border-[#e5ece8] bg-white text-xs font-semibold text-[#192823] hover:bg-[#f8faf9] transition-colors'
                            >
                                + Add Insurance
                            </button>
                        </div>
                    </div>

                    {/* Mobile-Only View (<1024px) */}
                    <div className='lg:hidden flex flex-col gap-3.5 w-full box-border shrink-0'>
                        {/* Mobile Biomarkers Card */}
                        <div
                            onClick={onNavigateToBiomarkers}
                            className='bg-white rounded-2xl border border-[#e5ece8] p-4 sm:p-5 shadow-xs cursor-pointer hover:border-[#0d9468] transition-colors flex flex-col gap-3.5 w-full box-border overflow-hidden'
                        >
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-xl text-[#0d9468]'>⚗️</span>
                                    <h3 className='text-base font-bold text-[#192823]'>Biomarkers</h3>
                                </div>
                                <div className='px-3 py-1 rounded-full bg-[#d8f3ea] text-[#0d9468] flex items-center justify-center font-bold'>
                                    <RightOutlined className='text-xs'/>
                                </div>
                            </div>

                            <div className='grid grid-cols-2 gap-x-2 sm:gap-x-6 gap-y-3.5 pt-1 w-full min-w-0'>
                                {/* Left column */}
                                <div className='flex flex-col gap-3'>
                                    {/* Heart */}
                                    <div className='flex items-center gap-2.5'>
                                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#be185d' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                                            <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'/>
                                        </svg>
                                        <div className='flex items-center gap-1.5'>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#ef4444]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                        </div>
                                    </div>

                                    {/* Liver with second row dot */}
                                    <div className='flex items-start gap-2.5'>
                                        <span className='text-sm text-[#9333ea] leading-none'>🫁</span>
                                        <div className='flex flex-col gap-1'>
                                            <div className='flex items-center gap-1.5'>
                                                <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                                <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                                <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                                <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                                <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                                <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                            </div>
                                            <div className='flex items-center gap-1.5'>
                                                <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Blood cells */}
                                    <div className='flex items-center gap-2.5'>
                                        <span className='text-sm text-[#b91c1c] leading-none'>🩸</span>
                                        <div className='flex items-center gap-1.5'>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                        </div>
                                    </div>
                                </div>

                                {/* Right column */}
                                <div className='flex flex-col gap-3'>
                                    {/* Brain/Lungs */}
                                    <div className='flex items-center gap-2.5'>
                                        <span className='text-sm text-[#d97706] leading-none'>🧠</span>
                                        <div className='flex items-center gap-1.5'>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#f97316]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                        </div>
                                    </div>

                                    {/* Pancreas */}
                                    <div className='flex items-center gap-2.5'>
                                        <span className='text-sm text-[#e11d48] leading-none'>🧫</span>
                                        <div className='flex items-center gap-1.5'>
                                            <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                        </div>
                                    </div>

                                    {/* Immune/Shield */}
                                    <div className='flex items-center gap-2.5'>
                                        <span className='text-sm text-[#2563eb] leading-none'>🛡️</span>
                                        <div className='flex items-center gap-1.5'>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#10b981]'/>
                                            <span className='w-2 h-2 rounded-full bg-[#e2e8f0]'/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Section Rows */}
                        {[
                            {
                                id: 'meds' as ProfileSectionType,
                                title: 'Meds & Supplements',
                                icon: (
                                    <svg width='20' height='20' viewBox='0 0 24 24' fill='#2563eb' className='shrink-0'>
                                        <rect x='5' y='6' width='14' height='16' rx='3'/>
                                        <path d='M8 2h8v4H8z' fill='#1d4ed8'/>
                                        <path d='M12 10v6m-3-3h6' stroke='white' strokeWidth='2' strokeLinecap='round'/>
                                    </svg>
                                ),
                            },
                            {
                                id: 'conditions' as ProfileSectionType,
                                title: 'Conditions & Injuries',
                                icon: <span className='text-lg'>🩹</span>,
                            },
                            {
                                id: 'allergies' as ProfileSectionType,
                                title: 'Allergies & Intolerances',
                                icon: (
                                    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' className='shrink-0'>
                                        <circle cx='12' cy='12' r='2' fill='#ef4444'/>
                                        <path d='M12 2v4m0 12v4M2 12h4m12 0h4m-3.05-6.95l-2.83 2.83m-8.24 8.24l-2.83 2.83m0-13.9l2.83 2.83m8.24 8.24l2.83 2.83'/>
                                    </svg>
                                ),
                            },
                            {
                                id: 'vaccinations' as ProfileSectionType,
                                title: 'Vaccinations',
                                icon: <span className='text-lg'>💉</span>,
                            },
                            {
                                id: 'events' as ProfileSectionType,
                                title: 'Events',
                                subtitle: '0 upcoming appointments',
                                icon: (
                                    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#7c3aed' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='shrink-0'>
                                        <rect x='3' y='4' width='18' height='18' rx='3'/>
                                        <path d='M16 2v4M8 2v4M3 10h18'/>
                                    </svg>
                                ),
                            },
                            {
                                id: 'genetics' as ProfileSectionType,
                                title: 'Genetics',
                                icon: <span className='text-lg'>🧬</span>,
                            },
                            {
                                id: 'providers' as ProfileSectionType,
                                title: 'Care Providers',
                                icon: (
                                    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#0d9468' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='shrink-0'>
                                        <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/>
                                        <circle cx='9' cy='7' r='4'/>
                                        <path d='M19 8v6m3-3h-6'/>
                                    </svg>
                                ),
                            },
                            {
                                id: 'lifestyle' as ProfileSectionType,
                                title: 'Lifestyle Habits',
                                icon: (
                                    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#3b82f6' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='shrink-0'>
                                        <circle cx='12' cy='5' r='2' fill='#3b82f6'/>
                                        <path d='M12 7v8m0 0l-4 6m4-6l4 6m-8-10h8'/>
                                    </svg>
                                ),
                            },
                        ].map((row) => {
                            const count = profileRecords[row.id]?.length || 0
                            return (
                                <div
                                    key={row.id}
                                    onClick={() => { setActiveModal(row.id) }}
                                    className='bg-white rounded-2xl border border-[#e5ece8] p-3.5 sm:p-4 shadow-xs flex items-center justify-between cursor-pointer hover:bg-[#f8faf9] transition-colors w-full box-border overflow-hidden'
                                >
                                    <div className='flex items-center gap-3.5 min-w-0'>
                                        <div className='w-6 flex items-center justify-center shrink-0'>{row.icon}</div>
                                        <div className='flex flex-col min-w-0'>
                                            <span className='text-sm font-semibold text-[#192823] truncate'>{row.title}</span>
                                            {count > 0 ? (
                                                <span className='text-xs font-semibold text-[#0d9468] truncate'>
                                                    {count} {count === 1 ? 'item' : 'items'} logged • Tap to add more
                                                </span>
                                            ) : row.subtitle ? (
                                                <span className='text-xs text-[#94a3b8] truncate'>{row.subtitle}</span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className='w-8 h-8 rounded-full bg-[#f1f5f9] text-[#475569] flex items-center justify-center hover:bg-[#e2e8f0] transition-colors shrink-0'>
                                        <PlusOutlined className='text-xs stroke-[2]'/>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop View Cards (>=1024px) */}
                    <div className='hidden lg:flex flex-col gap-6 shrink-0'>
                        {/* 2. Biomarkers Summary Card */}
                        <div id='section-biomarkers' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            {/* Header Banner */}
                            <div className='bg-[#e8f5f1] px-6 py-4 flex items-center justify-between border-b border-[#d1efe5]'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-lg'>🧪</span>
                                    <h3 className='text-base font-bold text-[#192823]'>Biomarkers</h3>
                                </div>
                                <span className='text-xs text-[#0d9468] font-semibold bg-white/70 px-2.5 py-1 rounded-full'>
                                    {configs.length} Biomarkers • {records.length} Results
                                </span>
                            </div>

                            {/* Categories Grid with Status Dots */}
                            <div className='grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-[#f0f4f2] border-b border-[#f0f4f2]'>
                                {systemSummaries.map((sys) => {
                                    return (
                                        <div
                                            key={sys.id}
                                            onClick={onNavigateToBiomarkers}
                                            className='p-4 flex flex-col gap-2 hover:bg-[#f8faf9] cursor-pointer transition-colors'
                                        >
                                            <div className='flex items-center gap-1.5'>
                                                <span className='text-sm'>{sys.icon}</span>
                                                <span className='text-xs font-semibold text-[#192823]'>{sys.name}</span>
                                            </div>
                                            <div className='flex flex-wrap items-center gap-1.5 min-h-[16px]'>
                                                {sys.dots.length === 0 ? (
                                                    <span className='text-[11px] text-[#94a3b8] italic'>No tests</span>
                                                ) : (
                                                    sys.dots.map((dot, idx) => (
                                                        <span
                                                            key={`${dot.biomarkerId}-${idx}`}
                                                            title={dot.tooltip}
                                                            className={`w-2 h-2 rounded-full shrink-0 ${dot.colorClass} transition-transform hover:scale-125 cursor-default`}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* "See All >" link cell */}
                                <div
                                    onClick={onNavigateToBiomarkers}
                                    className='p-4 flex items-center justify-center gap-2 hover:bg-[#e8f5f1] cursor-pointer transition-colors text-[#0d9468] font-bold text-sm'
                                >
                                    <span>See All</span>
                                    <RightOutlined className='text-xs'/>
                                </div>
                            </div>

                            {/* Card bottom action */}
                            <div className='p-4 bg-white flex items-center justify-start'>
                                <button
                                    type='button'
                                    onClick={onAddResult ?? onNavigateToBiomarkers}
                                    className='inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                >
                                    <PlusOutlined className='text-xs'/>
                                    <span>Add Result</span>
                                </button>
                            </div>
                        </div>

                        {/* 3. Meds & Supplements Card */}
                        <div id='section-meds' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            <div className='bg-[#eef2ff] px-6 py-4 flex items-center justify-between border-b border-[#e0e7ff]'>
                                <div className='flex items-center gap-2.5'>
                                    <MedicineBoxOutlined className='text-base text-[#4f46e5]'/>
                                    <h3 className='text-base font-bold text-[#192823]'>Meds & Supplements</h3>
                                </div>
                                {profileRecords.meds.length > 0 && (
                                    <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700'>
                                        {profileRecords.meds.length} {profileRecords.meds.length === 1 ? 'Medication' : 'Medications'}
                                    </span>
                                )}
                            </div>
                            <div className='p-6 flex flex-col gap-4'>
                                {profileRecords.meds.length > 0 ? (
                                    <div className='flex flex-col gap-2.5'>
                                        {profileRecords.meds.map((item) => (
                                            <div key={item.id} className='flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white transition-colors'>
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-sm text-[#1e293b]'>{item.title}</span>
                                                        {item.badge && (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold text-white' style={{ backgroundColor: item.badgeColor ?? '#2563eb' }}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && <span className='text-xs text-[#64748b]'>{item.subtitle}</span>}
                                                    {item.details && <span className='text-xs text-[#64748b]'>{item.details}</span>}
                                                    {item.date && <span className='text-[11px] text-[#94a3b8]'>{item.date}</span>}
                                                    {item.notes && <span className='text-xs text-[#475569] italic bg-white p-1.5 rounded-md border border-[#e2e8f0] mt-1'>Notes: {item.notes}</span>}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { handleDeleteRecord('meds', item.id) }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-full hover:bg-[#fee2e2] transition-colors'
                                                    title='Remove'
                                                >
                                                    <DeleteOutlined className='text-sm'/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className='text-xs text-[#5f736b] leading-relaxed'>
                                        No active medications or supplements found. Import your medications by connecting to providers or entering them manually.
                                    </p>
                                )}
                                <div className='flex items-center gap-3'>
                                    <button
                                        type='button'
                                        onClick={() => { handleActionClick('Add Medication') }}
                                        className='px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                    >
                                        + New Med
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 4. Conditions & Injuries Card */}
                        <div id='section-conditions' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            <div className='bg-[#fffbeb] px-6 py-4 flex items-center justify-between border-b border-[#fef3c7]'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-base'>🩹</span>
                                    <h3 className='text-base font-bold text-[#192823]'>Conditions & Injuries</h3>
                                </div>
                                {profileRecords.conditions.length > 0 && (
                                    <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800'>
                                        {profileRecords.conditions.length} {profileRecords.conditions.length === 1 ? 'Condition' : 'Conditions'}
                                    </span>
                                )}
                            </div>
                            <div className='p-6 flex flex-col gap-4'>
                                {profileRecords.conditions.length > 0 ? (
                                    <div className='flex flex-col gap-2.5'>
                                        {profileRecords.conditions.map((item) => (
                                            <div key={item.id} className='flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white transition-colors'>
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-sm text-[#1e293b]'>{item.title}</span>
                                                        {item.badge && (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold text-white' style={{ backgroundColor: item.badgeColor ?? '#a37f4e' }}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.date && <span className='text-[11px] text-[#94a3b8]'>{item.date}</span>}
                                                    {item.notes && <span className='text-xs text-[#475569] italic bg-white p-1.5 rounded-md border border-[#e2e8f0] mt-1'>Notes: {item.notes}</span>}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { handleDeleteRecord('conditions', item.id) }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-full hover:bg-[#fee2e2] transition-colors'
                                                    title='Remove'
                                                >
                                                    <DeleteOutlined className='text-sm'/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className='text-xs text-[#5f736b] leading-relaxed'>
                                        Import your conditions by connecting to providers or entering them.
                                    </p>
                                )}
                                <div className='flex items-center gap-3'>
                                    <button
                                        type='button'
                                        onClick={() => { handleActionClick('Add Condition') }}
                                        className='px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                    >
                                        + Add Condition
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => { handleActionClick('Add Injury') }}
                                        className='px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                    >
                                        + Add Injury
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 5. Allergies & Intolerances Card */}
                        <div id='section-allergies' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            <div className='bg-[#fef2f2] px-6 py-4 flex items-center justify-between border-b border-[#fee2e2]'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-base'>✳️</span>
                                    <h3 className='text-base font-bold text-[#192823]'>Allergies & Intolerances</h3>
                                </div>
                                {profileRecords.allergies.length > 0 && (
                                    <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700'>
                                        {profileRecords.allergies.length} {profileRecords.allergies.length === 1 ? 'Allergy' : 'Allergies'}
                                    </span>
                                )}
                            </div>
                            <div className='p-6 flex flex-col gap-4'>
                                {profileRecords.allergies.length > 0 ? (
                                    <div className='flex flex-col gap-2.5'>
                                        {profileRecords.allergies.map((item) => (
                                            <div key={item.id} className='flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white transition-colors'>
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-sm text-[#1e293b]'>{item.title}</span>
                                                        {item.badge && (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold text-white' style={{ backgroundColor: item.badgeColor ?? '#c25953' }}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && <span className='text-xs text-[#64748b]'>{item.subtitle}</span>}
                                                    {item.details && <span className='text-xs text-[#64748b]'>{item.details}</span>}
                                                    {item.notes && <span className='text-xs text-[#475569] italic bg-white p-1.5 rounded-md border border-[#e2e8f0] mt-1'>Notes: {item.notes}</span>}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { handleDeleteRecord('allergies', item.id) }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-full hover:bg-[#fee2e2] transition-colors'
                                                    title='Remove'
                                                >
                                                    <DeleteOutlined className='text-sm'/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className='text-xs text-[#5f736b] leading-relaxed'>
                                        Import your allergies by uploading test results or entering them.
                                    </p>
                                )}
                                <div className='flex items-center gap-3'>
                                    <button
                                        type='button'
                                        onClick={() => { handleActionClick('Add Allergy') }}
                                        className='px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                    >
                                        + Add Allergy
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 6. Vaccinations Card */}
                        <div id='section-vaccinations' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            <div className='bg-[#fffbeb] px-6 py-4 flex items-center justify-between border-b border-[#fef3c7]'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-base'>💉</span>
                                    <h3 className='text-base font-bold text-[#192823]'>Vaccinations</h3>
                                </div>
                                {profileRecords.vaccinations.length > 0 && (
                                    <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800'>
                                        {profileRecords.vaccinations.length} {profileRecords.vaccinations.length === 1 ? 'Vaccination' : 'Vaccinations'}
                                    </span>
                                )}
                            </div>
                            <div className='p-6 flex flex-col gap-4'>
                                {profileRecords.vaccinations.length > 0 ? (
                                    <div className='flex flex-col gap-2.5'>
                                        {profileRecords.vaccinations.map((item) => (
                                            <div key={item.id} className='flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white transition-colors'>
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-sm text-[#1e293b]'>{item.title}</span>
                                                        {item.badge && (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold text-white' style={{ backgroundColor: item.badgeColor ?? '#cca023' }}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && <span className='text-xs text-[#64748b]'>{item.subtitle}</span>}
                                                    {item.date && <span className='text-[11px] text-[#94a3b8]'>{item.date}</span>}
                                                    {item.notes && <span className='text-xs text-[#475569] italic bg-white p-1.5 rounded-md border border-[#e2e8f0] mt-1'>Notes: {item.notes}</span>}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { handleDeleteRecord('vaccinations', item.id) }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-full hover:bg-[#fee2e2] transition-colors'
                                                    title='Remove'
                                                >
                                                    <DeleteOutlined className='text-sm'/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                <button
                                    type='button'
                                    onClick={() => { handleActionClick('Add Vaccination') }}
                                    className='w-fit px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                >
                                    + Add Vaccination
                                </button>
                            </div>
                        </div>

                        {/* 7. Events & Appointments Card */}
                        <div id='section-events' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            <div className='bg-[#f5f3ff] px-6 py-4 flex items-center justify-between border-b border-[#ede9fe]'>
                                <div className='flex items-center gap-2.5'>
                                    <CalendarOutlined className='text-base text-[#7c3aed]'/>
                                    <h3 className='text-base font-bold text-[#192823]'>Events</h3>
                                </div>
                                {profileRecords.events.length > 0 && (
                                    <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700'>
                                        {profileRecords.events.length} {profileRecords.events.length === 1 ? 'Event' : 'Events'}
                                    </span>
                                )}
                            </div>
                            <div className='p-6 flex flex-col gap-5'>
                                {profileRecords.events.length > 0 ? (
                                    <div className='flex flex-col gap-2.5'>
                                        {profileRecords.events.map((item) => (
                                            <div key={item.id} className='flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white transition-colors'>
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-sm text-[#1e293b]'>{item.title}</span>
                                                        {item.badge && (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold text-white' style={{ backgroundColor: item.badgeColor ?? '#7c3aed' }}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && <span className='text-xs text-[#64748b]'>{item.subtitle}</span>}
                                                    {item.date && <span className='text-[11px] text-[#94a3b8]'>{item.date}</span>}
                                                    {item.notes && <span className='text-xs text-[#475569] italic bg-white p-1.5 rounded-md border border-[#e2e8f0] mt-1'>Notes: {item.notes}</span>}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { handleDeleteRecord('events', item.id) }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-full hover:bg-[#fee2e2] transition-colors'
                                                    title='Remove'
                                                >
                                                    <DeleteOutlined className='text-sm'/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className='border border-dashed border-[#e5ece8] rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2'>
                                        <CalendarOutlined className='text-2xl text-[#94a3b8]'/>
                                        <span className='text-xs font-semibold text-[#5f736b]'>No upcoming appointments</span>
                                        <button
                                            type='button'
                                            onClick={() => { handleActionClick('New Appointment') }}
                                            className='mt-1 px-3 py-1 rounded-full border border-[#e5ece8] text-xs font-bold text-[#192823] hover:bg-[#f0f4f2]'
                                        >
                                            + New
                                        </button>
                                    </div>
                                )}
                                <div className='flex items-center gap-3'>
                                    <button
                                        type='button'
                                        onClick={() => { handleActionClick('Add Appointment') }}
                                        className='px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                    >
                                        + Add Appointment
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => { handleActionClick('Add Event') }}
                                        className='px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                    >
                                        + Add Event
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 8. Genetics Card */}
                        <div id='section-genetics' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            <div className='bg-[#f0fdf4] px-6 py-4 flex items-center justify-between border-b border-[#dcfce7]'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-base'>🧬</span>
                                    <h3 className='text-base font-bold text-[#192823]'>Genetics</h3>
                                </div>
                                {profileRecords.genetics.length > 0 && (
                                    <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800'>
                                        {profileRecords.genetics.length} {profileRecords.genetics.length === 1 ? 'Record' : 'Records'}
                                    </span>
                                )}
                            </div>
                            <div className='p-6 flex flex-col gap-4'>
                                {profileRecords.genetics.length > 0 ? (
                                    <div className='flex flex-col gap-2.5'>
                                        {profileRecords.genetics.map((item) => (
                                            <div key={item.id} className='flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white transition-colors'>
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-sm text-[#1e293b]'>{item.title}</span>
                                                        {item.badge && (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold text-white' style={{ backgroundColor: item.badgeColor ?? '#00875a' }}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && <span className='text-xs text-[#64748b]'>{item.subtitle}</span>}
                                                    {item.notes && <span className='text-xs text-[#475569] italic bg-white p-1.5 rounded-md border border-[#e2e8f0] mt-1'>Notes: {item.notes}</span>}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { handleDeleteRecord('genetics', item.id) }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-full hover:bg-[#fee2e2] transition-colors'
                                                    title='Remove'
                                                >
                                                    <DeleteOutlined className='text-sm'/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className='text-xs text-[#5f736b] leading-relaxed'>
                                        No family history reported
                                    </p>
                                )}
                                <button
                                    type='button'
                                    onClick={() => { handleActionClick('Add Family History') }}
                                    className='w-fit px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                >
                                    + Add Family History
                                </button>
                            </div>
                        </div>

                        {/* 9. Care Providers Card */}
                        <div id='section-providers' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            <div className='bg-[#ecfeff] px-6 py-4 flex items-center justify-between border-b border-[#cffafe]'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-base'>🧑‍⚕️</span>
                                    <h3 className='text-base font-bold text-[#192823]'>Care Providers</h3>
                                </div>
                                {profileRecords.providers.length > 0 && (
                                    <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800'>
                                        {profileRecords.providers.length} {profileRecords.providers.length === 1 ? 'Provider' : 'Providers'}
                                    </span>
                                )}
                            </div>
                            <div className='p-6 flex flex-col gap-4'>
                                {profileRecords.providers.length > 0 ? (
                                    <div className='flex flex-col gap-2.5'>
                                        {profileRecords.providers.map((item) => (
                                            <div key={item.id} className='flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white transition-colors'>
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-sm text-[#1e293b]'>{item.title}</span>
                                                        {item.badge && (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold text-white' style={{ backgroundColor: item.badgeColor ?? '#12828b' }}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && <span className='text-xs text-[#64748b]'>{item.subtitle}</span>}
                                                    {item.details && <span className='text-xs text-[#64748b]'>{item.details}</span>}
                                                    {item.notes && <span className='text-xs text-[#475569] italic bg-white p-1.5 rounded-md border border-[#e2e8f0] mt-1'>Notes: {item.notes}</span>}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { handleDeleteRecord('providers', item.id) }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-full hover:bg-[#fee2e2] transition-colors'
                                                    title='Remove'
                                                >
                                                    <DeleteOutlined className='text-sm'/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className='text-xs text-[#5f736b] leading-relaxed'>
                                        Import providers by connecting your patient portals or entering them manually.
                                    </p>
                                )}
                                <button
                                    type='button'
                                    onClick={() => { handleActionClick('Add Provider') }}
                                    className='w-fit px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                >
                                    + Add Provider
                                </button>
                            </div>
                        </div>

                        {/* 10. Lifestyle Card */}
                        <div id='section-lifestyle' className='bg-white rounded-2xl border border-[#e5ece8] overflow-hidden shadow-sm flex flex-col scroll-mt-24'>
                            <div className='bg-[#eff6ff] px-6 py-4 flex items-center justify-between border-b border-[#dbeafe]'>
                                <div className='flex items-center gap-2.5'>
                                    <span className='text-base'>🧘</span>
                                    <h3 className='text-base font-bold text-[#192823]'>Lifestyle</h3>
                                </div>
                                {profileRecords.lifestyle.length > 0 && (
                                    <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700'>
                                        {profileRecords.lifestyle.length} {profileRecords.lifestyle.length === 1 ? 'Habit' : 'Habits'}
                                    </span>
                                )}
                            </div>
                            <div className='p-6 flex flex-col gap-4'>
                                {profileRecords.lifestyle.length > 0 ? (
                                    <div className='flex flex-col gap-2.5'>
                                        {profileRecords.lifestyle.map((item) => (
                                            <div key={item.id} className='flex items-center justify-between p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-white transition-colors'>
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-sm text-[#1e293b]'>{item.title}</span>
                                                        {item.badge && (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold text-white' style={{ backgroundColor: item.badgeColor ?? '#6b7ec4' }}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && <span className='text-xs text-[#64748b]'>{item.subtitle}</span>}
                                                    {item.date && <span className='text-[11px] text-[#94a3b8]'>{item.date}</span>}
                                                    {item.notes && <span className='text-xs text-[#475569] italic bg-white p-1.5 rounded-md border border-[#e2e8f0] mt-1'>Notes: {item.notes}</span>}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => { handleDeleteRecord('lifestyle', item.id) }}
                                                    className='text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-full hover:bg-[#fee2e2] transition-colors'
                                                    title='Remove'
                                                >
                                                    <DeleteOutlined className='text-sm'/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className='text-xs text-[#5f736b] leading-relaxed'>
                                        No current lifestyle habits
                                    </p>
                                )}
                                <button
                                    type='button'
                                    onClick={() => { handleActionClick('Add Lifestyle Habit') }}
                                    className='w-fit px-4 py-2 rounded-full bg-[#f0f4f2] hover:bg-[#e5ece8] text-xs font-bold text-[#192823] transition-colors'
                                >
                                    + Add Lifestyle Habit
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer matching mobile screenshot */}
                    <div className='py-8 px-4 flex flex-col items-center gap-3.5 text-xs text-[#5f736b] text-center w-full box-border overflow-hidden shrink-0'>
                        <span>Give friends a free Emergency Card?</span>
                        <button
                            type='button'
                            onClick={() => { handleActionClick('Refer a friend') }}
                            className='px-4 py-1.5 rounded-full border border-[#e5ece8] bg-white font-semibold text-[#192823] hover:bg-[#f0f4f2] transition-colors shadow-2xs'
                        >
                            Refer a friend
                        </button>

                        <button
                            type='button'
                            onClick={() => { handleActionClick('What\'s new') }}
                            className='relative px-4 py-1.5 rounded-full border border-[#e5ece8] bg-white font-semibold text-[#192823] hover:bg-[#f0f4f2] transition-colors shadow-2xs'
                        >
                            What's New?
                            <span className='absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#2563eb]'/>
                        </button>

                        <span className='text-[11px] text-[#94a3b8] mt-2'>Guava Health, Inc.</span>
                        <div className='flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-[#94a3b8]'>
                            <button type='button' onClick={() => { handleActionClick('Home') }} className='hover:underline'>home</button>
                            <span>•</span>
                            <button type='button' onClick={() => { handleActionClick('Health Resources') }} className='hover:underline'>health resources</button>
                            <span>•</span>
                            <button type='button' onClick={() => { handleActionClick('Privacy') }} className='hover:underline'>privacy</button>
                            <span>•</span>
                            <button type='button' onClick={() => { handleActionClick('Terms') }} className='hover:underline'>terms of service</button>
                            <span>•</span>
                            <button type='button' onClick={() => { handleActionClick('Careers') }} className='hover:underline'>careers</button>
                        </div>

                        <button
                            type='button'
                            onClick={() => { handleActionClick('Help & Feedback') }}
                            className='mt-1 px-4 py-1.5 rounded-full border border-[#e5ece8] bg-white text-xs font-semibold text-[#5f736b] hover:bg-[#f0f4f2] transition-colors flex items-center gap-1.5 shadow-2xs'
                        >
                            <span>💬</span>
                            <span>Help & Feedback</span>
                        </button>
                    </div>
                </main>
            </div>

            {/* Health Scores Detail Drawer */}
            <HealthScoresDrawer
                open={isScoreDrawerOpen}
                onClose={() => { setIsScoreDrawerOpen(false) }}
                score={22}
            />

            {/* Profile Creation Modal (Desktop Pop-up & Mobile Full-Page) */}
            <GuavaProfileModal
                section={activeModal}
                onClose={() => { setActiveModal(null) }}
                onAdd={handleAddRecord}
            />

            {/* Edit Profile Details Modal */}
            <EditProfileModal
                isOpen={isEditProfileModalOpen}
                onClose={() => { setIsEditProfileModalOpen(false) }}
                user={currentUser ?? null}
                canDelete={allProfiles.length > 1}
                onSave={handleSaveProfile}
                onDelete={handleDeleteCurrentProfile}
            />

            {/* Add New Profile Modal */}
            <AddProfileModal
                isOpen={isAddProfileModalOpen}
                onClose={() => { setIsAddProfileModalOpen(false) }}
                onCreate={handleCreateProfile}
            />
        </div>
    )
}
