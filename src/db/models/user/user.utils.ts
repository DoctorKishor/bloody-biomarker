import { v4 as uuidv4 } from 'uuid'

import { seedBiomarkerConfigsForUser } from '@/db/models/biomarkerConfig/biomarkerConfig.utils'
// eslint-disable-next-line no-restricted-imports
import { db, getCurrentUserIdSync, getIsImporting, setCurrentUserId } from '@/db/services/db.service'

import { User } from './user.types'

export const getOrCreateUser = async (): Promise<User | null> => {
    if (getIsImporting()) {
        return null
    }

    const currentId = getCurrentUserIdSync()
    if (currentId) {
        const matched = await db.users.get(currentId)
        if (matched) {
            return matched
        }
    }

    return await db.transaction('rw', [db.users, db.biomarkerConfigs], async () => {
        const existingUser = await db.users.limit(1).first()
        if (existingUser) {
            setCurrentUserId(existingUser.id)
            return existingUser
        }

        const newUser: User = {
            id: uuidv4(),
            name: 'Dr. Kishor Anbazhakan',
            gender: 'male',
            age: 35,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        await db.users.add(newUser)
        setCurrentUserId(newUser.id)
        await seedBiomarkerConfigsForUser(newUser.id)
        return newUser
    })
}

export const createNewProfile = async (params: {
    name: string
    gender?: 'male' | 'female'
    age?: number
    birthDate?: string
    email?: string
    bloodType?: string
    height?: string
}): Promise<User> => {
    const newUserId = uuidv4()
    const now = new Date()
    const newUser: User = {
        id: newUserId,
        name: params.name.trim() || 'New Profile',
        gender: params.gender ?? 'male',
        age: params.age ?? 30,
        birthDate: params.birthDate,
        email: params.email?.trim(),
        bloodType: params.bloodType,
        height: params.height,
        createdAt: now,
        updatedAt: now,
    }

    await db.transaction(
        'rw',
        [db.users, db.biomarkerConfigs],
        async () => {
            await db.users.add(newUser)
            await seedBiomarkerConfigsForUser(newUserId)
        },
    )

    setCurrentUserId(newUserId)
    return newUser
}

export const deleteProfileWithCascade = async (userIdToDelete: string): Promise<void> => {
    await db.transaction(
        'rw',
        [
            db.users,
            db.biomarkerRecords,
            db.biomarkerConfigs,
            db.uploadedFiles,
            db.savedFilters,
            db.formulas,
            db.verifiedConversions,
            db.blockedMerges,
        ],
        async () => {
            await db.biomarkerRecords.where('userId').equals(userIdToDelete).delete()
            await db.biomarkerConfigs.where('userId').equals(userIdToDelete).delete()
            await db.uploadedFiles.where('userId').equals(userIdToDelete).delete()
            await db.savedFilters.where('userId').equals(userIdToDelete).delete()
            await db.formulas.where('userId').equals(userIdToDelete).delete()
            await db.verifiedConversions.where('userId').equals(userIdToDelete).delete()
            await db.blockedMerges.where('userId').equals(userIdToDelete).delete()
            await db.users.delete(userIdToDelete)
        },
    )

    try {
        window?.localStorage?.removeItem(`guava_profile_records_${userIdToDelete}`)
    } catch {
        // Ignore storage errors
    }

    if (getCurrentUserIdSync() === userIdToDelete) {
        const nextUser = await db.users.limit(1).first()
        if (nextUser) {
            setCurrentUserId(nextUser.id)
        } else {
            await getOrCreateUser()
        }
    }
}

export const getCurrentUserId = async (): Promise<string> => {
    const activeId = getCurrentUserIdSync()
    if (activeId) {
        return activeId
    }
    const user = await getOrCreateUser()
    if (!user) {
        throw new Error('Cannot get user ID during import')
    }
    return user.id
}
