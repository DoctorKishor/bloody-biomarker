const normalizeUnit = (ucum: string): string => {
    return ucum
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/µ/g, 'u')
        .replace(/μ/g, 'u')
        .replace(/×/g, 'x')
}

export const unitNormalizationMap: Record<string, string> = {
    'ug/l': 'ug/L',
    'ug/ml': 'ug/mL',
    'ug/dl': 'ug/dL',
    'umol/l': 'umol/L',
    'm[iu]/l': 'mIU/L',
    'miu/ml': 'mIU/mL',
    'm[iu]/ml': 'mIU/mL',
    'miu/l': 'mIU/L',
    '[iu]/l': '[IU]/L',
    // Cell concentrations & Complete Blood Count unit variations
    '10*3/ul': '10*3/uL',
    '10^3/ul': '10*3/uL',
    '10^3/u': '10*3/uL',
    '10*3/u': '10*3/uL',
    'x10^3/ul': '10*3/uL',
    'x10^3/u': '10*3/uL',
    'x10*3/ul': '10*3/uL',
    '10*9/l': '10*9/L',
    '10^9/l': '10*9/L',
    'x10^9/l': '10*9/L',
    '10*6/ul': '10*6/uL',
    '10^6/ul': '10*6/uL',
    'x10^6/ul': '10*6/uL',
    '10*12/l': '10*12/L',
    '10^12/l': '10*12/L',
    'x10^12/l': '10*12/L',
    'cells/ul': '/uL',
    'cells/u': '/uL',
    '/cumm': '/uL',
    'cells/cumm': '/uL',
    '/cu.mm': '/uL',
    'cells/cu.mm': '/uL',
    '/mm3': '/uL',
    'cells/mm3': '/uL',
    '/mcl': '/uL',
    'cells/mcl': '/uL',
    'k/ul': '10*3/uL',
    'k/u': '10*3/uL',
    'k/mcl': '10*3/uL',
    'k/cumm': '10*3/uL',
    'thous/mcl': '10*3/uL',
    'thous/ul': '10*3/uL',
    'm/ul': '10*6/uL',
    'm/u': '10*6/uL',
    'm/mcl': '10*6/uL',
    'mil/ul': '10*6/uL',
    'mil/mcl': '10*6/uL',
    'mill/ul': '10*6/uL',
    'million/cumm': '10*6/uL',
    'millions/cumm': '10*6/uL',
}

export const normalizeUnitForUcum = (ucum: string): string => {
    if (!ucum) return ''
    const normalized = normalizeUnit(ucum)

    if (unitNormalizationMap[normalized]) {
        return unitNormalizationMap[normalized]
    }

    // Thousands cell counts: 10^3, x10^3, 10*3, 10³, k/, thous/
    if (/^(?:(?:x|\*|)?10(?:\^3|\*3|³)|k|thous)\/(?:u|ul|mcl|cumm|cu\.mm|mm3)$/i.test(normalized)) {
        return '10*3/uL'
    }

    // 10^9 / L cell counts: 10^9/L, x10^9/L, 10*9/L, 10⁹/L
    if (/^(?:x|\*|)?10(?:\^9|\*9|⁹)\/l$/i.test(normalized)) {
        return '10*9/L'
    }

    // Millions cell counts: 10^6, x10^6, 10*6, 10⁶, m/, mil/, million/
    if (/^(?:(?:x|\*|)?10(?:\^6|\*6|⁶)|m|mil|million|millions)\/(?:u|ul|mcl|cumm|cu\.mm|mm3)$/i.test(normalized)) {
        return '10*6/uL'
    }

    // 10^12 / L cell counts: 10^12/L, x10^12/L, 10*12/L, 10¹²/L
    if (/^(?:x|\*|)?10(?:\^12|\*12|¹²)\/l$/i.test(normalized)) {
        return '10*12/L'
    }

    // Base volume cell counts: /uL, /mcL, /cumm, /mm3, cells/uL, cells/cumm
    if (/^(?:cells?\/|\/)?(?:u|ul|mcl|cumm|cu\.mm|mm3)$/i.test(normalized)) {
        return '/uL'
    }

    return unitNormalizationMap[normalized] ?? normalized
}
