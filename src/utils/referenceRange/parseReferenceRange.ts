import { Range } from '@/db/types'

const toNumeric = (val: unknown): number | undefined => {
    if (typeof val === 'number') {
        return isNaN(val) ? undefined : val
    }
    if (typeof val === 'string') {
        const cleaned = val.trim().replace(/,/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? undefined : num
    }
    return undefined
}

export const parseReferenceRangeString = (text: string): Range | undefined => {
    if (!text || typeof text !== 'string') return undefined

    const cleanedText = text.trim()
    if (!cleanedText) return undefined

    // Split on newlines or semicolons or commas when followed by category labels
    const segments = cleanedText
        .split(/(?:[\n;\r]+|,\s*(?=[A-Za-z]+(?:\s+[A-Za-z]+)*\s*:))/g)
        .map(s => s.trim())
        .filter(Boolean)

    let targetSegment = cleanedText

    if (segments.length > 1) {
        // Preferred categories in priority order for normal/healthy baseline
        const priorityRegexes = [
            /\b(normal)\b/i,
            /\b(desirable)\b/i,
            /\b(optimal)\b/i,
            /\b(ideal)\b/i,
            /\b(best)\b/i,
            /\b(low\s*risk)\b/i,
        ]

        let matched = false
        for (const regex of priorityRegexes) {
            const found = segments.find(seg => regex.test(seg))
            if (found) {
                targetSegment = found
                matched = true
                break
            }
        }

        // If no positive category matched, filter out known negative categories
        if (!matched) {
            const nonNegative = segments.filter(seg =>
                !/\b(impaired|diabetic|high|borderline|low|risk|severe)\b/i.test(seg),
            )
            if (nonNegative.length > 0) {
                targetSegment = nonNegative[0]
            }
        }
    }

    // Match ranges like "17 - 43", "0.84 - 1.25", "40 to 59", "131 - 159"
    const rangeMatch = targetSegment.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i)
    if (rangeMatch) {
        const min = parseFloat(rangeMatch[1])
        const max = parseFloat(rangeMatch[2])
        if (!isNaN(min) && !isNaN(max)) {
            return {
                min,
                max,
            }
        }
    }

    // Match one-sided upper bound: "Upto 110", "Below 150", "<= 140", "< 100", "Under 100", "Less than 150"
    const maxMatch = targetSegment.match(/(?:upto|up\s*to|below|less\s*than|under|<(?:=)?)\s*:?\s*-?\s*(\d+(?:\.\d+)?)/i)
    if (maxMatch) {
        const max = parseFloat(maxMatch[1])
        if (!isNaN(max)) {
            return {
                max,
            }
        }
    }

    // Match one-sided lower bound: "More than 60", "> 60", "Above 60", ">= 60", "60 and above"
    const minMatch = targetSegment.match(/(?:more\s*than|greater\s*than|above|>(?:=)?)\s*:?\s*-?\s*(\d+(?:\.\d+)?)/i)
    if (minMatch) {
        const min = parseFloat(minMatch[1])
        if (!isNaN(min)) {
            return {
                min,
            }
        }
    }

    const andAboveMatch = targetSegment.match(/(\d+(?:\.\d+)?)\s*(?:and\s*above|\+)/i)
    if (andAboveMatch) {
        const min = parseFloat(andAboveMatch[1])
        if (!isNaN(min)) {
            return {
                min,
            }
        }
    }

    return undefined
}

export const parseReferenceRangeInput = (input: unknown): Range | undefined => {
    if (input == null) return undefined

    if (typeof input === 'string') {
        return parseReferenceRangeString(input)
    }

    if (typeof input === 'object') {
        const raw = input as Record<string, unknown>
        const min = toNumeric(raw.min)
        const max = toNumeric(raw.max)

        if (min !== undefined || max !== undefined) {
            return {
                min,
                max,
            }
        }

        // Check if any string field contains parseable range text
        for (const key of Object.keys(raw)) {
            const val = raw[key]
            if (typeof val === 'string') {
                const parsed = parseReferenceRangeString(val)
                if (parsed) {
                    return parsed
                }
            }
        }
    }

    return undefined
}
