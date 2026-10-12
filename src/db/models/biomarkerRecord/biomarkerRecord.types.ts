import { BaseEntity } from '@/db/types/base.types'
import { Range } from '@/db/types/range.types'

export interface BoundingBox {
    top: number
    left: number
    width: number
    height: number
}

export interface BiomarkerRecord extends BaseEntity {
    biomarkerId: string
    documentId?: string
    value?: number
    textValue?: string
    ucumCode: string
    originalName?: string
    originalValue?: number
    originalUnit?: string
    referenceRange?: Range
    referenceRangeString?: string
    notes?: string
    doctorNotes?: string
    approved: boolean
    latest: boolean
    order?: number
    page?: number
    boundingBox?: BoundingBox
}
