import { useState } from 'react'

import {
    ArrowLeftOutlined,
    QuestionCircleOutlined,
    SettingOutlined,
    RightOutlined,
    CheckCircleFilled,
    CloseCircleFilled,
    InfoCircleOutlined,
} from '@ant-design/icons'
import { Drawer, message } from 'antd'

import { HealthScoresDrawerProps } from './HealthScoresDrawer.types'

export const HealthScoresDrawer = (props: HealthScoresDrawerProps) => {
    const { open, onClose, score = 22 } = props
    const [bannerDismissed, setBannerDismissed] = useState(false)

    const preventionItems = [
        {
            title: 'Medical checkup • last 2 years',
            completed: false,
        },
        {
            title: 'Hepatitis C test • once',
            completed: false,
        },
        {
            title: 'Cholesterol test • last 4 years',
            completed: true,
            color: '#6366f1',
        },
        {
            title: 'Glucose test • last 3 years',
            completed: true,
            color: '#6366f1',
        },
    ]

    const monitoringItems = [
        {
            title: 'Blood pressure • last 30 days',
            completed: false,
        },
        {
            title: 'Weight • last 30 days',
            completed: true,
            color: '#0d9468',
        },
        {
            title: 'Resting heart rate • last 3 days',
            completed: false,
        },
        {
            title: 'Sleep • last 3 days',
            completed: false,
        },
        {
            title: 'Steps • last 3 days',
            completed: false,
        },
        {
            title: 'Glucose • last 24 hours',
            completed: false,
            noStatus: true,
        },
        {
            title: 'Home radon • last 2 years',
            completed: false,
        },
    ]

    const actionItems = [
        {
            title: 'Sleep 7+ hours daily • last 7 days',
        },
        {
            title: 'Take 8,000 steps daily • last 7 days',
        },
        {
            title: 'Minimize processed meat',
        },
        {
            title: 'Keep home radon below 2',
        },
    ]

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={480}
            closable={false}
            styles={{
                body: {
                    padding: 0,
                    backgroundColor: '#ffffff',
                },
            }}
        >
            <div className='flex flex-col h-full overflow-y-auto select-none'>
                {/* Header */}
                <div className='sticky top-0 z-10 bg-white border-b border-[#e5ece8] px-5 py-4 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <button
                            type='button'
                            onClick={onClose}
                            className='p-1.5 rounded-full hover:bg-[#f0f4f2] text-[#192823] transition-colors focus:outline-none'
                        >
                            <ArrowLeftOutlined className='text-base'/>
                        </button>
                        <h2 className='text-lg font-bold text-[#192823]'>Health Scores</h2>
                    </div>
                    <div className='flex items-center gap-2 text-[#5f736b]'>
                        <button
                            type='button'
                            onClick={() => { void message.info('Health score is personalized based on preventive screening guidelines.') }}
                            className='p-1.5 rounded-full hover:bg-[#f0f4f2] transition-colors'
                        >
                            <QuestionCircleOutlined className='text-base'/>
                        </button>
                        <button
                            type='button'
                            onClick={() => { void message.info('Health score reminder settings') }}
                            className='p-1.5 rounded-full hover:bg-[#f0f4f2] transition-colors'
                        >
                            <SettingOutlined className='text-base'/>
                        </button>
                    </div>
                </div>

                <div className='p-6 flex flex-col gap-6'>
                    {/* Reminder banner */}
                    {!bannerDismissed && (
                        <div className='bg-[#f4f7f6] rounded-2xl p-4 border border-[#e5ece8] flex flex-col gap-3'>
                            <div>
                                <h4 className='text-sm font-bold text-[#192823]'>Get reminders for preventive care</h4>
                                <p className='text-xs text-[#5f736b] mt-0.5'>
                                    We'll notify you when items are coming up or overdue.
                                </p>
                            </div>
                            <div className='flex items-center justify-between mt-1'>
                                <button
                                    type='button'
                                    onClick={() => { setBannerDismissed(true) }}
                                    className='text-xs font-medium text-[#5f736b] hover:text-[#192823]'
                                >
                                    Not now
                                </button>
                                <button
                                    type='button'
                                    onClick={() => {
                                        void message.success('Reminders enabled!')
                                        setBannerDismissed(true)
                                    }}
                                    className='px-4 py-1.5 text-xs font-semibold text-white bg-[#0d9468] hover:bg-[#0b7e58] rounded-full transition-colors'
                                >
                                    Enable reminders
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Circular Score Dial */}
                    <div className='flex items-center gap-6 py-2'>
                        <div className='relative w-24 h-24 flex items-center justify-center shrink-0'>
                            <svg className='w-full h-full -rotate-90' viewBox='0 0 100 100'>
                                <circle
                                    cx='50'
                                    cy='50'
                                    r='40'
                                    fill='none'
                                    stroke='#e5ece8'
                                    strokeWidth='7'
                                    strokeDasharray='4 4'
                                />
                                <circle
                                    cx='50'
                                    cy='50'
                                    r='40'
                                    fill='none'
                                    stroke='#0d9468'
                                    strokeWidth='7'
                                    strokeDasharray='251'
                                    strokeDashoffset={251 - (251 * score) / 100}
                                    strokeLinecap='round'
                                />
                            </svg>
                            <span className='absolute text-3xl font-bold text-[#192823] tracking-tight'>
                                {score}
                            </span>
                        </div>
                        <div>
                            <h3 className='text-xl font-bold text-[#192823]'>Preventive Health Score</h3>
                            <p className='text-xs font-medium text-[#5f736b]'>by Guava</p>
                        </div>
                    </div>

                    {/* Section 1: Prevention */}
                    <div className='flex flex-col gap-2.5'>
                        <div className='flex items-center justify-between'>
                            <span className='text-sm font-semibold text-[#192823]'>Prevention</span>
                            <div className='flex gap-1 w-48'>
                                <div className='h-1.5 flex-1 rounded-full bg-[#6366f1]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#6366f1]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#6366f1]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#6366f1]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                            </div>
                        </div>
                        <div className='border border-[#e5ece8] rounded-xl divide-y divide-[#f0f4f2] overflow-hidden'>
                            {preventionItems.map((item, idx) => (
                                <div key={idx} className='p-3.5 flex items-center justify-between hover:bg-[#f8faf9] cursor-pointer transition-colors'>
                                    <span className='text-xs font-medium text-[#192823]'>{item.title}</span>
                                    <div className='flex items-center gap-2'>
                                        {item.completed ? (
                                            <CheckCircleFilled style={{ color: item.color ?? '#6366f1' }} className='text-sm'/>
                                        ) : (
                                            <CloseCircleFilled className='text-sm text-[#cbd5e1]'/>
                                        )}
                                        <RightOutlined className='text-[10px] text-[#94a3b8]'/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 2: Monitoring */}
                    <div className='flex flex-col gap-2.5'>
                        <div className='flex items-center justify-between'>
                            <span className='text-sm font-semibold text-[#192823]'>Monitoring</span>
                            <div className='flex gap-1 w-48'>
                                <div className='h-1.5 flex-1 rounded-full bg-[#0d9468]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#0d9468]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                            </div>
                        </div>
                        <div className='border border-[#e5ece8] rounded-xl divide-y divide-[#f0f4f2] overflow-hidden'>
                            {monitoringItems.map((item, idx) => (
                                <div key={idx} className='p-3.5 flex items-center justify-between hover:bg-[#f8faf9] cursor-pointer transition-colors'>
                                    <span className='text-xs font-medium text-[#192823]'>{item.title}</span>
                                    <div className='flex items-center gap-2'>
                                        {item.noStatus ? null : item.completed ? (
                                            <CheckCircleFilled style={{ color: item.color ?? '#0d9468' }} className='text-sm'/>
                                        ) : (
                                            <CloseCircleFilled className='text-sm text-[#cbd5e1]'/>
                                        )}
                                        <RightOutlined className='text-[10px] text-[#94a3b8]'/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 3: Action */}
                    <div className='flex flex-col gap-2.5'>
                        <div className='flex items-center justify-between'>
                            <span className='text-sm font-semibold text-[#192823]'>Action</span>
                            <div className='flex gap-1 w-48'>
                                <div className='h-1.5 flex-1 rounded-full bg-[#ec4899]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                                <div className='h-1.5 flex-1 rounded-full bg-[#e5ece8]'/>
                            </div>
                        </div>
                        <div className='border border-[#e5ece8] rounded-xl divide-y divide-[#f0f4f2] overflow-hidden'>
                            {actionItems.map((item, idx) => (
                                <div key={idx} className='p-3.5 flex items-center justify-between hover:bg-[#f8faf9] cursor-pointer transition-colors'>
                                    <span className='text-xs font-medium text-[#192823]'>{item.title}</span>
                                    <RightOutlined className='text-[10px] text-[#94a3b8]'/>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Explanatory Footnotes */}
                    <div className='flex flex-col gap-2 pt-2 border-t border-[#e5ece8] text-[11px] text-[#5f736b]'>
                        <div className='flex items-start gap-2'>
                            <InfoCircleOutlined className='mt-0.5 text-[#94a3b8]'/>
                            <span>Click on a score factor above to see details</span>
                        </div>
                        <div className='flex items-start gap-2'>
                            <InfoCircleOutlined className='mt-0.5 text-[#94a3b8]'/>
                            <span>Factors are personalized by age and sex</span>
                        </div>
                        <div className='flex items-start gap-2'>
                            <InfoCircleOutlined className='mt-0.5 text-[#94a3b8]'/>
                            <span>The score is mainly preventive, it is not a complete picture of your health</span>
                        </div>
                        <div className='flex items-start gap-2'>
                            <InfoCircleOutlined className='mt-0.5 text-[#94a3b8]'/>
                            <span>New factors and personal insights will be added over time</span>
                        </div>
                    </div>
                </div>
            </div>
        </Drawer>
    )
}
