import { describe, expect, it } from 'vitest'

import { parseReferenceRangeInput, parseReferenceRangeString } from './parseReferenceRange'

describe('parseReferenceRange', () => {
    it('parses standard two-sided numeric ranges', () => {
        expect(parseReferenceRangeString('17 - 43')).toEqual({
            min: 17,
            max: 43,
        })
        expect(parseReferenceRangeString('0.84 - 1.25')).toEqual({
            min: 0.84,
            max: 1.25,
        })
        expect(parseReferenceRangeString('3.5-7.2')).toEqual({
            min: 3.5,
            max: 7.2,
        })
        expect(parseReferenceRangeString('40 to 59')).toEqual({
            min: 40,
            max: 59,
        })
    })

    it('parses one-sided upper and lower bounds', () => {
        expect(parseReferenceRangeString('Upto 110')).toEqual({
            min: undefined,
            max: 110,
        })
        expect(parseReferenceRangeString('Below 150')).toEqual({
            min: undefined,
            max: 150,
        })
        expect(parseReferenceRangeString('< 200')).toEqual({
            min: undefined,
            max: 200,
        })
        expect(parseReferenceRangeString('More than 60')).toEqual({
            min: 60,
            max: undefined,
        })
        expect(parseReferenceRangeString('> 60')).toEqual({
            min: 60,
            max: undefined,
        })
        expect(parseReferenceRangeString('60 and above')).toEqual({
            min: 60,
            max: undefined,
        })
    })

    it('parses multi-tier categorized ranges from user lab test report', () => {
        // Fasting Glucose
        const fasting = 'NORMAL: Upto 110\nIMPAIRED: 111 to 125\nDIABETIC: More than 126'
        expect(parseReferenceRangeString(fasting)).toEqual({
            min: undefined,
            max: 110,
        })

        // Post Prandial Glucose
        const pp = 'NORMAL: Upto 140\nIMPAIRED: 141 to 200\nDIABETIC: More than 200'
        expect(parseReferenceRangeString(pp)).toEqual({
            min: undefined,
            max: 140,
        })

        // Cholesterol Total
        const chol = 'BORDERLINE HIGH: - 200- 239\nDESIRABLE: - Upto 200\nHIGH: - >240'
        expect(parseReferenceRangeString(chol)).toEqual({
            min: undefined,
            max: 200,
        })

        // HDL Cholesterol
        const hdl = 'Best : 60 and above,\nNormal : 40 to 59 (But Higher the Better),\nLow : Below 40'
        expect(parseReferenceRangeString(hdl)).toEqual({
            min: 40,
            max: 59,
        })

        // Non-HDL Cholesterol
        const nonHdl = 'Lowrisk:Below 100,\nIdeal:Below 130,BorderlineLow:131 -159,\nBorderlineHigh:160-189,\nHigh:190-219,VeryHigh:>220'
        expect(parseReferenceRangeString(nonHdl)).toEqual({
            min: undefined,
            max: 130,
        })

        // LDL Cholesterol
        const ldl = 'Optimal : Below 100,\nNear Optimal / Above Optimal : 100 to 129 ,\nBorderline High : 130 to 159 ,\nHigh : 160 to 189 ,\nVery High : 190 and above'
        expect(parseReferenceRangeString(ldl)).toEqual({
            min: undefined,
            max: 100,
        })
    })

    it('parses object inputs with numbers or strings', () => {
        expect(parseReferenceRangeInput({
            min: 10,
            max: 50,
        })).toEqual({
            min: 10,
            max: 50,
        })
        expect(parseReferenceRangeInput({
            min: '10',
            max: '50',
        })).toEqual({
            min: 10,
            max: 50,
        })
        expect(parseReferenceRangeInput({
            min: null,
            max: 110,
        })).toEqual({
            min: undefined,
            max: 110,
        })
        expect(parseReferenceRangeInput({
            text: 'NORMAL: Upto 110',
        })).toEqual({
            min: undefined,
            max: 110,
        })
        expect(parseReferenceRangeInput(null)).toBeUndefined()
    })
})
