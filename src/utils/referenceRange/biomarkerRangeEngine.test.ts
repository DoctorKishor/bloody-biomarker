import { describe, it, expect } from 'vitest'

import { evaluateBiomarkerRange } from './biomarkerRangeEngine'

describe('biomarkerRangeEngine', () => {
    describe('Multi-tier Lab Report Ranges (e.g. Glucose Fasting)', () => {
        const fastingTiersRaw = 'NORMAL: Upto 110\nIMPAIRED: 111 to 125\nDIABETIC: More than 126'

        it('correctly classifies optimal/normal value and sets multi-tier segments', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Glucose - Fasting',
                value: 91,
                unit: 'mg/dL',
                reportRangeRaw: fastingTiersRaw,
                userGender: 'male',
                userAge: 35,
            })

            expect(result.status).toBe('Optimal')
            expect(result.statusLabel).toBe('Normal')
            expect(result.isAbnormal).toBe(false)
            expect(result.segments.length).toBe(3)
            expect(result.segments[0].label).toBe('Normal')
            expect(result.segments[1].label).toBe('Impaired Glucose')
            expect(result.segments[2].label).toBe('Diabetic')
            expect(result.secondaryAbimComparison).toBeUndefined()
        })

        it('correctly classifies impaired glucose as borderline high', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Glucose - Fasting',
                value: 118,
                unit: 'mg/dL',
                reportRangeRaw: fastingTiersRaw,
                userGender: 'male',
                userAge: 35,
            })

            expect(result.status).toBe('Borderline High')
            expect(result.statusLabel).toBe('Impaired Glucose')
            expect(result.isAbnormal).toBe(true)
            // Shows secondary ABIM comparison for abnormal lab report value
            expect(result.secondaryAbimComparison).toBeDefined()
        })

        it('correctly classifies diabetic glucose as high', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Glucose - Fasting',
                value: 145,
                unit: 'mg/dL',
                reportRangeRaw: fastingTiersRaw,
                userGender: 'male',
                userAge: 35,
            })

            expect(result.status).toBe('High')
            expect(result.statusLabel).toBe('Diabetic')
            expect(result.isAbnormal).toBe(true)
            expect(result.secondaryAbimComparison).toBeDefined()
        })

        it('correctly classifies hypoglycemic glucose as low', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Glucose - Fasting',
                value: 58,
                unit: 'mg/dL',
                reportRangeRaw: fastingTiersRaw,
                userGender: 'male',
                userAge: 35,
            })

            expect(result.status).toBe('Low')
            expect(result.statusLabel).toBe('Low')
            expect(result.isAbnormal).toBe(true)
        })
    })

    describe('Abnormal Report with Secondary ABIM Comparison', () => {
        it('evaluates Creatinine 0.69 as Low for male report 0.84 - 1.25 with secondary ABIM check', () => {
            const maleResult = evaluateBiomarkerRange({
                biomarkerName: 'Creatinine',
                value: 0.69,
                unit: 'mg/dL',
                reportRangeRaw: '0.84 - 1.25',
                userGender: 'male',
                userAge: 35,
            })

            expect(maleResult.primarySource).toBe('Lab Report')
            expect(maleResult.status).toBe('Low')
            expect(maleResult.isAbnormal).toBe(true)
            expect(maleResult.secondaryAbimComparison).toBeDefined()
            // ABIM male range is 0.70 - 1.30, so 0.69 is also slightly low
            expect(maleResult.secondaryAbimComparison?.statusText).toBe('Low')

            const femaleResult = evaluateBiomarkerRange({
                biomarkerName: 'Creatinine',
                value: 0.69,
                unit: 'mg/dL',
                reportRangeRaw: '0.84 - 1.25',
                userGender: 'female',
                userAge: 35,
            })

            // Primary source is still Lab Report -> abnormal (low)
            expect(femaleResult.status).toBe('Low')
            expect(femaleResult.isAbnormal).toBe(true)
            // But ABIM female range is 0.50 - 1.10, so 0.69 is Correct / Normal!
            expect(femaleResult.secondaryAbimComparison).toBeDefined()
            expect(femaleResult.secondaryAbimComparison?.statusText).toBe('Correct / Normal')
            expect(femaleResult.secondaryAbimComparison?.isAbnormal).toBe(false)
        })

        it('does not generate secondary ABIM comparison when report range is normal', () => {
            const normalResult = evaluateBiomarkerRange({
                biomarkerName: 'Creatinine',
                value: 1.05,
                unit: 'mg/dL',
                reportRangeRaw: '0.84 - 1.25',
                userGender: 'male',
                userAge: 35,
            })

            expect(normalResult.status).toBe('Optimal')
            expect(normalResult.isAbnormal).toBe(false)
            expect(normalResult.secondaryAbimComparison).toBeUndefined()
        })
    })

    describe('Fallback to ABIM by Age and Gender when no report range is provided', () => {
        it('uses male ABIM standard for uric acid fallback', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Uric Acid',
                value: 6.8,
                unit: 'mg/dL',
                userGender: 'male',
                userAge: 35,
            })

            expect(result.primarySource).toBe('ABIM 2026')
            // Male Uric Acid is 3.5 - 7.2 mg/dL -> 6.8 is Normal
            expect(result.status).toBe('Optimal')
            expect(result.isAbnormal).toBe(false)
        })

        it('uses female ABIM standard for uric acid fallback and flags 6.8 as High', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Uric Acid',
                value: 6.8,
                unit: 'mg/dL',
                userGender: 'female',
                userAge: 35,
            })

            expect(result.primarySource).toBe('ABIM 2026')
            // Female Uric Acid is 2.5 - 6.2 mg/dL -> 6.8 is High
            expect(result.status).toBe('High')
            expect(result.isAbnormal).toBe(true)
        })
    })

    describe('Identical bar metrics (segments and markerPct)', () => {
        it('produces valid multi-color segments and clamped marker percentages', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Creatinine',
                value: 0.95,
                unit: 'mg/dL',
                reportRangeRaw: '0.84 - 1.25',
                userGender: 'male',
            })

            expect(result.segments.length).toBeGreaterThanOrEqual(3)
            expect(result.markerPct).toBeGreaterThanOrEqual(6)
            expect(result.markerPct).toBeLessThanOrEqual(94)

            const totalWidth = result.segments.reduce((acc, s) => acc + s.widthPct, 0)
            expect(Math.round(totalWidth)).toBe(100)
        })

        it('handles biomarkers with no recorded data without fake status or marker', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'HbA1c',
                value: undefined,
                unit: '%',
                userGender: 'male',
                userAge: 35,
            })

            expect(result.primarySource).toBe('ABIM 2026')
            expect(result.hasValue).toBe(false)
            expect(result.statusLabel).toBe('No data')
            expect(result.markerPct).toBeUndefined()
            expect(result.isAbnormal).toBe(false)
            expect(result.secondaryAbimComparison).toBeUndefined()
            expect(result.segments.length).toBeGreaterThanOrEqual(3)
        })
    })

    describe('Cell Count Unit & Magnitude Normalization (e.g. Platelets, WBC)', () => {
        it('evaluates Platelets 249 in ×10³/µL against lab report 150000 - 400000 as Normal', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Platelets',
                value: 249,
                unit: '×10³/µL',
                reportRangeRaw: '150000 - 400000',
                userGender: 'male',
                userAge: 26,
            })

            expect(result.primarySource).toBe('Lab Report')
            expect(result.status).toBe('Optimal')
            expect(result.statusLabel).toBe('Normal')
            expect(result.isAbnormal).toBe(false)
            // Marker is safely in the Normal segment (between lowWidthPct and highStartPct)
            expect(result.markerPct).toBeGreaterThan(25)
            expect(result.markerPct).toBeLessThan(75)
            // Secondary ABIM check is not triggered as abnormal
            expect(result.secondaryAbimComparison).toBeUndefined()
        })

        it('evaluates Platelets 249 in 10^3/uL against ABIM fallback 150000 - 450000 /uL as Normal', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Platelets',
                value: 249,
                unit: '10^3/uL',
                userGender: 'male',
                userAge: 26,
            })

            expect(result.primarySource).toBe('ABIM 2026')
            expect(result.status).toBe('Optimal')
            expect(result.statusLabel).toBe('Normal')
            expect(result.isAbnormal).toBe(false)
        })

        it('evaluates WBC 7.5 in ×10³/µL against report range 4000 - 11000 as Normal', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'White Blood Cells',
                value: 7.5,
                unit: '×10³/µL',
                reportRangeRaw: '4000 - 11000',
                userGender: 'male',
                userAge: 26,
            })

            expect(result.status).toBe('Optimal')
            expect(result.statusLabel).toBe('Normal')
            expect(result.isAbnormal).toBe(false)
        })
    })

    describe('Lipid Panel Range Resolution (LDL vs Total Cholesterol)', () => {
        it('evaluates LDL Cholesterol 186 mg/dL with report < 100 as High (NOT False Desirable < 200)', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'LDL Cholesterol',
                value: 186,
                unit: 'mg/dL',
                reportRangeRaw: '< 100',
                userGender: 'male',
                userAge: 35,
            })

            expect(result.primarySource).toBe('Lab Report')
            expect(result.rangeText).toBe('< 100')
            expect(result.status).toBe('High')
            expect(result.statusLabel).toBe('High (160–189)')
            expect(result.isAbnormal).toBe(true)
            // Ticks must be from LDL tiers (100, 130, 160, 190), NOT Total Cholesterol (200, 240)
            const tickVals = result.ticks.map((t) => t.value)
            expect(tickVals).toEqual([100, 130, 160, 190])
            expect(tickVals).not.toContain(200)
            expect(tickVals).not.toContain(240)
        })

        it('evaluates Total Cholesterol 186 mg/dL with report < 200 as Desirable (< 200)', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'Total Cholesterol',
                value: 186,
                unit: 'mg/dL',
                reportRangeRaw: '< 200',
                userGender: 'male',
                userAge: 35,
            })

            expect(result.primarySource).toBe('Lab Report')
            expect(result.status).toBe('Optimal')
            expect(result.statusLabel).toBe('Desirable (< 200)')
            expect(result.isAbnormal).toBe(false)
            const tickVals = result.ticks.map((t) => t.value)
            expect(tickVals).toEqual([200, 240])
        })

        it('correctly maps HDL Cholesterol and does not match Total Cholesterol', () => {
            const result = evaluateBiomarkerRange({
                biomarkerName: 'HDL Cholesterol',
                value: 45,
                unit: 'mg/dL',
                userGender: 'male',
                userAge: 35,
            })

            expect(result.primarySource).toBe('ABIM 2026')
            expect(result.status).toBe('Normal')
            expect(result.statusLabel).toBe('Normal (40–59)')
            expect(result.isAbnormal).toBe(false)
        })
    })
})
