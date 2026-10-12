export interface BodySystemDef {
    id: string
    name: string
    icon: string
    description: string
    keywords: string[]
}

export const BODY_SYSTEMS: BodySystemDef[] = [
    {
        id: 'heart',
        name: 'Heart Health',
        icon: '❤️',
        description: 'Cardiovascular markers, lipid panel, and heart stress indicators',
        keywords: [
            'cholesterol', 'hdl', 'ldl', 'triglyceride', 'vldl', 'non-hdl',
            'apolipoprotein', 'troponin', 'blood pressure', 'homocysteine',
            'crp-hs', 'cardiac', 'lipoprotein',
        ],
    },
    {
        id: 'kidney',
        name: 'Kidney Function',
        icon: '🫘',
        description: 'Renal filtration rates, waste processing, and kidney balance',
        keywords: [
            'egfr', 'creatinine', 'urea', 'uric acid', 'bun', 'cystatin',
            'glomerular', 'microalbumin', 'urine protein',
        ],
    },
    {
        id: 'liver',
        name: 'Liver and Pancreas',
        icon: '🫁',
        description: 'Hepatic enzymes, bile production, and pancreatic digestive health',
        keywords: [
            'alt', 'ast', 'bilirubin', 'albumin', 'alkaline phosphatase',
            'alp', 'ggt', 'sgot', 'sgpt', 'amylase', 'lipase',
        ],
    },
    {
        id: 'metabolic',
        name: 'Metabolic Health',
        icon: '⚡',
        description: 'Blood sugar regulation, insulin response, and metabolic energy',
        keywords: [
            'glucose', 'sugar', 'hba1c', 'glycated', 'insulin', 'c-peptide',
            'lactate', 'ketone', 'homa-ir',
        ],
    },
    {
        id: 'blood',
        name: 'Blood Function',
        icon: '🩸',
        description: 'Red blood cells, oxygen delivery, and platelet coagulation',
        keywords: [
            'hemoglobin', 'rbc', 'hematocrit', 'mcv', 'mch', 'mchc',
            'platelet', 'rdw', 'inr', 'prothrombin', 'fibrinogen',
        ],
    },
    {
        id: 'immune',
        name: 'Immune Regulation',
        icon: '🛡️',
        description: 'White blood cell defense cells and infection resistance',
        keywords: [
            'wbc', 'white blood', 'leukocyte', 'neutrophil', 'lymphocyte',
            'monocyte', 'eosinophil', 'basophil', 'crp', 'esr',
        ],
    },
    {
        id: 'electrolytes',
        name: 'Electrolytes',
        icon: '💧',
        description: 'Hydration balance, mineral ions, and electrical signaling',
        keywords: [
            'sodium', 'potassium', 'chloride', 'calcium', 'magnesium',
            'phosphorus', 'bicarbonate', 'co2',
        ],
    },
    {
        id: 'thyroid',
        name: 'Thyroid Function',
        icon: '🦋',
        description: 'Endocrine metabolism regulation and thyroid hormone balance',
        keywords: [
            'tsh', 't3', 't4', 'free t3', 'free t4', 'thyroid', 'thyroglobulin',
        ],
    },
    {
        id: 'nutrients',
        name: 'Nutrients & Vitamins',
        icon: '🥗',
        description: 'Essential micronutrients, vitamin levels, and mineral stores',
        keywords: [
            'vitamin d', 'vitamin b12', 'iron', 'ferritin', 'folate',
            'transferrin', 'tibc', 'zinc',
        ],
    },
]

export const OTHER_SYSTEM: BodySystemDef = {
    id: 'other',
    name: 'Other Results',
    icon: '📋',
    description: 'General and specialized laboratory test parameters',
    keywords: [],
}

export const getBiomarkerSystem = (biomarkerName: string): BodySystemDef => {
    const cleanName = biomarkerName.toLowerCase().trim()
    for (const system of BODY_SYSTEMS) {
        if (system.keywords.some((kw) => cleanName.includes(kw))) {
            return system
        }
    }
    return OTHER_SYSTEM
}
