import { useState } from 'react'

import {
    DownOutlined,
    KeyOutlined,
    UploadOutlined,
    UserOutlined,
} from '@ant-design/icons'
import { Dropdown, Modal, message, MenuProps } from 'antd'

import { ApiKeyInput } from '@/components/ApiKeyInput'
import { ImportButton } from '@/components/ImportButton'
import { useBiomarkerConfigs } from '@/db/models/biomarkerConfig'
import { useBiomarkerRecords } from '@/db/models/biomarkerRecord'
import { useDocuments } from '@/db/models/document'
import { useCurrentUser } from '@/db/models/user'
import { exportData } from '@/utils/exportData'

import { GuavaHeaderProps, GuavaNavTab } from './GuavaHeader.types'

export const GuavaLogo = ({ size = 28 }: { size?: number }) => (
    <svg width={size} height={size} viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <circle cx='16' cy='16' r='14' stroke='#0d9468' strokeWidth='3.2'/>
        <circle cx='11' cy='11' r='3.2' fill='#0d9468'/>
    </svg>
)

export const GuavaHeader = (props: GuavaHeaderProps) => {
    const { className, activeTab, onTabChange } = props
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false)
    const user = useCurrentUser()
    const { data: configs } = useBiomarkerConfigs({ filter: (c) => c.approved })
    const { data: records } = useBiomarkerRecords({ filter: (r) => r.approved })
    const { data: documents } = useDocuments({ filter: (d) => d.approved })

    const trimmedName = user?.name?.trim()
    const userName = trimmedName && trimmedName.length > 0 ? trimmedName : 'Dr. Kishor'
    const navTabs: Array<{ key: GuavaNavTab, label: string }> = [
        {
            key: 'home',
            label: 'Home',
        },
        {
            key: 'insights',
            label: 'Insights',
        },
        {
            key: 'profile',
            label: 'Profile',
        },
        {
            key: 'biomarkers',
            label: 'Biomarkers',
        },
        {
            key: 'records',
            label: 'Records',
        },
        {
            key: 'sources',
            label: 'Sources',
        },
    ]

    const handleShareProfile = () => {
        if (navigator.clipboard) {
            void navigator.clipboard.writeText(window.location.href)
            void message.success('Profile link copied to clipboard!')
        }
    }

    const handleExport = () => {
        void exportData({
            configs,
            records,
            documents,
        })
    }

    const menuItems: MenuProps['items'] = [
        {
            key: 'ai-config',
            label: 'AI & API Settings',
            icon: <KeyOutlined/>,
            onClick: () => { setIsAiSettingsOpen(true) },
        },
        {
            key: 'export-db',
            label: 'Export Health Data',
            icon: <UploadOutlined/>,
            onClick: handleExport,
        },
        {
            type: 'divider',
        },
        {
            key: 'more-tools',
            label: (
                <div className='flex items-center justify-between'>
                    <span>Database & Backup Tools</span>
                    <ImportButton/>
                </div>
            ),
        },
    ]

    const currentTitle = navTabs.find((t) => t.key === activeTab)?.label ?? 'Profile'

    return (
        <>
            <header className={`bg-white ${activeTab === 'biomarkers' || activeTab === 'sources' || activeTab === 'records' ? 'hidden lg:block' : 'border-b border-[#e5ece8]'} sticky top-0 z-40 select-none ${className ?? ''}`}>
                {/* Mobile Top App Bar (<1024px) */}
                {activeTab !== 'biomarkers' && activeTab !== 'sources' && activeTab !== 'records' && (
                    <div className='lg:hidden px-4 h-14 flex items-center justify-between w-full box-border'>
                        <button
                            type='button'
                            onClick={() => { onTabChange('profile') }}
                            className='flex items-center gap-2 focus:outline-none'
                        >
                            <GuavaLogo size={24}/>
                        </button>

                        <h1 className='text-base font-bold text-[#192823]'>
                            {currentTitle}
                        </h1>

                        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement='bottomRight'>
                            <button
                                type='button'
                                className='flex items-center gap-1.5 py-1 px-2.5 rounded-full border border-[#e5ece8] bg-white text-xs font-semibold text-[#5f736b] hover:bg-[#f8faf9]'
                            >
                                <span className='w-5 h-5 rounded-full bg-[#5f736b] text-white flex items-center justify-center text-[10px]'>
                                    <UserOutlined/>
                                </span>
                                <span>DA</span>
                            </button>
                        </Dropdown>
                    </div>
                )}

                {/* Desktop Top Bar (>=1024px) */}
                <div className='hidden lg:flex max-w-[1400px] mx-auto px-6 h-16 items-center justify-between'>
                    {/* Brand & Left Navigation */}
                    <div className='flex items-center gap-8'>
                        <button
                            type='button'
                            onClick={() => { onTabChange('profile') }}
                            className='flex items-center gap-2.5 focus:outline-none transition-transform hover:opacity-90'
                        >
                            <GuavaLogo size={26}/>
                            <span className='text-[22px] font-bold text-[#192823] tracking-tight'>Guava</span>
                        </button>

                        <nav className='flex items-center gap-1 sm:gap-4 md:gap-6'>
                            {navTabs.map((tab) => {
                                const isActive = activeTab === tab.key
                                return (
                                    <button
                                        key={tab.key}
                                        type='button'
                                        onClick={() => { onTabChange(tab.key) }}
                                        className={`relative py-5 px-1.5 text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'text-[#0d9468] font-semibold'
                                                : 'text-[#5f736b] hover:text-[#192823]'
                                        }`}
                                    >
                                        {tab.label}
                                        {isActive && (
                                            <span className='absolute bottom-0 left-0 right-0 h-[3px] bg-[#0d9468] rounded-t-full'/>
                                        )}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    {/* Right side actions */}
                    <div className='flex items-center gap-4'>
                        <button
                            type='button'
                            onClick={handleShareProfile}
                            className='hidden md:inline-flex items-center text-sm font-medium text-[#5f736b] hover:text-[#192823] px-3 py-1.5 rounded-full hover:bg-[#f0f4f2] transition-colors'
                        >
                            Share Profile
                        </button>

                        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement='bottomRight'>
                            <button
                                type='button'
                                className='flex items-center gap-2 py-1 px-2.5 rounded-full hover:bg-[#f0f4f2] transition-colors focus:outline-none'
                            >
                                <span className='text-sm font-medium text-[#192823]'>{userName}</span>
                                <DownOutlined className='text-[10px] text-[#5f736b]'/>
                            </button>
                        </Dropdown>
                    </div>
                </div>
            </header>

            <Modal
                title='AI Provider & API Configuration'
                open={isAiSettingsOpen}
                onCancel={() => { setIsAiSettingsOpen(false) }}
                footer={null}
                destroyOnClose
            >
                <ApiKeyInput onSaved={() => { setIsAiSettingsOpen(false) }}/>
            </Modal>
        </>
    )
}
