import { Range } from '@/db/types'

export interface GuavaRangeBarProps {
    value?: number
    normalRange?: Range
    targetRange?: Range
    className?: string
}

export type RangeStatus = 'Optimal' | 'In range' | 'High' | 'Low' | 'Out of range' | 'Unknown'

export const calculateRangeStatus = (
    value?: number,
    normalRange?: Range,
): { status: RangeStatus, color: string } => {
    if (value === undefined || !normalRange) {
        return {
            status: 'Unknown',
            color: '#94a3b8',
        }
    }

    const { min, max } = normalRange

    if (min !== undefined && max !== undefined) {
        if (value < min) {
            return {
                status: 'Out of range',
                color: '#d97706',
            }
        }
        if (value > max) {
            return {
                status: 'High',
                color: '#ef4444',
            }
        }
        const midPoint = (min + max) / 2
        const distanceRatio = Math.abs(value - midPoint) / ((max - min) / 2)
        if (distanceRatio < 0.45) {
            return {
                status: 'Optimal',
                color: '#10b981',
            }
        }
        return {
            status: 'In range',
            color: '#3b82f6',
        }
    }

    if (max !== undefined) {
        if (value > max) {
            return {
                status: 'High',
                color: '#ef4444',
            }
        }
        return {
            status: 'Optimal',
            color: '#10b981',
        }
    }

    if (min !== undefined) {
        if (value < min) {
            return {
                status: 'Out of range',
                color: '#d97706',
            }
        }
        return {
            status: 'Optimal',
            color: '#10b981',
        }
    }

    return {
        status: 'Unknown',
        color: '#94a3b8',
    }
}

export const GuavaRangeBar = (props: GuavaRangeBarProps) => {
    const { value, normalRange, className } = props

    if (value === undefined) {
        return null
    }

    const { status, color } = calculateRangeStatus(value, normalRange)

    const min = normalRange?.min ?? 0
    const max = normalRange?.max ?? (value > 0 ? value * 1.5 : 100)

    // Calculate percentage position along scale
    const scaleSpan = max - min > 0 ? max - min : 1
    const buffer = scaleSpan * 0.25
    const totalMin = Math.max(0, min - buffer)
    const totalMax = max + buffer
    const totalSpan = totalMax - totalMin > 0 ? totalMax - totalMin : 1

    const clampedPercent = Math.min(94, Math.max(6, ((value - totalMin) / totalSpan) * 100))

    return (
        <div className={`flex flex-col items-start gap-0.5 w-24 sm:w-28 select-none ${className ?? ''}`}>
            {status !== 'Unknown' && (
                <span
                    className='text-[10px] font-semibold tracking-tight leading-none'
                    style={{ color }}
                >
                    {status}
                </span>
            )}

            <div className='relative w-full h-2 rounded-full overflow-visible flex items-center'>
                {/* Zone track */}
                <div className='w-full h-1 rounded-full flex overflow-hidden'>
                    {status === 'In range' ? (
                        <>
                            <div className='h-full bg-[#60a5fa]' style={{ width: '80%' }}/>
                            <div className='h-full bg-[#e2e8f0]' style={{ width: '20%' }}/>
                        </>
                    ) : status === 'Out of range' ? (
                        <>
                            <div className='h-full bg-[#fed7aa]' style={{ width: '45%' }}/>
                            <div className='h-full bg-[#60a5fa]' style={{ width: '55%' }}/>
                        </>
                    ) : (
                        <>
                            <div className='h-full bg-[#10b981]' style={{ width: '60%' }}/>
                            <div className='h-full bg-[#ef4444]' style={{ width: '40%' }}/>
                        </>
                    )}
                </div>

                {/* Marker Dot with white center and colored border matching Guava */}
                <div
                    className='absolute w-2.5 h-2.5 rounded-full bg-white border-[2px] shadow-2xs transition-all pointer-events-none'
                    style={{
                        left: `calc(${clampedPercent}% - 5px)`,
                        borderColor: color,
                    }}
                />
            </div>
        </div>
    )
}
