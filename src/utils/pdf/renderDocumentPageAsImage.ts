import * as pdfjsLib from 'pdfjs-dist'

import { renderPageToBase64 } from './renderPageToBase64'

export interface RenderDocumentPageResult {
    imageUrl: string
    totalPages: number
    isFallback?: boolean
}

export const renderDocumentPageAsImage = async (
    fileData: ArrayBuffer,
    pageNumber = 1,
    mimeType?: string,
): Promise<RenderDocumentPageResult> => {
    try {
        // If it's an image mimeType (png, jpeg, webp, etc.)
        if (mimeType && (mimeType.startsWith('image/') || mimeType === 'image/jpeg' || mimeType === 'image/png')) {
            const blob = new Blob([fileData], { type: mimeType })
            const imageUrl = URL.createObjectURL(blob)
            return {
                imageUrl,
                totalPages: 1,
            }
        }

        // Configure worker if not already set
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
        }

        // Process as PDF from ArrayBuffer (use slice copy to prevent detached buffer)
        const bufferCopy = fileData.slice(0)
        const pdfDocument = await pdfjsLib.getDocument({ data: bufferCopy }).promise
        const totalPages = pdfDocument.numPages
        const safePageNum = Math.min(Math.max(1, pageNumber), totalPages)
        const page = await pdfDocument.getPage(safePageNum)
        const imageUrl = await renderPageToBase64(page, 2.0)
        return {
            imageUrl,
            totalPages,
        }
    } catch (error) {
        console.warn('Failed to render document page as image, falling back to sample:', error)
        return {
            imageUrl: '/sample-lab-report.png',
            totalPages: 1,
            isFallback: true,
        }
    }
}
