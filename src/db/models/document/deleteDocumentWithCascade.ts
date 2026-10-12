// eslint-disable-next-line no-restricted-imports
import { db } from '@/db/services/db.service'

export interface DeleteDocumentCascadeOptions {
    documentId: string
    deleteRelatedData: boolean
}

export interface DeleteDocumentCascadeResult {
    deletedRecordCount: number
    affectedBiomarkerIds: string[]
}

/**
 * Deletes a document with the user's choice:
 * - deleteRelatedData === true: Permanently deletes all biomarker records associated
 *   with this document from the DB. Does NOT delete the biomarker configs (parameters) themselves,
 *   only the data from this file. Also recalculates `latest: true` for affected biomarkers.
 * - deleteRelatedData === false: Deletes the file from storage, but preserves the biomarker
 *   records in the database (unlinking the documentId).
 */
export const deleteDocumentWithCascade = async ({
    documentId,
    deleteRelatedData,
}: DeleteDocumentCascadeOptions): Promise<DeleteDocumentCascadeResult> => {
    let deletedRecordCount = 0
    let affectedBiomarkerIds: string[] = []

    if (deleteRelatedData) {
        // Find all records belonging specifically to this document
        const recordsToDelete = await db.biomarkerRecords
            .where('documentId')
            .equals(documentId)
            .toArray()

        if (recordsToDelete.length > 0) {
            deletedRecordCount = recordsToDelete.length
            const recordIds = recordsToDelete.map(r => r.id)
            affectedBiomarkerIds = Array.from(new Set(recordsToDelete.map(r => r.biomarkerId)))

            // Delete the records specifically from this file
            await db.biomarkerRecords.bulkDelete(recordIds)

            // Recalculate latest: true for any biomarker parameter whose latest record was deleted
            for (const biomarkerId of affectedBiomarkerIds) {
                const remaining = await db.biomarkerRecords
                    .where('biomarkerId')
                    .equals(biomarkerId)
                    .toArray()

                if (remaining.length > 0) {
                    const hasLatest = remaining.some(r => r.latest)
                    if (!hasLatest) {
                        // Find the most recent remaining record by createdAt
                        const newest = remaining.sort((a, b) => {
                            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                            return timeB - timeA
                        })[0]

                        await db.biomarkerRecords.update(newest.id, {
                            latest: true,
                            updatedAt: new Date(),
                        })
                    }
                }
            }
        }
    } else {
        // Keep the biomarker records in DB, but unlink documentId
        const recordsToUnlink = await db.biomarkerRecords
            .where('documentId')
            .equals(documentId)
            .toArray()

        for (const record of recordsToUnlink) {
            await db.biomarkerRecords.update(record.id, {
                documentId: undefined,
                updatedAt: new Date(),
            })
        }
    }

    // Delete the document record itself
    await db.uploadedFiles.delete(documentId)

    return {
        deletedRecordCount,
        affectedBiomarkerIds,
    }
}
