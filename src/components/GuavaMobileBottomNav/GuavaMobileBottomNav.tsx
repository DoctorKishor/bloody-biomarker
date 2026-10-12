import {
    HomeOutlined,
    LineChartOutlined,
    PlusOutlined,
    MenuOutlined,
    UserOutlined,
    AudioOutlined,
} from '@ant-design/icons'

import { GuavaMobileBottomNavProps } from './GuavaMobileBottomNav.types'

export const GuavaMobileBottomNav = (props: GuavaMobileBottomNavProps) => {
    const { className, activeTab, onTabChange, onAddClick, onAskAiClick } = props

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden select-none pointer-events-none ${className ?? ''}`}>
            {/* 1. Floating AI Assistant Pill */}
            <div className='max-w-md mx-auto px-4 pb-2 pointer-events-auto w-full box-border'>
                <div
                    onClick={onAskAiClick ?? onAddClick}
                    className='bg-white rounded-full border border-[#e5ece8] shadow-md py-1.5 px-3 flex items-center justify-between cursor-pointer hover:border-[#0d9468] transition-all'
                >
                    <div className='flex items-center gap-2 text-sm text-[#5f736b]'>
                        <span className='text-[#7c3aed] text-base'>✨</span>
                        <span className='text-xs font-medium text-[#94a3b8]'>Ask Guava...</span>
                    </div>

                    <div className='bg-[#f3f0ff] text-[#7c3aed] px-5 py-1.5 rounded-full flex items-center justify-center hover:bg-[#ede9fe] transition-colors'>
                        <AudioOutlined className='text-sm'/>
                    </div>
                </div>
            </div>

            {/* 2. Bottom Navigation Bar */}
            <nav className='bg-white border-t border-[#e5ece8] px-4 py-2 pointer-events-auto shadow-lg w-full box-border'>
                <div className='max-w-md mx-auto flex items-center justify-between w-full'>
                    {/* Tab 1: Home */}
                    <button
                        type='button'
                        onClick={() => { onTabChange('home') }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                            activeTab === 'home'
                                ? 'text-[#0d9468]'
                                : 'text-[#5f736b] hover:text-[#192823]'
                        }`}
                    >
                        <HomeOutlined className='text-xl'/>
                    </button>

                    {/* Tab 2: Biomarkers / Trends */}
                    <button
                        type='button'
                        onClick={() => { onTabChange('biomarkers') }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                            activeTab === 'biomarkers'
                                ? 'text-[#0d9468]'
                                : 'text-[#5f736b] hover:text-[#192823]'
                        }`}
                    >
                        <LineChartOutlined className='text-xl'/>
                    </button>

                    {/* Tab 3: Center Plus Action Button */}
                    <button
                        type='button'
                        onClick={onAddClick}
                        className='w-12 h-12 -mt-4 rounded-full bg-[#0d9468] hover:bg-[#0b7e58] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform'
                        title='Add Results'
                    >
                        <PlusOutlined className='text-xl stroke-[3]'/>
                    </button>

                    {/* Tab 4: Records / Menu */}
                    <button
                        type='button'
                        onClick={() => { onTabChange('records') }}
                        className={`flex items-center justify-center transition-colors ${
                            activeTab === 'records'
                                ? 'py-1.5 px-3 rounded-2xl bg-[#e8f5f1] text-[#0d9468]'
                                : 'p-2 rounded-xl text-[#5f736b] hover:text-[#192823]'
                        }`}
                    >
                        <MenuOutlined className='text-lg'/>
                    </button>

                    {/* Tab 5: Profile */}
                    <button
                        type='button'
                        onClick={() => { onTabChange('profile') }}
                        className={`flex items-center justify-center py-1.5 px-3 rounded-full transition-colors ${
                            activeTab === 'profile'
                                ? 'bg-[#e8f5f1] text-[#0d9468]'
                                : 'text-[#5f736b] hover:text-[#192823]'
                        }`}
                    >
                        <UserOutlined className='text-lg'/>
                    </button>
                </div>
            </nav>
        </div>
    )
}
