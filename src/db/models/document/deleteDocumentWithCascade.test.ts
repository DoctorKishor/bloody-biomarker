import { describe, expect, it, vi, beforeEach } from 'vitest'

import { deleteDocumentWithCascade } from './deleteDocumentWithCascade'

interface MockRecord {
    id: string
    biomarkerId: string
    documentId?: string
    latest: boolean
    createdAt: Date
}

interface MockFile {
    id: string
    fileName: string
}

const mockRecords: MockRecord[] = []
const mockFiles = new Map<string, MockFile>()

const mockBulkDelete = vi.fn((ids: string[]) => {
    const idSet = new Set(ids)
    const remaining = mockRecords.filter(r => !idSet.has(r.id))
    mockRecords.length = 0
    mockRecords.push(...remaining)
    return Promise.resolve()
})

const mockUpdate = vi.fn((id: string, updates: Partial<MockRecord>) => {
    const rec = mockRecords.find(r => r.id === id)
    if (rec) {
        Object.assign(rec, updates)
    }
    return Promise.resolve(1)
})

const mockFileDelete = vi.fn((id: string) => {
    mockFiles.delete(id)
    return Promise.resolve()
})

vi.mock('@/db/services/db.service', () => ({
    db: {
        biomarkerRecords: {
            where: (field: string) => ({
                equals: (val: string) => ({
                    toArray: () => {
                        if (field === 'documentId') {
                            return Promise.resolve(mockRecords.filter(r => r.documentId === val))
                        }
                        if (field === 'biomarkerId') {
                            return Promise.resolve(mockRecords.filter(r => r.biomarkerId === val))
                        }
                        return Promise.resolve([])
                    },
                }),
            }),
            bulkDelete: (ids: string[]) => mockBulkDelete(ids),
            update: (id: string, updates: Partial<MockRecord>) => mockUpdate(id, updates),
        },
        uploadedFiles: {
            delete: (id: string) => mockFileDelete(id),
        },
    },
}))

describe('deleteDocumentWithCascade', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockRecords.length = 0
        mockFiles.clear()
    })

    it('deletes file only without deleting related biomarker records when deleteRelatedData is false', async () => {
        mockRecords.push(
            {
                id: 'rec-1',
                biomarkerId: 'bio-platelets',
                documentId: 'doc-1',
                latest: true,
                createdAt: new Date('2026-01-01'),
            },
            {
                id: 'rec-2',
                biomarkerId: 'bio-potassium',
                documentId: 'doc-1',
                latest: true,
                createdAt: new Date('2026-01-01'),
            },
        )
        mockFiles.set('doc-1', {
            id: 'doc-1',
            fileName: 'test.pdf',
        })

        const result = await deleteDocumentWithCascade({
            documentId: 'doc-1',
            deleteRelatedData: false,
        })

        expect(result.deletedRecordCount).toBe(0)
        expect(mockBulkDelete).not.toHaveBeenCalled()
        expect(mockFileDelete).toHaveBeenCalledWith('doc-1')
        expect(mockRecords.length).toBe(2)
        expect(mockUpdate).toHaveBeenCalledWith('rec-1', expect.objectContaining({ documentId: undefined }))
        expect(mockUpdate).toHaveBeenCalledWith('rec-2', expect.objectContaining({ documentId: undefined }))
    })

    it('deletes only the data from that file when deleteRelatedData is true', async () => {
        mockRecords.push(
            {
                id: 'rec-1',
                biomarkerId: 'bio-platelets',
                documentId: 'doc-target',
                latest: true,
                createdAt: new Date('2026-03-01'),
            },
            {
                id: 'rec-2',
                biomarkerId: 'bio-platelets',
                documentId: 'doc-other',
                latest: false,
                createdAt: new Date('2026-01-01'),
            },
            {
                id: 'rec-3',
                biomarkerId: 'bio-glucose',
                documentId: 'doc-other',
                latest: true,
                createdAt: new Date('2026-01-01'),
            },
        )
        mockFiles.set('doc-target', {
            id: 'doc-target',
            fileName: 'target.pdf',
        })

        const result = await deleteDocumentWithCascade({
            documentId: 'doc-target',
            deleteRelatedData: true,
        })

        expect(result.deletedRecordCount).toBe(1)
        expect(mockBulkDelete).toHaveBeenCalledWith(['rec-1'])
        expect(mockFileDelete).toHaveBeenCalledWith('doc-target')

        // Other document's records remain untouched
        expect(mockRecords.length).toBe(2)
        expect(mockRecords.find(r => r.id === 'rec-2')).toBeDefined()
        expect(mockRecords.find(r => r.id === 'rec-3')).toBeDefined()

        // Platelets parameter promotes rec-2 to latest: true
        expect(mockUpdate).toHaveBeenCalledWith('rec-2', expect.objectContaining({ latest: true }))
    })
})
