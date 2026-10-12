import { describe, it, expect } from 'vitest'

import { boundingBoxSchema, extractedBiomarkerSchema } from './openai.biomarkers'

describe('boundingBoxSchema', () => {
    it('parses standard percentage object { top, left, width, height }', () => {
        const input = {
            top: 46.2,
            left: 14.5,
            width: 42,
            height: 2.8,
        }
        const result = boundingBoxSchema.parse(input)
        expect(result).toEqual({
            top: 46.2,
            left: 14.5,
            width: 42,
            height: 2.8,
        })
    })

    it('parses and converts 0-1000 scale Gemini box_2d array [ymin, xmin, ymax, xmax]', () => {
        const input = [462, 145, 490, 565]
        const result = boundingBoxSchema.parse(input)
        expect(result).toEqual({
            top: 46.2,
            left: 14.5,
            width: 42,
            height: 2.8,
        })
    })

    it('parses and converts normalized 0-1 scale array', () => {
        const input = [0.462, 0.145, 0.490, 0.565]
        const result = boundingBoxSchema.parse(input)
        expect(result).toEqual({
            top: 46.2,
            left: 14.5,
            width: 42,
            height: 2.8,
        })
    })

    it('parses and converts ymin/xmin/ymax/xmax object', () => {
        const input = {
            ymin: 462,
            xmin: 145,
            ymax: 490,
            xmax: 565,
        }
        const result = boundingBoxSchema.parse(input)
        expect(result).toEqual({
            top: 46.2,
            left: 14.5,
            width: 42,
            height: 2.8,
        })
    })

    it('returns undefined for missing or null input', () => {
        expect(boundingBoxSchema.parse(undefined)).toBeUndefined()
        expect(boundingBoxSchema.parse(null)).toBeUndefined()
    })
})

describe('extractedBiomarkerSchema with boundingBox', () => {
    it('validates biomarker with boundingBox coordinates', () => {
        const input = {
            name: 'Glucose',
            originalName: 'Fasting Blood Glucose',
            value: 91,
            unit: 'mg/dL',
            ucumCode: 'mg/dL',
            order: 0,
            page: 1,
            boundingBox: {
                top: 46.2,
                left: 14.5,
                width: 42,
                height: 2.8,
            },
        }
        const result = extractedBiomarkerSchema.parse(input)
        expect(result.boundingBox).toEqual({
            top: 46.2,
            left: 14.5,
            width: 42,
            height: 2.8,
        })
    })
})
