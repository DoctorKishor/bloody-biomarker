import { findAbimBiomarkerStandard, AbimTier } from '@/constants/abimReferenceRanges'
import { Range } from '@/db/types'
import { convertUniversal } from '@/utils/ucum/convertUniversal'

import { parseReferenceRangeString } from './parseReferenceRange'

export type BiomarkerHealthStatus =
    | 'Optimal'
    | 'Normal'
    | 'In range'
    | 'Borderline High'
    | 'High'
    | 'Very High'
    | 'Low'
    | 'Out of range'
    | 'Unknown'

export interface RangeSegment {
    label: string
    color: string
    widthPct: number
    startPct: number
    minVal?: number
    maxVal?: number
}

export interface RangeTick {
    value: number
    label: string
    pct: number
}

export interface RangeLabel {
    text: string
    color: string
    pct: number
}

export interface SecondaryAbimComparison {
    statusText: string
    statusColor: string
    isAbnormal: boolean
    rangeText: string
    notes: string
}

export interface BiomarkerRangeEvaluation {
    // Primary resolution
    primarySource: 'Lab Report' | 'ABIM 2026' | 'Default'
    rangeText: string
    normalMin?: number
    normalMax?: number
    // Clinical result
    hasValue: boolean
    status: BiomarkerHealthStatus
    statusLabel: string
    statusColor: string
    isAbnormal: boolean
    // Secondary comparison (shown only when lab report is abnormal)
    secondaryAbimComparison?: SecondaryAbimComparison
    // Unified Bar Configuration
    markerPct?: number
    segments: RangeSegment[]
    ticks: RangeTick[]
    labels: RangeLabel[]
    // Graph config for modal
    graphMin: number
    graphMax: number
    graphYAxis: Array<{ value: number, label: string, bottomPct: number }>
    graphBands: Array<{ color: string, bottomPct: number, heightPct: number }>
}

export interface EvaluateBiomarkerOptions {
    biomarkerName: string
    value?: number
    unit?: string
    reportRangeRaw?: string | Range
    userGender?: 'male' | 'female'
    userAge?: number
}

/**
 * Normalizes text to extract multi-tier labels from lab reports
 */
interface ParsedReportTier {
    label: string
    status: BiomarkerHealthStatus
    color: string
    min?: number
    max?: number
}

const parseReportTiers = (rawText: string): ParsedReportTier[] | undefined => {
    if (!rawText) return undefined

    const lines = rawText
        .split(/(?:[\n;\r]+|,\s*(?=[A-Za-z]+(?:\s+[A-Za-z]+)*\s*:))/g)
        .map((l) => l.trim())
        .filter(Boolean)

    if (lines.length < 2) return undefined

    const tiers: ParsedReportTier[] = []

    for (const line of lines) {
        // e.g. "NORMAL: Upto 110", "IMPAIRED: 111 to 125", "DIABETIC: More than 126"
        const parts = line.split(':')
        if (parts.length >= 2) {
            const rawLabel = parts[0].trim()
            const valStr = parts.slice(1).join(':').trim()
            const parsed = parseReferenceRangeString(valStr)

            let status: BiomarkerHealthStatus = 'Normal'
            let color = '#86efac'
            let label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1).toLowerCase()

            if (/normal|optimal|desirable/i.test(rawLabel)) {
                status = 'Optimal'
                color = '#10b981'
                label = 'Normal'
            } else if (/impaired|borderline/i.test(rawLabel)) {
                status = 'Borderline High'
                color = '#fb923c'
                label = 'Impaired Glucose'
            } else if (/diabetic/i.test(rawLabel)) {
                status = 'High'
                color = '#ef4444'
                label = 'Diabetic'
            } else if (/high|severe/i.test(rawLabel)) {
                status = 'High'
                color = '#ef4444'
                label = 'High'
            } else if (/low/i.test(rawLabel)) {
                status = 'Low'
                color = '#f97316'
                label = 'Low'
            }

            tiers.push({
                label,
                status,
                color,
                min: parsed?.min,
                max: parsed?.max,
            })
        }
    }

    return tiers.length > 0 ? tiers : undefined
}

/**
 * Universal evaluation engine for biomarker reference ranges,
 * combining Lab Report priority, ABIM 2026 fallback, and unified visual bar metrics.
 */
export const evaluateBiomarkerRange = (options: EvaluateBiomarkerOptions): BiomarkerRangeEvaluation => {
    const { biomarkerName, value, unit = '', reportRangeRaw, userGender, userAge } = options

    const abimStandard = findAbimBiomarkerStandard(biomarkerName)

    // 1. Resolve ABIM demographic interval
    let abimInterval = abimStandard?.general
    let abimTiers = abimStandard?.tiers

    if (userGender === 'male' && abimStandard?.male) {
        abimInterval = abimStandard.male
        if (abimStandard.maleTiers) abimTiers = abimStandard.maleTiers
    } else if (userGender === 'female' && abimStandard?.female) {
        abimInterval = abimStandard.female
        if (abimStandard.femaleTiers) abimTiers = abimStandard.femaleTiers
    }

    // 2. Parse Lab Report Range
    let reportRange: Range | undefined
    let reportRawString: string | undefined
    let reportTiers: ParsedReportTier[] | undefined

    if (typeof reportRangeRaw === 'string') {
        reportRawString = reportRangeRaw
        reportTiers = parseReportTiers(reportRangeRaw)
        reportRange = parseReferenceRangeString(reportRangeRaw)
    } else if (typeof reportRangeRaw === 'object' && reportRangeRaw !== null) {
        reportRange = reportRangeRaw
        if (reportRange.min !== undefined && reportRange.max !== undefined) {
            reportRawString = `${reportRange.min} - ${reportRange.max}`
        } else if (reportRange.max !== undefined) {
            reportRawString = `< ${reportRange.max}`
        } else if (reportRange.min !== undefined) {
            reportRawString = `> ${reportRange.min}`
        }
    }

    // 3. Determine Primary Range (Rule 1: Report priority, Rule 2: ABIM fallback)
    const hasReportRange = !!reportRange && (reportRange.min !== undefined || reportRange.max !== undefined || !!reportTiers)
    const primarySource: 'Lab Report' | 'ABIM 2026' | 'Default' = hasReportRange
        ? 'Lab Report'
        : abimInterval
            ? 'ABIM 2026'
            : 'Default'

    const primaryMin = hasReportRange ? reportRange?.min : abimInterval?.min
    const primaryMax = hasReportRange ? reportRange?.max : abimInterval?.max

    // Display string for the primary range
    let primaryRangeText = 'Not specified'
    if (primarySource === 'Lab Report' && reportRawString) {
        primaryRangeText = reportRawString
    } else if (primaryMin !== undefined && primaryMax !== undefined) {
        primaryRangeText = `${primaryMin} – ${primaryMax} ${unit !== '' ? unit : (abimStandard?.standardUnit ?? '')}`.trim()
    } else if (primaryMax !== undefined) {
        primaryRangeText = `< ${primaryMax} ${unit !== '' ? unit : (abimStandard?.standardUnit ?? '')}`.trim()
    } else if (primaryMin !== undefined) {
        primaryRangeText = `> ${primaryMin} ${unit !== '' ? unit : (abimStandard?.standardUnit ?? '')}`.trim()
    }

    // 4. Handle Unit & Magnitude Normalization between value and primary range
    let normalizedValue = value

    if (value !== undefined) {
        // A. If evaluating against ABIM standard range, normalize value to ABIM standard unit
        if (primarySource === 'ABIM 2026' && unit && abimStandard?.standardUnit && unit.toLowerCase() !== abimStandard.standardUnit.toLowerCase()) {
            try {
                const converted = convertUniversal(value, unit, abimStandard.standardUnit, { biomarkerName })
                if (converted && !isNaN(converted.value)) {
                    normalizedValue = converted.value
                }
            } catch {
                // keep value
            }
        }

        // B. Reconcile magnitude mismatches between value and primary range (e.g., 249 in 10^3/uL vs 150000 - 400000 /uL)
        const refAnchor = primaryMin ?? primaryMax
        if (refAnchor !== undefined && normalizedValue !== undefined && refAnchor > 0 && normalizedValue > 0) {
            const ratio = refAnchor / normalizedValue

            // Case 1: Range is in base count (/uL or /cumm e.g. 150000 or 4000) while value is in thousands (e.g. 249 or 7.5)
            if (ratio >= 200 && ratio <= 2500) {
                normalizedValue = normalizedValue * 1000
            } else if (ratio >= 0.0004 && ratio <= 0.005) {
                // Case 2: Range is in thousands (e.g. 150 - 400 or 4.0 - 11.0) while value is in base count (e.g. 249000 or 7500)
                normalizedValue = normalizedValue / 1000
            } else if (ratio >= 200000 && ratio <= 2500000) {
                // Case 3: Range is in base count (e.g. 4,200,000) while value is in millions (e.g. 4.8)
                normalizedValue = normalizedValue * 1000000
            } else if (ratio >= 0.0000004 && ratio <= 0.000005) {
                // Case 4: Range is in millions (e.g. 4.2 - 5.9) while value is in base count (e.g. 4800000)
                normalizedValue = normalizedValue / 1000000
            } else if (ratio >= 20000 && ratio <= 150000) {
                // Case 5: Range is in base count (e.g. 150000) while value is in lakhs (e.g. 2.49)
                normalizedValue = normalizedValue * 100000
            }
        }
    }

    // 5. Evaluate Clinical Status
    const hasValue = normalizedValue !== undefined
    let status: BiomarkerHealthStatus = 'Normal'
    let statusLabel = hasValue ? 'Optimal' : 'No data'
    let statusColor = hasValue ? '#10b981' : '#94a3b8'
    let isAbnormal = false

    const isGlucose = /glucose/i.test(biomarkerName)

    if (isGlucose && normalizedValue !== undefined && normalizedValue < 70) {
        // Hypoglycemic lower bound
        status = 'Low'
        statusLabel = 'Low'
        statusColor = '#f97316'
        isAbnormal = true
    } else if (normalizedValue !== undefined) {
        // Multi-tier check (e.g. from report or ABIM)
        const activeTiers = (primarySource === 'Lab Report' && reportTiers && reportTiers.length >= 2) ? reportTiers : abimTiers

        if (activeTiers && activeTiers.length > 0) {
            let matchedTier: (ParsedReportTier | AbimTier) | undefined
            for (const tier of activeTiers) {
                const aboveMin = tier.min === undefined || normalizedValue >= tier.min
                const belowMax = tier.max === undefined || normalizedValue <= tier.max
                if (aboveMin && belowMax) {
                    matchedTier = tier
                    break
                }
            }

            if (matchedTier) {
                status = matchedTier.status
                statusLabel = matchedTier.label
                statusColor = matchedTier.color
                isAbnormal = status === 'High' || status === 'Very High' || status === 'Low' || status === 'Borderline High' || status === 'Out of range'
            }

            // Absolute clinical rule: If primarySource is 'Lab Report', the report thresholds take precedence over any tier label
            if (primarySource === 'Lab Report' && (primaryMin !== undefined || primaryMax !== undefined)) {
                const violatesUpper = primaryMax !== undefined && normalizedValue > primaryMax
                const violatesLower = primaryMin !== undefined && normalizedValue < primaryMin
                if (violatesUpper || violatesLower) {
                    isAbnormal = true
                    if (status === 'Optimal' || status === 'Normal' || status === 'In range') {
                        status = violatesUpper ? 'High' : 'Low'
                        statusLabel = violatesUpper ? `High (> ${primaryMax})` : `Low (< ${primaryMin})`
                        statusColor = violatesUpper ? '#ef4444' : '#f97316'
                    }
                }
            }
        } else if (primaryMin !== undefined && primaryMax !== undefined) {
            // Two-sided bounded: e.g. Creatinine 0.6 - 1.2
            if (normalizedValue < primaryMin) {
                status = 'Low'
                statusLabel = 'Low'
                statusColor = '#f97316'
                isAbnormal = true
            } else if (normalizedValue > primaryMax) {
                status = 'High'
                statusLabel = 'High'
                statusColor = '#ef4444'
                isAbnormal = true
            } else {
                status = 'Optimal'
                statusLabel = 'Normal'
                statusColor = '#10b981'
                isAbnormal = false
            }
        } else if (primaryMax !== undefined) {
            // Upper bounded: e.g. Total Cholesterol < 200
            if (normalizedValue > primaryMax) {
                status = 'High'
                statusLabel = 'High'
                statusColor = '#ef4444'
                isAbnormal = true
            } else {
                status = 'Optimal'
                statusLabel = 'Normal'
                statusColor = '#10b981'
                isAbnormal = false
            }
        } else if (primaryMin !== undefined) {
            // Lower bounded: e.g. eGFR > 60
            if (normalizedValue < primaryMin) {
                status = 'Low'
                statusLabel = 'Low'
                statusColor = '#ef4444'
                isAbnormal = true
            } else {
                status = 'Optimal'
                statusLabel = 'Optimal'
                statusColor = '#10b981'
                isAbnormal = false
            }
        }
    }

    // 6. Secondary ABIM Comparison (Rule 2: Shown only when Lab Report flags value as abnormal)
    let secondaryAbimComparison: SecondaryAbimComparison | undefined
    if (primarySource === 'Lab Report' && isAbnormal && normalizedValue !== undefined && abimInterval) {
        let abimStatusText = 'Correct / Normal'
        let abimStatusColor = '#10b981'
        let abimIsAbnormal = false

        // Normalize value to ABIM unit if needed
        let abimVal = normalizedValue
        if (value !== undefined && abimInterval.unit && unit && abimInterval.unit.toLowerCase() !== unit.toLowerCase()) {
            try {
                const conv = convertUniversal(value, unit, abimInterval.unit, { biomarkerName })
                if (conv && !isNaN(conv.value)) {
                    abimVal = conv.value
                }
            } catch {
                // keep normalizedValue
            }
        }

        if (abimTiers && abimTiers.length > 0) {
            const match = abimTiers.find((t) =>
                (t.min === undefined || abimVal >= t.min) &&
                (t.max === undefined || abimVal <= t.max),
            )
            if (match) {
                abimStatusText = match.status === 'Optimal' || match.status === 'Normal' ? 'Correct / Normal' : match.label
                abimStatusColor = match.color
                abimIsAbnormal = match.status !== 'Optimal' && match.status !== 'Normal'
            }
        } else if (abimInterval.min !== undefined && abimInterval.max !== undefined) {
            if (abimVal < abimInterval.min) {
                abimStatusText = 'Low'
                abimStatusColor = '#f97316'
                abimIsAbnormal = true
            } else if (abimVal > abimInterval.max) {
                abimStatusText = 'High'
                abimStatusColor = '#ef4444'
                abimIsAbnormal = true
            } else {
                abimStatusText = 'Correct / Normal'
                abimStatusColor = '#10b981'
                abimIsAbnormal = false
            }
        } else if (abimInterval.max !== undefined) {
            if (abimVal > abimInterval.max) {
                abimStatusText = 'High'
                abimStatusColor = '#ef4444'
                abimIsAbnormal = true
            } else {
                abimStatusText = 'Correct / Normal'
                abimStatusColor = '#10b981'
                abimIsAbnormal = false
            }
        } else if (abimInterval.min !== undefined) {
            if (normalizedValue < abimInterval.min) {
                abimStatusText = 'Low'
                abimStatusColor = '#f97316'
                abimIsAbnormal = true
            } else {
                abimStatusText = 'Correct / Normal'
                abimStatusColor = '#10b981'
                abimIsAbnormal = false
            }
        }

        const demographicTag = userGender ? ` for adult ${userGender}${userAge ? ` (${userAge}y)` : ''}` : ''
        const abimBoundsStr = abimInterval.min !== undefined && abimInterval.max !== undefined
            ? `${abimInterval.min} – ${abimInterval.max} ${abimInterval.unit}`
            : abimInterval.max !== undefined
                ? `< ${abimInterval.max} ${abimInterval.unit}`
                : `> ${abimInterval.min} ${abimInterval.unit}`

        secondaryAbimComparison = {
            statusText: abimStatusText,
            statusColor: abimStatusColor,
            isAbnormal: abimIsAbnormal,
            rangeText: `${abimBoundsStr}${demographicTag}`,
            notes: abimIsAbnormal
                ? `Also evaluated as ${abimStatusText} according to ABIM reference.`
                : `Considered ${abimStatusText.toLowerCase()} according to ABIM reference for your profile (${abimBoundsStr}${demographicTag}).`,
        }
    }

    // 7. Dynamic Range Bar Segments & Marker Percentage (Unified for mini bar & modal)
    const val = normalizedValue ?? primaryMin ?? 50
    const segments: RangeSegment[] = []
    const ticks: RangeTick[] = []
    const labels: RangeLabel[] = []

    let scaleMin = 0
    let scaleMax = 100

    const isAbimCompatibleWithReport = !hasReportRange || (!primaryMax && !primaryMin) || !abimTiers || abimTiers.length < 2
        ? true
        : primaryMax !== undefined && abimTiers[0]?.max !== undefined
            ? Math.abs(primaryMax - (abimTiers[0].max + 1)) <= 10 || Math.abs(primaryMax - abimTiers[0].max) <= 10
            : true

    const barTiers = (primarySource === 'Lab Report' && reportTiers && reportTiers.length >= 2)
        ? reportTiers.map((t) => ({
            name: t.label,
            min: t.min,
            max: t.max,
            color: t.color,
            status: t.status,
        }))
        : (isAbimCompatibleWithReport && abimTiers && abimTiers.length >= 2 ? abimTiers : undefined)

    if (barTiers && barTiers.length >= 2) {
        // Multi-tier tiered bar (e.g. Triglycerides, Lipids, eGFR, Fasting Glucose)
        const count = barTiers.length
        const segWidth = 100 / count

        barTiers.forEach((tier, i) => {
            const startPct = i * segWidth
            segments.push({
                label: tier.name,
                color: tier.color,
                startPct,
                widthPct: segWidth,
                minVal: tier.min,
                maxVal: tier.max,
            })

            // Tick at division point
            if (tier.min !== undefined && i > 0) {
                ticks.push({
                    value: tier.min,
                    label: `${tier.min}`,
                    pct: startPct,
                })
            }

            labels.push({
                text: tier.name,
                color: tier.color,
                pct: startPct + segWidth / 2,
            })
        })

        // Find which tier the value falls into
        const tierIdx = barTiers.findIndex((t) =>
            (t.min === undefined || val >= t.min) &&
            (t.max === undefined || val <= t.max),
        )
        const activeIdx = tierIdx >= 0 ? tierIdx : count - 1
        const activeTier = barTiers[activeIdx]

        let insideRatio = 0.5
        if (activeTier.min !== undefined && activeTier.max !== undefined) {
            const span = activeTier.max - activeTier.min
            insideRatio = span > 0 ? (val - activeTier.min) / span : 0.5
        } else if (activeTier.min !== undefined) {
            insideRatio = Math.min(0.9, Math.max(0.1, (val - activeTier.min) / (activeTier.min * 0.5 || 10)))
        } else if (activeTier.max !== undefined) {
            insideRatio = Math.min(0.9, Math.max(0.1, val / activeTier.max))
        }

        const markerPct = Math.min(94, Math.max(6, activeIdx * segWidth + insideRatio * segWidth))

        const lastTier = barTiers[barTiers.length - 1]
        scaleMax = lastTier.min ? lastTier.min * 1.5 : (val > 0 ? val * 1.4 : 100)
        scaleMin = 0

        // Graph bands
        const graphBands = barTiers.map((t, idx) => ({
            color: t.color,
            bottomPct: (idx / count) * 100,
            heightPct: segWidth,
        }))

        const graphYAxis = [
            {
                value: Math.round(scaleMax),
                label: `${Math.round(scaleMax)} ${unit}`,
                bottomPct: 96,
            },
            ...ticks.map((t) => ({
                value: t.value,
                label: `${t.value}`,
                bottomPct: t.pct,
            })),
            {
                value: 0,
                label: '0',
                bottomPct: 4,
            },
        ]

        return {
            primarySource,
            rangeText: primaryRangeText,
            normalMin: primaryMin,
            normalMax: primaryMax,
            hasValue,
            status,
            statusLabel,
            statusColor,
            isAbnormal,
            secondaryAbimComparison,
            markerPct: hasValue ? markerPct : undefined,
            segments,
            ticks,
            labels,
            graphMin: 0,
            graphMax: scaleMax,
            graphYAxis,
            graphBands,
        }
    }

    if (primaryMin !== undefined && primaryMax !== undefined) {
        // Two-sided bounded scale (e.g. Creatinine 0.6 - 1.2, BUN 8 - 20, Na 136 - 145)
        const rangeSpan = primaryMax - primaryMin
        const buffer = rangeSpan * 0.4
        scaleMin = Math.max(0, primaryMin - buffer)
        scaleMax = primaryMax + buffer
        const totalSpan = scaleMax - scaleMin > 0 ? scaleMax - scaleMin : 1

        const lowWidthPct = Math.max(15, Math.min(35, ((primaryMin - scaleMin) / totalSpan) * 100))
        const highStartPct = Math.max(65, Math.min(85, ((primaryMax - scaleMin) / totalSpan) * 100))
        const normalWidthPct = highStartPct - lowWidthPct

        segments.push(
            {
                label: 'Low',
                color: '#fb923c',
                startPct: 0,
                widthPct: lowWidthPct,
                maxVal: primaryMin,
            },
            {
                label: 'Normal',
                color: '#4ade80',
                startPct: lowWidthPct,
                widthPct: normalWidthPct,
                minVal: primaryMin,
                maxVal: primaryMax,
            },
            {
                label: 'High',
                color: '#f87171',
                startPct: highStartPct,
                widthPct: 100 - highStartPct,
                minVal: primaryMax,
            },
        )

        ticks.push(
            {
                value: primaryMin,
                label: `${primaryMin}`,
                pct: lowWidthPct,
            },
            {
                value: primaryMax,
                label: `${primaryMax}`,
                pct: highStartPct,
            },
        )

        labels.push(
            {
                text: 'Low',
                color: '#ea580c',
                pct: lowWidthPct / 2,
            },
            {
                text: 'Normal',
                color: '#16a34a',
                pct: lowWidthPct + normalWidthPct / 2,
            },
            {
                text: 'High',
                color: '#dc2626',
                pct: highStartPct + (100 - highStartPct) / 2,
            },
        )

        const rawMarkerPct = ((val - scaleMin) / totalSpan) * 100
        const markerPct = Math.min(94, Math.max(6, rawMarkerPct))

        const graphYAxis = [
            {
                value: Math.round(scaleMax * 10) / 10,
                label: `${Math.round(scaleMax * 10) / 10} ${unit}`,
                bottomPct: 96,
            },
            {
                value: primaryMax,
                label: `${primaryMax}`,
                bottomPct: highStartPct,
            },
            {
                value: primaryMin,
                label: `${primaryMin}`,
                bottomPct: lowWidthPct,
            },
            {
                value: Math.round(scaleMin * 10) / 10,
                label: `${Math.round(scaleMin * 10) / 10}`,
                bottomPct: 4,
            },
        ]

        const graphBands = [
            {
                color: '#fee2e2',
                bottomPct: highStartPct,
                heightPct: 100 - highStartPct,
            },
            {
                color: '#dcfce7',
                bottomPct: lowWidthPct,
                heightPct: normalWidthPct,
            },
            {
                color: '#ffedd5',
                bottomPct: 0,
                heightPct: lowWidthPct,
            },
        ]

        return {
            primarySource,
            rangeText: primaryRangeText,
            normalMin: primaryMin,
            normalMax: primaryMax,
            hasValue,
            status,
            statusLabel,
            statusColor,
            isAbnormal,
            secondaryAbimComparison,
            markerPct: hasValue ? markerPct : undefined,
            segments,
            ticks,
            labels,
            graphMin: scaleMin,
            graphMax: scaleMax,
            graphYAxis,
            graphBands,
        }
    }

    if (primaryMax !== undefined) {
        // One-sided upper bounded (e.g. < 200, < 150)
        scaleMin = 0
        scaleMax = primaryMax * 1.5
        const normPct = 60

        segments.push(
            {
                label: 'Optimal',
                color: '#4ade80',
                startPct: 0,
                widthPct: normPct,
                maxVal: primaryMax,
            },
            {
                label: 'High',
                color: '#f87171',
                startPct: normPct,
                widthPct: 40,
                minVal: primaryMax,
            },
        )

        ticks.push({
            value: primaryMax,
            label: `${primaryMax}`,
            pct: normPct,
        })
        labels.push(
            {
                text: 'Optimal',
                color: '#16a34a',
                pct: normPct / 2,
            },
            {
                text: 'High',
                color: '#dc2626',
                pct: normPct + 20,
            },
        )

        const rawMarkerPct = val <= primaryMax
            ? (val / primaryMax) * normPct
            : normPct + Math.min(34, ((val - primaryMax) / (primaryMax * 0.5)) * 34)

        const markerPct = Math.min(94, Math.max(6, rawMarkerPct))

        const graphYAxis = [
            {
                value: Math.round(scaleMax),
                label: `${Math.round(scaleMax)} ${unit}`,
                bottomPct: 96,
            },
            {
                value: primaryMax,
                label: `${primaryMax}`,
                bottomPct: normPct,
            },
            {
                value: 0,
                label: '0',
                bottomPct: 4,
            },
        ]

        const graphBands = [
            {
                color: '#fee2e2',
                bottomPct: normPct,
                heightPct: 40,
            },
            {
                color: '#dcfce7',
                bottomPct: 0,
                heightPct: normPct,
            },
        ]

        return {
            primarySource,
            rangeText: primaryRangeText,
            normalMin: primaryMin,
            normalMax: primaryMax,
            hasValue,
            status,
            statusLabel,
            statusColor,
            isAbnormal,
            secondaryAbimComparison,
            markerPct: hasValue ? markerPct : undefined,
            segments,
            ticks,
            labels,
            graphMin: scaleMin,
            graphMax: scaleMax,
            graphYAxis,
            graphBands,
        }
    }

    if (primaryMin !== undefined) {
        // One-sided lower bounded (e.g. eGFR > 60, HDL > 40)
        scaleMin = 0
        scaleMax = primaryMin * 2
        const lowPct = 40

        segments.push(
            {
                label: 'Low',
                color: '#f87171',
                startPct: 0,
                widthPct: lowPct,
                maxVal: primaryMin,
            },
            {
                label: 'Optimal',
                color: '#4ade80',
                startPct: lowPct,
                widthPct: 60,
                minVal: primaryMin,
            },
        )

        ticks.push({
            value: primaryMin,
            label: `${primaryMin}`,
            pct: lowPct,
        })
        labels.push(
            {
                text: 'Low',
                color: '#dc2626',
                pct: lowPct / 2,
            },
            {
                text: 'Optimal',
                color: '#16a34a',
                pct: lowPct + 30,
            },
        )

        const rawMarkerPct = val < primaryMin
            ? (val / primaryMin) * lowPct
            : lowPct + Math.min(54, ((val - primaryMin) / primaryMin) * 54)

        const markerPct = Math.min(94, Math.max(6, rawMarkerPct))

        const graphYAxis = [
            {
                value: Math.round(scaleMax),
                label: `${Math.round(scaleMax)} ${unit}`,
                bottomPct: 96,
            },
            {
                value: primaryMin,
                label: `${primaryMin}`,
                bottomPct: lowPct,
            },
            {
                value: 0,
                label: '0',
                bottomPct: 4,
            },
        ]

        const graphBands = [
            {
                color: '#dcfce7',
                bottomPct: lowPct,
                heightPct: 60,
            },
            {
                color: '#fee2e2',
                bottomPct: 0,
                heightPct: lowPct,
            },
        ]

        return {
            primarySource,
            rangeText: primaryRangeText,
            normalMin: primaryMin,
            normalMax: primaryMax,
            hasValue,
            status,
            statusLabel,
            statusColor,
            isAbnormal,
            secondaryAbimComparison,
            markerPct: hasValue ? markerPct : undefined,
            segments,
            ticks,
            labels,
            graphMin: scaleMin,
            graphMax: scaleMax,
            graphYAxis,
            graphBands,
        }
    }

    // Fallback default scale
    return {
        primarySource,
        rangeText: primaryRangeText,
        hasValue,
        status: 'Normal',
        statusLabel: hasValue ? 'Normal' : 'No data',
        statusColor: hasValue ? '#10b981' : '#94a3b8',
        isAbnormal: false,
        markerPct: hasValue ? 50 : undefined,
        segments: [{
            label: 'Normal',
            color: '#4ade80',
            startPct: 0,
            widthPct: 100,
        }],
        ticks: [],
        labels: [{
            text: 'Normal',
            color: '#16a34a',
            pct: 50,
        }],
        graphMin: 0,
        graphMax: 100,
        graphYAxis: [
            {
                value: 100,
                label: `100 ${unit}`,
                bottomPct: 96,
            },
            {
                value: 0,
                label: '0',
                bottomPct: 4,
            },
        ],
        graphBands: [{
            color: '#dcfce7',
            bottomPct: 0,
            heightPct: 100,
        }],
    }
}
