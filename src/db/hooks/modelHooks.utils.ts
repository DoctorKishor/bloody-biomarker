import { useMemo } from 'react'

import { EntityTable, IDType, UpdateSpec, InsertType, IndexableType } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'

import { useActiveUserId } from '@/db/hooks/useActiveUserId'
// eslint-disable-next-line no-restricted-imports
import { db, getCurrentUserIdSync } from '@/db/services/db.service'
import { createBaseEntity } from '@/db/utils/entity.utils'

const USER_SCOPED_TABLE_NAMES = new Set([
    'biomarkerConfigs',
    'biomarkerRecords',
    'uploadedFiles',
    'savedFilters',
    'verifiedConversions',
    'blockedMerges',
    'formulas',
])

interface ModelHooksConfig<T> {
    defaultSort?: (a: T, b: T) => number
}

interface UseItemsOptions<T> {
    filter?: (item: T) => boolean
    sort?: (a: T, b: T) => number
}

type IDParam<T, K extends keyof T & string> = IDType<T, K>

export function createModelHooks<T extends object, K extends keyof T & string> (
    table: EntityTable<T, K>,
    config?: ModelHooksConfig<T>,
) {
    return {
        useItems: (options?: UseItemsOptions<T>) => {
            const activeUserId = useActiveUserId()
            const isUserScoped = table?.name ? USER_SCOPED_TABLE_NAMES.has(table.name) : false

            const rawData = useLiveQuery(async () => {
                const all = await table.toArray()
                if (!isUserScoped) {
                    return all
                }

                const currentId = activeUserId ?? getCurrentUserIdSync()
                if (!currentId) {
                    return all
                }

                let initialUserId: string | undefined
                try {
                    const firstUser = await db.users?.orderBy?.('createdAt')?.first?.()
                    initialUserId = firstUser?.id
                } catch {
                    // Ignore in mock or standalone environments
                }

                return all.filter((item) => {
                    const itemUserId = (item as { userId?: string }).userId
                    if (itemUserId) {
                        return itemUserId === currentId
                    }
                    return currentId === initialUserId
                })
            }, [activeUserId])

            const data = useMemo(() => {
                if (!rawData) return []
                let items = rawData.filter((item): item is T => item != null)
                if (options?.filter) {
                    items = items.filter(Boolean).filter(options.filter)
                }
                const sortFn = options?.sort ?? config?.defaultSort
                return sortFn ? items.sort(sortFn) : items
            }, [rawData, options?.filter, options?.sort])
            return {
                data,
                loading: rawData === undefined,
            }
        },

        useItem: (id?: IDParam<T, K>) => {
            const activeUserId = useActiveUserId()
            const isUserScoped = table?.name ? USER_SCOPED_TABLE_NAMES.has(table.name) : false

            const data = useLiveQuery(
                async () => {
                    if (!id) return null
                    const item = await table.get(id)
                    if (!item) return null
                    if (!isUserScoped) return item

                    const currentId = activeUserId ?? getCurrentUserIdSync()
                    const itemUserId = (item as { userId?: string }).userId
                    if (itemUserId && currentId && itemUserId !== currentId) {
                        return null
                    }
                    return item
                },
                [id, activeUserId],
            )
            return {
                data: data ?? null,
                loading: data === undefined,
            }
        },

        createItems: async (partials: Array<Partial<T>>): Promise<T[]> => {
            const baseEntities = await Promise.all(
                partials.map(() => createBaseEntity()),
            )
            const items = partials.map((partial, index) => ({
                ...baseEntities[index],
                ...partial,
            } as T))
            await table.bulkAdd(items as Array<InsertType<T, K>>)
            return items
        },

        addItem: async (item: Partial<T>): Promise<IDParam<T, K>> => {
            const itemWithBase = {
                ...await createBaseEntity(),
                ...item,
            } as InsertType<T, K>
            return await table.add(itemWithBase)
        },

        updateItem: async (id: IDParam<T, K>, updates: UpdateSpec<InsertType<T, K>>): Promise<void> => {
            await table.update(id, {
                ...updates,
                updatedAt: new Date(),
            })
        },

        removeItem: async (id: IDParam<T, K>): Promise<void> => {
            await table.delete(id)
        },

        modifyItem: async (
            id: IDParam<T, K>,
            callback: (item: T) => void,
        ): Promise<number> => {
            return await table
                .where(table.schema.primKey.keyPath as K)
                .equals(id as never)
                .modify((item) => {
                    callback(item)
                    if ('updatedAt' in item) {
                        (item as T & { updatedAt: Date }).updatedAt = new Date()
                    }
                })
        },

        bulkUpdate: async (items: T[]): Promise<void> => {
            if (items.length === 0) return

            const primKey = table.schema.primKey.keyPath as K
            const ids = items.map(item => (item as T & Record<K, IDParam<T, K>>)[primKey])
            const now = new Date()

            await table
                .where(primKey)
                .anyOf(ids as IndexableType[])
                .modify((item) => {
                    const itemId = (item as T & Record<K, IDParam<T, K>>)[primKey]
                    const updateItem = items.find(i => (i as T & Record<K, IDParam<T, K>>)[primKey] === itemId)
                    if (updateItem) {
                        Object.assign(item, updateItem)
                        if ('updatedAt' in item) {
                            (item as T & { updatedAt: Date }).updatedAt = now
                        }
                    }
                })
        },

        bulkDelete: async (ids: Array<IDParam<T, K>>): Promise<void> => {
            if (ids.length > 0) {
                await table.bulkDelete(ids)
            }
        },
    }
}
