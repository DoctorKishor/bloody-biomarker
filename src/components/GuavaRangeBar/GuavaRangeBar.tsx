import { Range } from '@/db/types'
import {
    evaluateBiomarkerRange,
    BiomarkerHealthStatus,
    BiomarkerRangeEvaluation,
} from '@/utils/referenceRange/biomarkerRangeEngine'

export interface GuavaRangeBarProps {
    value?: number
    normalRange?: Range
    targetRange?: Range
    biomarkerName?: string
    unitLabel?: string
    reportRangeRaw?: string | Range
    userGender?: 'male' | 'female'
    userAge?: number
    className?: string
}

export type RangeStatus = BiomarkerHealthStatus

/**
 * Backward-compatible helper that delegates to the unified evaluation engine.
 */
export const calculateRangeStatus = (
    value?: number,
    normalRange?: Range,
    biomarkerName = '',
    unitLabel = '',
    userGender?: 'male' | 'female',
    userAge?: number,
): { status: string, color: string } => {
    if (value === undefined) {
        return {
            status: 'Unknown',
            color: '#94a3b8',
        }
    }

    const evaluation = evaluateBiomarkerRange({
        biomarkerName,
        value,
        unit: unitLabel,
        reportRangeRaw: normalRange,
        userGender,
        userAge,
    })

    return {
        status: evaluation.statusLabel,
        color: evaluation.statusColor,
    }
}

export const GuavaRangeBar = (props: GuavaRangeBarProps) => {
    const {
        value,
        normalRange,
        biomarkerName = '',
        unitLabel = '',
        reportRangeRaw,
        userGender,
        userAge,
        className,
    } = props

    if (value === undefined) {
        return null
    }

    const evaluation: BiomarkerRangeEvaluation = evaluateBiomarkerRange({
        biomarkerName,
        value,
        unit: unitLabel,
        reportRangeRaw: reportRangeRaw ?? normalRange,
        userGender,
        userAge,
    })

    const { statusLabel, statusColor, markerPct, segments } = evaluation

    return (
        <div className={`flex flex-col items-start gap-0.5 w-24 sm:w-28 select-none ${className ?? ''}`}>
            {/* Status Label (e.g. Optimal, Normal, Impaired, High, Low) */}
            <span
                className='text-[10px] font-semibold tracking-tight leading-none'
                style={{ color: statusColor }}
            >
                {statusLabel}
            </span>

            {/* Range Bar with identical multi-colored segments as modal */}
            <div className='relative w-full h-2 rounded-full overflow-visible flex items-center'>
                <div className='w-full h-1.5 rounded-full flex overflow-hidden shadow-2xs'>
                    {segments.map((seg, idx) => (
                        <div
                            key={idx}
                            className='h-full transition-all'
                            style={{
                                width: `${seg.widthPct}%`,
                                backgroundColor: seg.color,
                            }}
                            title={`${seg.label}`}
                        />
                    ))}
                </div>

                {/* Marker Dot with white center and colored border at identical percentage */}
                {markerPct !== undefined && (
                    <div
                        className='absolute w-2.5 h-2.5 rounded-full bg-white border-[2px] shadow-2xs transition-all pointer-events-none -translate-x-1/2'
                        style={{
                            left: `${markerPct}%`,
                            borderColor: statusColor,
                        }}
                    />
                )}
            </div>
        </div>
    )
}
