import { GuavaNavTab } from '@/components/GuavaHeader'

export interface GuavaMobileBottomNavProps {
    className?: string
    activeTab: GuavaNavTab
    onTabChange: (tab: GuavaNavTab) => void
    onAddClick: () => void
    onAskAiClick?: () => void
}
