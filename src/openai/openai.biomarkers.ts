import { useCallback } from 'react'

import { ChatCompletion } from 'openai/resources'
import { z } from 'zod'

import { AiProvider, useAppSettings } from '@/db/models/appSettings'
import { useBiomarkerConfigs } from '@/db/models/biomarkerConfig'
import { useUnits } from '@/db/models/unit'
import { Range } from '@/db/types'
import { useGemini } from '@/gemini'
import { parseReferenceRangeInput } from '@/utils/referenceRange'
import { isAmbiguousUcumCode } from '@/utils/ucum'
import { getUnitType } from '@/utils/ucum/unitType'

import { useOpenAI } from './openai.client'

export interface BoundingBox {
    top: number
    left: number
    width: number
    height: number
}

export interface ExtractedBiomarker {
    id?: string
    biomarkerId?: string
    name?: string
    originalName?: string
    value?: number
    textValue?: string
    unit?: string | null
    ucumCode?: string | null
    referenceRange?: Partial<Range>
    normalRange?: Range
    targetRange?: Range
    order?: number
    page?: number | null
    boundingBox?: BoundingBox
}

export interface ExtractionResult {
    biomarkers: ExtractedBiomarker[]
    testDate?: string
    labName?: string
}

export const boundingBoxSchema = z.preprocess((val) => {
    if (!val) return undefined
    // Handle array format e.g. [ymin, xmin, ymax, xmax] or [top, left, width, height]
    if (Array.isArray(val) && val.length >= 4) {
        let [y0, x0, y1, x1] = val.map(Number)
        const maxVal = Math.max(y0, x0, y1, x1)
        if (maxVal > 100) {
            y0 = y0 / 10
            x0 = x0 / 10
            y1 = y1 / 10
            x1 = x1 / 10
        } else if (maxVal <= 1) {
            y0 = y0 * 100
            x0 = x0 * 100
            y1 = y1 * 100
            x1 = x1 * 100
        }
        return {
            top: Math.round(Math.min(y0, y1) * 10) / 10,
            left: Math.round(Math.min(x0, x1) * 10) / 10,
            width: Math.round(Math.abs(x1 - x0) * 10) / 10,
            height: Math.round(Math.abs(y1 - y0) * 10) / 10,
        }
    }
    // Handle object formats
    if (typeof val === 'object' && val !== null) {
        const v = val as Record<string, unknown>
        if ('ymin' in v && 'xmin' in v && 'ymax' in v && 'xmax' in v) {
            let y0 = Number(v.ymin)
            let x0 = Number(v.xmin)
            let y1 = Number(v.ymax)
            let x1 = Number(v.xmax)
            const maxVal = Math.max(y0, x0, y1, x1)
            if (maxVal > 100) {
                y0 = y0 / 10
                x0 = x0 / 10
                y1 = y1 / 10
                x1 = x1 / 10
            } else if (maxVal <= 1) {
                y0 = y0 * 100
                x0 = x0 * 100
                y1 = y1 * 100
                x1 = x1 * 100
            }
            return {
                top: Math.round(Math.min(y0, y1) * 10) / 10,
                left: Math.round(Math.min(x0, x1) * 10) / 10,
                width: Math.round(Math.abs(x1 - x0) * 10) / 10,
                height: Math.round(Math.abs(y1 - y0) * 10) / 10,
            }
        }
        if ('top' in v && 'left' in v) {
            let top = Number(v.top)
            let left = Number(v.left)
            let width = Number(v.width ?? 50)
            let height = Number(v.height ?? 3)
            const maxVal = Math.max(top, left, width, height)
            if (maxVal > 100) {
                top = top / 10
                left = left / 10
                width = width / 10
                height = height / 10
            } else if (maxVal <= 1) {
                top = top * 100
                left = left * 100
                width = width * 100
                height = height * 100
            }
            return {
                top: Math.round(top * 10) / 10,
                left: Math.round(left * 10) / 10,
                width: Math.round(width * 10) / 10,
                height: Math.round(height * 10) / 10,
            }
        }
    }
    return undefined
}, z.object({
    top: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number(),
}).optional().nullable().transform((val) => val ?? undefined))

const referenceRangeSchema = z.preprocess((val) => {
    return parseReferenceRangeInput(val)
}, z.object({
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
}).optional().nullable().transform((val) => {
    if (!val) return undefined
    return {
        min: val.min ?? undefined,
        max: val.max ?? undefined,
    }
}))

export const extractedBiomarkerSchema = z.object({
    name: z.string({
        message: 'name must be a string',
    }).min(1, 'name cannot be empty'),
    originalName: z.string({
        message: 'originalName must be a string',
    }).min(1, 'originalName cannot be empty'),
    value: z.number({
        message: 'value must be a number',
    }).optional(),
    textValue: z.string({
        message: 'textValue must be a string',
    }).optional(),
    unit: z.union([
        z.string().min(1, 'unit cannot be empty'),
        z.null(),
    ], {
        message: 'unit must be a string or null',
    }),
    ucumCode: z.string({
        message: 'ucumCode must be a string',
    }).nullable().optional().refine((val) => {
        if (!val) return true
        return !isAmbiguousUcumCode(val)
    }, {
        message: 'ucumCode cannot be an ambiguous value like a plain number (e.g., "1", "2"). Use proper UCUM codes or {name} format.',
    }),
    referenceRange: referenceRangeSchema.optional(),
    boundingBox: boundingBoxSchema.optional(),
    order: z.number({
        message: 'order must be a number',
    }),
    page: z.number({
        message: 'page must be a number',
    }).nullable().optional(),
}).strict().refine((data) => data.value !== undefined || data.textValue !== undefined, {
    message: 'Either value or textValue must be provided',
})

export const extractionResultSchema = z.object({
    biomarkers: z.array(extractedBiomarkerSchema).min(1, 'biomarkers array cannot be empty'),
    testDate: z.string({
        message: 'testDate must be a string',
    }).date('testDate must be a valid date in YYYY-MM-DD format').optional(),
    labName: z.string({
        message: 'labName must be a string',
    }).optional(),
}).strict()

const buildExtractionPrompt = (existingBiomarkers: Array<{
    name: string
    ucumCode?: string
    valueType?: string
    options?: string[]
}>) => `You are a medical data extraction assistant. Extract all biomarker/blood test results from the provided document image.

Return a JSON object with the following structure:
{
  "biomarkers": [
    {
      "name": "normalized biomarker name (use rules below)",
      "originalName": "exact biomarker name as it appears in the document",
      "value": numeric value (ONLY for numeric results, omit if result is text-based),
      "textValue": "text value for qualitative results (ONLY for text-based results - can be predefined values like 'Positive', 'Negative', 'Reactive', 'Detected', or any free-form text description, omit if result is numeric)",
      "unit": "unit label - for numeric: 'mg/dL', 'μIU/mL', etc. For text-based: descriptive title like 'Positive / Negative', 'Blood Type', or general description. Set null if not available.",
      "ucumCode": "UCUM code - for numeric: 'mg/dL', 'mmol/L', '[iU]/L', etc. For text-based: '{reactive}', '{positive}', '{detected}', or '{note}'. Set null if not available.",
      "referenceRange": {
        "min": minimum reference value or null (ONLY for numeric results),
        "max": maximum reference value or null (ONLY for numeric results)
      },
      "boundingBox": {
        "top": vertical coordinate as percentage of page height (0 to 100) where the row starts,
        "left": horizontal coordinate as percentage of page width (0 to 100) where the row starts,
        "width": width of row covering test name and value as percentage of page width (0 to 100),
        "height": height of row as percentage of page height (typically 2.0 to 4.5)
      },
      "order": order number starting from 0
    }
  ],
  "testDate": "overall test date in YYYY-MM-DD format (omit if not found)",
  "labName": "laboratory name (omit if not found)"
}

CRITICAL: Never include both "value" and "textValue" in the same biomarker - use ONLY one based on result type!

IMPORTANT: Preserve the order of biomarkers as they appear in the document. Assign sequential order numbers starting from 0.

Bounding Box Coordinate Rules (CRITICAL FOR FILE PREVIEW & AUDIT):
- boundingBox: For each biomarker row, provide normalized coordinates (percentages 0 to 100) on the document page:
  * top: distance from the top edge of the page image to the top of this parameter's printed line (0 to 100).
  * left: distance from the left edge of the page image to where this test name begins (0 to 100).
  * width: width of the row spanning across the parameter name, result value, and unit (typically 40 to 80).
  * height: height of the single parameter line (typically 2.0 to 4.0).


${existingBiomarkers.length > 0 ? `\nExisting biomarkers in the system (match these exactly, including ucumCode and valueType):\n${existingBiomarkers.map(b => {
        const ucum = b.ucumCode ?? 'N/A'
        const type = b.valueType ? ` | Type: ${b.valueType}` : ''
        const opts = b.options ? ` | Options: ${b.options.join(', ')}` : ''
        return `- ${b.name} | UCUM: ${ucum}${type}${opts}`
    }).join('\n')}\n` : ''}
Biomarker Naming Rules (STRICT):
 - originalName: extract as it appears in the document, then SANITIZE by removing formatting-related characters and artifacts (line breaks, tabs, bullet marks, dot leaders, page/column numbers) and normalizing whitespace to single spaces; preserve original language and casing after sanitization
  * If biomarker name appears in multiple languages, prioritize: English > Russian > other languages
  * Example: if document has "Glucose / Глюкоза / 葡萄糖", use originalName: "Glucose"
- name: normalized English standardized name following these rules:
  * ALWAYS use English names for biomarkers
  * Use standardized medical terminology:
    - Full names in Title Case: "Glucose", "Creatinine", "Vitamin D", "Vitamin B12"
    - Medical abbreviations in UPPERCASE: "TSH", "ALT", "AST", "HDL", "LDL", "WBC", "RBC"
    - Compound names: "Total Cholesterol", "HDL Cholesterol", "LDL Cholesterol", "White Blood Cells", "Red Blood Cells"
  * If the biomarker matches one from the existing list, use EXACTLY the same name and do not modify or normalize it. You should also match same tests written on different languages.
  * Normalize non-English names to their English equivalents:
    - "Глюкоза" → "Glucose"
    - "Гемоглобин" → "Hemoglobin"
    - "Холестерин общий" → "Total Cholesterol"
    - "Тиреотропный гормон" → "TSH"
  * Normalize variations to standard names:
    - "glucose", "GLUCOSE", "Glu" → "Glucose"
    - "cholesterol total", "Total chol" → "Total Cholesterol"
    - "hemoglobin", "HGB", "Hb" → "Hemoglobin"
    - "tsh", "Tsh" → "TSH"
  * If the biomarker belongs to a category/panel mentioned in the document (e.g., "Urinalysis", "Thyroid Panel") and the extracted name alone is not self-explanatory (e.g., "Color", "Appearance"), include the category in the normalized name to make it clear (e.g., "Urine Color", "Urine Appearance").

Examples of correct naming:
- "Глюкоза" → originalName: "Глюкоза", name: "Glucose"
- "glucose" → originalName: "glucose", name: "Glucose"
- "CHOL" → originalName: "CHOL", name: "Total Cholesterol"
- "HDL-C" → originalName: "HDL-C", name: "HDL Cholesterol"
- "tsh" → originalName: "tsh", name: "TSH"
- "Лейкоциты" → originalName: "Лейкоциты", name: "White Blood Cells"
- "Vit D" → originalName: "Vit D", name: "Vitamin D"

Urinalysis examples (make the name explicit by including the context):
- "pH" → originalName: "pH", name: "Urine pH"
- "Proteínas" → originalName: "Proteínas", name: "Urine Protein"

Unit and UCUM Rules (STRICT):
- unit: provide a short label that approximates how the unit appears in the document, but normalized to English and consistent casing/font (e.g., "mg/dL", "μIU/mL", "K/μL", "cells/μL"). Use "No Unit" for dimensionless numeric values. Use null if not available.
- ucumCode: provide the UCUM csCode string (case-sensitive), e.g., mg/dL, mmol/L, [iU]/L, ug/mL. If there is a unit but no specific UCUM code exists, use the format {anyName} (e.g., {appearance}, {blood_type}). For dimensionless numeric values, use "{no_unit}". Use null only if unit is also null.
- CRITICAL: NEVER use ambiguous ucumCode values that are just plain numbers (e.g., "1", "2", "3"). These are invalid and will be rejected. Always use proper UCUM codes or descriptive {name} format.
- Do not invent units. If there is a unit, there must be a corresponding ucumCode (either standard UCUM or {anyName} format).
- When creating a NEW unit (not present in the existing list), choose the unit label (title) most similar to the one used in the document, normalized to English and consistent casing.

Multiple Units for the Same Biomarker (IMPORTANT):
- If the same biomarker appears in complementary units in the same document (e.g., percentage and absolute count in a complete blood count), output SEPARATE entries for each unit. Use the same normalized biomarker name for all such entries, each with its own value, unit, ucumCode and referenceRange. Preserve the original order; do not merge or convert between units.
- Do NOT output two absolute values for the same biomarker in different absolute units (e.g., "x10^9/L" and "K/μL"). Output only ONE absolute entry; if both appear, keep the first occurrence in document order.
- If a biomarker exists in the provided existing list but that specific ucumCode is not listed for it, still output the result using the SAME biomarker name with the new ucumCode. This creates a new biomarker + unit (ucum) pair; except when both results are absolute for the same biomarker (keep only one absolute entry as above).
Example:
- "Neutrophils 29.7 %" and "Neutrophils 0.55 x10^9/L" → two entries:
  1) name: "Neutrophils", value: 29.7, unit: "%", ucumCode: "%"
  2) name: "Neutrophils", value: 0.55, unit: "x10^9/L", ucumCode: "10*9/L"

Examples of numeric values with unit vs ucumCode:
- Glucose 5.2 mmol/L → value: 5.2, unit: "mmol/L", ucumCode: "mmol/L"
- TSH 2.1 μIU/mL → value: 2.1, unit: "μIU/mL", ucumCode: "u[iU]/mL"
- WBC 6.0 K/μL → value: 6.0, unit: "K/μL", ucumCode: "10*3/uL"
- WBC 6.0 cells/μL → value: 6.0, unit: "cells/μL", ucumCode: "{cells}/uL"
- INR 1.08 (dimensionless) → value: 1.08, unit: "No Unit", ucumCode: "{no_unit}"

Examples of text-based values with unit vs ucumCode:
- HIV Antibody: Negative → textValue: "Negative", unit: "Positive / Negative", ucumCode: "{positive}"
- Blood Type: AB+ → textValue: "AB+", unit: "Blood Type", ucumCode: "{blood_type}"
- Hepatitis B Surface Antigen: Reactive → textValue: "Reactive", unit: "Reactive / Non-Reactive", ucumCode: "{reactive}"
- Urine Appearance: Clear yellow → textValue: "Clear yellow", unit: "Appearance", ucumCode: "{appearance}"
- Comment: Sample hemolyzed → textValue: "Sample hemolyzed", unit: "Note", ucumCode: "{note}"

Text-Based Values Rules (CRITICAL):
For qualitative (non-numeric) results, use "textValue" field with appropriate ucumCode:

**Key Rules:**
- unit describes the analysis TYPE, not the value itself
- Never mix numeric values with text-based ucumCodes
- Match existing biomarker ucumCode when available
- Try to use specific descriptive ucumCodes that match the analysis type (e.g., {blood_type}, {appearance}, {color})
- Use unit: "Note" with ucumCode: "{note}" for TEXT-BASED results ONLY as a fallback when no appropriate specific ucumCode can be determined
- ALWAYS normalize textValue to English (e.g., "Отрицательный" → "Negative", "Положительный" → "Positive", "Обнаружено" → "Detected")

Reference Range Rules (CRITICAL - ALWAYS EXTRACT FOR NUMERIC RESULTS):
- referenceRange must ALWAYS be extracted for numeric biomarkers when reference ranges or normal values are provided on the document.
- Format: { "min": number or null, "max": number or null }
- Handling MULTIPLE / CATEGORIZED reference ranges (e.g. Normal, Impaired, Diabetic, Desirable, Borderline, Optimal, High, Low):
  * When a document presents multiple tiered categories, ALWAYS extract the NORMAL / HEALTHY / DESIRABLE / OPTIMAL / IDEAL / LOW RISK range into referenceRange!
  * Do NOT extract the impaired, diabetic, or high-risk thresholds as the reference range.
  * Real-world examples of multiple categorized ranges:
    - "NORMAL: Upto 110 \n IMPAIRED: 111 to 125 \n DIABETIC: More than 126"
      -> Extract NORMAL: { "min": null, "max": 110 }
    - "NORMAL: Upto 140 \n IMPAIRED: 141 to 200 \n DIABETIC: More than 200"
      -> Extract NORMAL: { "min": null, "max": 140 }
    - "BORDERLINE HIGH: - 200- 239 \n DESIRABLE: - Upto 200 \n HIGH: - >240"
      -> Extract DESIRABLE: { "min": null, "max": 200 }
    - "Best : 60 and above, Normal : 40 to 59 (But Higher the Better), Low : Below 40"
      -> Extract NORMAL: { "min": 40, "max": 59 }
    - "Lowrisk:Below 100, Ideal:Below 130, BorderlineLow:131 -159, BorderlineHigh:160-189, High:190-219, VeryHigh:>220"
      -> Extract IDEAL: { "min": null, "max": 130 }
    - "Optimal : Below 100, Near Optimal / Above Optimal : 100 to 129, Borderline High : 130 to 159, High : 160 to 189, Very High : 190 and above"
      -> Extract OPTIMAL: { "min": null, "max": 100 }
- One-sided reference ranges:
  * "Upto 110", "Below 150", "< 150", "<= 150", "Less than 150" -> { "min": null, "max": 150 }
  * "More than 60", "> 60", ">= 60", "60 and above", "Above 60" -> { "min": 60, "max": null }
- Standard two-sided ranges:
  * "17 - 43" -> { "min": 17, "max": 43 }
  * "0.84 - 1.25" -> { "min": 0.84, "max": 1.25 }
  * "3.5 - 7.2" -> { "min": 3.5, "max": 7.2 }
- Only set referenceRange to null if the test result is qualitative/text-based or if no reference range is provided in the document.

General Rules:
- Clean the extracted text from obviously incorrect and unnecessary symbols (e.g., garbage characters, formatting artifacts, stray symbols)
- For numeric biomarker values: use "value" field (number type)
- For qualitative/text-based results: use "textValue" field (string type) and appropriate ucumCode (see Text-Based Values Rules above)
- Either "value" or "textValue" must be provided, but NEVER both
- Include the unit of measurement for each biomarker (for text-based results, unit describes the analysis type)
- Include reference ranges ONLY for numeric values (omit for text-based results)
- Parse dates in ISO format (YYYY-MM-DD)
- Extract laboratory name if mentioned
- If testDate or labName are not found, omit them from the response
- Use null instead of empty strings for unit, ucumCode, or referenceRange values when not available
- Return only valid JSON, no additional text`

export const useExtractBiomarkers = () => {
    const { client: openaiClient, hasApiKey: hasOpenaiKey, loading: openaiLoading } = useOpenAI()
    const { client: geminiClient, hasApiKey: hasGeminiKey, loading: geminiLoading } = useGemini()
    const { data: settings } = useAppSettings()
    const { data: configs } = useBiomarkerConfigs()
    const { data: units } = useUnits()

    const currentSettings = settings[0]
    const provider: AiProvider = currentSettings?.aiProvider ?? (currentSettings?.geminiApiKey ? 'gemini' : 'openai')
    const hasApiKey = provider === 'gemini' ? hasGeminiKey : hasOpenaiKey
    const loading = openaiLoading || geminiLoading

    const extractBiomarkers = useCallback(async (imageBase64: string, followUpMessage?: string, model?: string): Promise<ExtractionResult | null> => {
        const existingBiomarkers = configs.map(c => {
            const unit = units.find(u => u.ucumCode === c.ucumCode)
            return {
                name: c.name,
                ucumCode: c.ucumCode,
                valueType: unit?.valueType,
                options: unit?.options,
                unitType: unit?.unitType ?? (c.ucumCode ? getUnitType(c.ucumCode) : undefined),
            }
        })
        const prompt = buildExtractionPrompt(existingBiomarkers)

        if (provider === 'gemini') {
            if (!geminiClient) return null

            // Strip "data:image/png;base64," header if present for inlineData
            const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '')

            const geminiResponse = await geminiClient.models.generateContent({
                model: model ?? currentSettings?.geminiModel ?? currentSettings?.aiModel ?? 'gemini-3.8-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: prompt,
                            },
                            {
                                text: followUpMessage
                                    ? `Extract biomarkers from this document image following the rules and JSON schema strictly.\nAdditional user request:\n${followUpMessage}`
                                    : 'Extract biomarkers from this document image. Adhere strictly to the biomarker rules and JSON schema.',
                            },
                            {
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: base64Data,
                                },
                            },
                        ],
                    },
                ],
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                },
            })

            const content = geminiResponse.text
            if (!content) return null

            const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
            const result = JSON.parse(cleaned) as ExtractionResult
            return result
        }

        if (!openaiClient) return null

        const messages = [
            {
                role: 'system' as const,
                content: prompt,
            },
            {
                role: 'user' as const,
                content: [
                    {
                        type: 'text' as const,
                        text: 'Extract biomarkers from this image.',
                    },
                    {
                        type: 'image_url' as const,
                        image_url: {
                            url: imageBase64,
                        },
                    },
                ],
            },
        ]

        if (followUpMessage) {
            messages.push({
                role: 'user' as const,
                content: [
                    {
                        type: 'text' as const,
                        text: followUpMessage,
                    },
                ],
            })
        }

        const completion = await openaiClient.chat.completions.create({
            model: model ?? currentSettings?.aiModel ?? 'gpt-5.4',
            messages: messages as never,
            reasoning_effort: 'low',
            temperature: 1,
            response_format: { type: 'json_object' },
            stream: false,
        }) as ChatCompletion

        const content = completion.choices[0]?.message.content
        if (!content) return null

        const result = JSON.parse(content) as ExtractionResult
        return result
    }, [provider, geminiClient, openaiClient, currentSettings?.geminiModel, currentSettings?.aiModel, configs, units])

    return {
        extractBiomarkers,
        hasApiKey,
        loading,
        provider,
    }
}
