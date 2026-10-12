export type GuavaNavTab = 'home' | 'insights' | 'profile' | 'biomarkers' | 'records' | 'sources'

export interface GuavaHeaderProps {
    className?: string
    activeTab: GuavaNavTab
    onTabChange: (tab: GuavaNavTab) => void
    onAddResult?: () => void
}
