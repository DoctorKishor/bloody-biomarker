import { useEffect, useState } from 'react'

// eslint-disable-next-line no-restricted-imports
import { ACTIVE_USER_CHANGED_EVENT, getCurrentUserIdSync } from '@/db/services/db.service'

export const useActiveUserId = (): string | null => {
    const [activeId, setActiveId] = useState<string | null>(() => getCurrentUserIdSync())

    useEffect(() => {
        const handleUserChange = (e: Event) => {
            const customEvent = e as CustomEvent<string>
            setActiveId(customEvent.detail ?? getCurrentUserIdSync())
        }
        if (typeof window !== 'undefined') {
            window.addEventListener(ACTIVE_USER_CHANGED_EVENT, handleUserChange)
            window.addEventListener('storage', handleUserChange)
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener(ACTIVE_USER_CHANGED_EVENT, handleUserChange)
                window.removeEventListener('storage', handleUserChange)
            }
        }
    }, [])

    return activeId
}
