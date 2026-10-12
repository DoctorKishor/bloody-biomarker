import { useState } from 'react'

import { Modal } from 'antd'

import { GuavaHeader, GuavaNavTab } from '@/components/GuavaHeader'
import { GuavaMobileBottomNav } from '@/components/GuavaMobileBottomNav'
import { GuavaPlaceholderTab } from '@/components/GuavaPlaceholderTab/GuavaPlaceholderTab'
import { UploadArea } from '@/components/UploadArea'
import { GuavaBiomarkersPage } from '@/pages/GuavaBiomarkersPage'
import { GuavaProfilePage } from '@/pages/GuavaProfilePage'
import { GuavaRecordsPage } from '@/pages/GuavaRecordsPage'
import { GuavaSourcesPage } from '@/pages/GuavaSourcesPage'

export const GuavaApp = () => {
    const [activeTab, setActiveTab] = useState<GuavaNavTab>('profile')
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

    return (
        <div className={`min-h-screen ${activeTab === 'profile' ? 'lg:h-screen lg:overflow-hidden' : ''} bg-[#f8faf9] flex flex-col pb-32 lg:pb-0 w-full overflow-x-hidden`}>
            {/* Desktop Top Navigation Bar */}
            <GuavaHeader
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onAddResult={() => { setIsUploadModalOpen(true) }}
            />

            {/* Active Tab Content */}
            <div className={`flex-1 ${activeTab === 'profile' ? 'lg:h-[calc(100vh-4rem)] lg:overflow-hidden' : ''}`}>
                {activeTab === 'profile' && (
                    <GuavaProfilePage
                        onNavigateToBiomarkers={() => { setActiveTab('biomarkers') }}
                        onAddResult={() => { setIsUploadModalOpen(true) }}
                    />
                )}

                {activeTab === 'biomarkers' && (
                    <GuavaBiomarkersPage
                        onBack={() => { setActiveTab('profile') }}
                        onAddResult={() => { setIsUploadModalOpen(true) }}
                    />
                )}

                {activeTab === 'home' && (
                    <GuavaPlaceholderTab
                        tabName='home'
                        title='Health Home Dashboard'
                        description='Overview of your daily vitals, upcoming health events, and recommended screenings.'
                        actionLabel='Go to Profile'
                        onAction={() => { setActiveTab('profile') }}
                    />
                )}

                {activeTab === 'insights' && (
                    <GuavaPlaceholderTab
                        tabName='insights'
                        title='Health Insights & Correlation'
                        description='AI-powered trend correlation between diet, biomarker changes, and lifestyle factors.'
                        actionLabel='View Biomarkers'
                        onAction={() => { setActiveTab('biomarkers') }}
                    />
                )}

                {activeTab === 'records' && (
                    <GuavaRecordsPage
                        onAddResult={() => { setIsUploadModalOpen(true) }}
                        onNavigateToBiomarkers={() => { setActiveTab('biomarkers') }}
                        onNavigateToSources={() => { setActiveTab('sources') }}
                    />
                )}

                {activeTab === 'sources' && (
                    <GuavaSourcesPage
                        onAddResult={() => { setIsUploadModalOpen(true) }}
                    />
                )}
            </div>

            {/* Floating Spark AI / Action Button (Desktop only) */}
            <button
                type='button'
                onClick={() => { setIsUploadModalOpen(true) }}
                className='hidden lg:flex fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 z-30'
                title='Upload Lab Report / AI Assistant'
            >
                <span className='text-xl'>✨</span>
            </button>

            {/* Mobile Bottom Navigation Bar (<1024px) */}
            <GuavaMobileBottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onAddClick={() => { setIsUploadModalOpen(true) }}
            />

            {/* Upload PDF Modal */}
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
        </div>
    )
}
