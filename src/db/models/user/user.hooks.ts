/* eslint-disable no-restricted-imports */
import { useEffect } from 'react'

import { useLiveQuery } from 'dexie-react-hooks'

import { createModelHooks } from '@/db/hooks/modelHooks.utils'
import { useActiveUserId } from '@/db/hooks/useActiveUserId'
import {
    db,
    getCurrentUserIdSync,
    getIsImporting,
    setCurrentUserId,
} from '@/db/services/db.service'

import { getOrCreateUser } from './user.utils'

export const {
    useItems: useUsers,
    useItem: useUserById,
    addItem: addUser,
    updateItem: updateUser,
    removeItem: deleteUser,
} = createModelHooks(db.users)

export const useCurrentUser = () => {
    const activeUserId = useActiveUserId()

    const user = useLiveQuery(async () => {
        if (activeUserId) {
            const matched = await db.users.get(activeUserId)
            if (matched) return matched
        }
        const users = await db.users.toArray()
        return users[0] || null
    }, [activeUserId])

    useEffect(() => {
        if (!user && !getIsImporting()) {
            getOrCreateUser().then((createdUser) => {
                if (createdUser?.id) {
                    setCurrentUserId(createdUser.id)
                }
            }).catch((error) => {
                console.error('Failed to get or create user:', error)
            })
        } else if (user?.id) {
            if (getCurrentUserIdSync() !== user.id) {
                setCurrentUserId(user.id)
            }
            if (!user.gender || user.age === undefined) {
                void db.users.update(user.id, {
                    age: user.age ?? 35,
                    gender: user.gender ?? 'male',
                    updatedAt: new Date(),
                })
            }
        }
    }, [user])

    return user
}
