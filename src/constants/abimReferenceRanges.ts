/**
 * ABIM Laboratory Test Reference Ranges — January 2026
 * Comprehensive standard reference ranges for clinical laboratory medicine.
 */

export interface AbimRangeInterval {
    min?: number
    max?: number
    unit: string
    description?: string
}

export interface AbimTier {
    name: string
    label: string
    status: 'Optimal' | 'Normal' | 'Borderline High' | 'High' | 'Very High' | 'Low' | 'Out of range'
    color: string
    min?: number
    max?: number
}

export interface AbimBiomarkerStandard {
    canonicalName: string
    aliases: string[]
    standardUnit: string
    category?: string
    // Demographic-specific standard ranges
    general?: AbimRangeInterval
    male?: AbimRangeInterval
    female?: AbimRangeInterval
    pediatric?: AbimRangeInterval
    // Multi-tiered clinical categories (e.g. Lipids, Glucose)
    tiers?: AbimTier[]
    maleTiers?: AbimTier[]
    femaleTiers?: AbimTier[]
    // Interpretations & educational notes
    source: string
}

export const ABIM_REFERENCE_RANGES_2026: Record<string, AbimBiomarkerStandard> = {
    // -------------------------------------------------------------------------
    // Glucose & Metabolic Markers
    // -------------------------------------------------------------------------
    glucose_fasting: {
        canonicalName: 'Glucose, plasma (fasting)',
        aliases: [
            'glucose',
            'fasting glucose',
            'blood glucose',
            'blood sugar',
            'glucose - fasting',
            'fasting blood sugar',
            'fbs',
        ],
        standardUnit: 'mg/dL',
        general: {
            min: 70,
            max: 99,
            unit: 'mg/dL',
        },
        tiers: [
            {
                name: 'Optimal',
                label: 'Normal',
                status: 'Optimal',
                color: '#10b981',
                min: 70,
                max: 99,
            },
            {
                name: 'Impaired',
                label: 'Impaired (Prediabetes)',
                status: 'Borderline High',
                color: '#f59e0b',
                min: 100,
                max: 125,
            },
            {
                name: 'Diabetic',
                label: 'Diabetic',
                status: 'High',
                color: '#ef4444',
                min: 126,
            },
        ],
        source: 'ABIM January 2026 / ADA',
    },
    glucose_post_prandial: {
        canonicalName: 'Glucose, post prandial',
        aliases: [
            'post prandial glucose',
            'glucose - post prandial',
            'ppbs',
            'postprandial glucose',
        ],
        standardUnit: 'mg/dL',
        general: {
            min: 70,
            max: 140,
            unit: 'mg/dL',
        },
        tiers: [
            {
                name: 'Normal',
                label: 'Normal',
                status: 'Optimal',
                color: '#10b981',
                max: 140,
            },
            {
                name: 'Impaired',
                label: 'Impaired',
                status: 'Borderline High',
                color: '#f59e0b',
                min: 141,
                max: 199,
            },
            {
                name: 'Diabetic',
                label: 'Diabetic',
                status: 'High',
                color: '#ef4444',
                min: 200,
            },
        ],
        source: 'ABIM January 2026 / ADA',
    },
    hemoglobin_a1c: {
        canonicalName: 'Hemoglobin A1C',
        aliases: ['hba1c', 'hb a1c', 'hemoglobin a1c', 'glycated hemoglobin', 'glycosylated hemoglobin', 'a1c'],
        standardUnit: '%',
        general: {
            min: 4.0,
            max: 5.6,
            unit: '%',
        },
        tiers: [
            {
                name: 'Normal',
                label: 'Normal (< 5.7%)',
                status: 'Optimal',
                color: '#10b981',
                min: 4.0,
                max: 5.6,
            },
            {
                name: 'Prediabetes',
                label: 'Prediabetes (5.7–6.4%)',
                status: 'Borderline High',
                color: '#f59e0b',
                min: 5.7,
                max: 6.4,
            },
            {
                name: 'Diabetes',
                label: 'Diabetes (≥ 6.5%)',
                status: 'High',
                color: '#ef4444',
                min: 6.5,
            },
        ],
        source: 'ABIM January 2026',
    },

    // -------------------------------------------------------------------------
    // Renal / Kidney Function
    // -------------------------------------------------------------------------
    creatinine: {
        canonicalName: 'Creatinine, serum',
        aliases: ['creatinine', 'serum creatinine', 's. creatinine'],
        standardUnit: 'mg/dL',
        general: {
            min: 0.50,
            max: 1.30,
            unit: 'mg/dL',
        },
        female: {
            min: 0.50,
            max: 1.10,
            unit: 'mg/dL',
        },
        male: {
            min: 0.70,
            max: 1.30,
            unit: 'mg/dL',
        },
        source: 'ABIM January 2026',
    },
    egfr: {
        canonicalName: 'Creatinine clearance / eGFR',
        aliases: [
            'egfr',
            'creatinine clearance',
            'estimated gfr',
            'gfr',
            'glomerular filtration rate',
        ],
        standardUnit: 'mL/min/1.73m2',
        general: {
            min: 60,
            unit: 'mL/min/1.73m2',
        },
        tiers: [
            {
                name: 'Severely Decreased',
                label: 'Kidney Failure (< 15)',
                status: 'Very High',
                color: '#b91c1c',
                max: 14.9,
            },
            {
                name: 'Severely Low',
                label: 'Severely Low (15–29)',
                status: 'High',
                color: '#ef4444',
                min: 15,
                max: 29.9,
            },
            {
                name: 'Moderately Low',
                label: 'Moderately Low (30–59)',
                status: 'Borderline High',
                color: '#f97316',
                min: 30,
                max: 59.9,
            },
            {
                name: 'Mildly Decreased',
                label: 'Mildly Low (60–89)',
                status: 'Normal',
                color: '#86efac',
                min: 60,
                max: 89.9,
            },
            {
                name: 'Optimal',
                label: 'Optimal / Normal (≥ 90)',
                status: 'Optimal',
                color: '#10b981',
                min: 90,
            },
        ],
        source: 'ABIM January 2026 / KDIGO',
    },
    blood_urea_nitrogen: {
        canonicalName: 'Blood urea nitrogen (BUN)',
        aliases: ['bun', 'blood urea nitrogen', 'urea nitrogen', 'blood urea', 'urea'],
        standardUnit: 'mg/dL',
        general: {
            min: 8,
            max: 20,
            unit: 'mg/dL',
        },
        source: 'ABIM January 2026',
    },
    uric_acid: {
        canonicalName: 'Uric acid, serum',
        aliases: ['uric acid', 'serum uric acid'],
        standardUnit: 'mg/dL',
        general: {
            min: 3.0,
            max: 7.0,
            unit: 'mg/dL',
        },
        female: {
            min: 2.5,
            max: 6.2,
            unit: 'mg/dL',
        },
        male: {
            min: 3.5,
            max: 7.2,
            unit: 'mg/dL',
        },
        source: 'ABIM January 2026',
    },

    // -------------------------------------------------------------------------
    // Lipid Panel
    // -------------------------------------------------------------------------
    total_cholesterol: {
        canonicalName: 'Cholesterol, serum (Total)',
        aliases: ['cholesterol', 'total cholesterol', 'serum cholesterol'],
        standardUnit: 'mg/dL',
        general: {
            max: 199,
            unit: 'mg/dL',
        },
        tiers: [
            {
                name: 'Desirable',
                label: 'Desirable (< 200)',
                status: 'Optimal',
                color: '#10b981',
                max: 199,
            },
            {
                name: 'Borderline High',
                label: 'Borderline High (200–239)',
                status: 'Borderline High',
                color: '#f97316',
                min: 200,
                max: 239,
            },
            {
                name: 'High',
                label: 'High (≥ 240)',
                status: 'High',
                color: '#ef4444',
                min: 240,
            },
        ],
        source: 'ABIM January 2026 / ATP III',
    },
    triglycerides: {
        canonicalName: 'Triglycerides, serum (fasting)',
        aliases: ['triglycerides', 'serum triglycerides', 'tg'],
        standardUnit: 'mg/dL',
        general: {
            max: 149,
            unit: 'mg/dL',
        },
        tiers: [
            {
                name: 'Optimal',
                label: 'Optimal (< 100)',
                status: 'Optimal',
                color: '#10b981',
                max: 99,
            },
            {
                name: 'Normal',
                label: 'Normal (100–149)',
                status: 'Normal',
                color: '#86efac',
                min: 100,
                max: 149,
            },
            {
                name: 'Borderline High',
                label: 'Borderline High (150–199)',
                status: 'Borderline High',
                color: '#fb923c',
                min: 150,
                max: 199,
            },
            {
                name: 'High',
                label: 'High (200–499)',
                status: 'High',
                color: '#f87171',
                min: 200,
                max: 499,
            },
            {
                name: 'Very High',
                label: 'Very High (≥ 500)',
                status: 'Very High',
                color: '#dc2626',
                min: 500,
            },
        ],
        source: 'ABIM January 2026',
    },
    hdl_cholesterol: {
        canonicalName: 'High-density lipoprotein (HDL)',
        aliases: ['hdl', 'hdl cholesterol', 'high-density lipoprotein'],
        standardUnit: 'mg/dL',
        general: {
            min: 40,
            unit: 'mg/dL',
        },
        female: {
            min: 50,
            unit: 'mg/dL',
        },
        male: {
            min: 40,
            unit: 'mg/dL',
        },
        tiers: [
            {
                name: 'Low',
                label: 'Low (< 40)',
                status: 'Low',
                color: '#ef4444',
                max: 39,
            },
            {
                name: 'Normal',
                label: 'Normal (40–59)',
                status: 'Normal',
                color: '#86efac',
                min: 40,
                max: 59,
            },
            {
                name: 'Optimal',
                label: 'Optimal (≥ 60)',
                status: 'Optimal',
                color: '#10b981',
                min: 60,
            },
        ],
        femaleTiers: [
            {
                name: 'Low',
                label: 'Low (< 50)',
                status: 'Low',
                color: '#ef4444',
                max: 49,
            },
            {
                name: 'Normal',
                label: 'Normal (50–59)',
                status: 'Normal',
                color: '#86efac',
                min: 50,
                max: 59,
            },
            {
                name: 'Optimal',
                label: 'Optimal (≥ 60)',
                status: 'Optimal',
                color: '#10b981',
                min: 60,
            },
        ],
        source: 'ABIM January 2026',
    },
    ldl_cholesterol: {
        canonicalName: 'Low-density lipoprotein (LDL)',
        aliases: [
            'ldl',
            'ldl cholesterol',
            'low-density lipoprotein',
            'ldl-c',
            'ldl - cholesterol',
            'ldl-cholesterol',
            'direct ldl',
            'calculated ldl',
            'atherogenic cholesterol',
        ],
        standardUnit: 'mg/dL',
        general: {
            max: 99,
            unit: 'mg/dL',
        },
        tiers: [
            {
                name: 'Optimal',
                label: 'Optimal (< 100)',
                status: 'Optimal',
                color: '#10b981',
                max: 99,
            },
            {
                name: 'Near-Optimal',
                label: 'Near-optimal (100–129)',
                status: 'Normal',
                color: '#86efac',
                min: 100,
                max: 129,
            },
            {
                name: 'Borderline High',
                label: 'Borderline High (130–159)',
                status: 'Borderline High',
                color: '#fb923c',
                min: 130,
                max: 159,
            },
            {
                name: 'High',
                label: 'High (160–189)',
                status: 'High',
                color: '#f87171',
                min: 160,
                max: 189,
            },
            {
                name: 'Very High',
                label: 'Very High (≥ 190)',
                status: 'Very High',
                color: '#dc2626',
                min: 190,
            },
        ],
        source: 'ABIM January 2026',
    },
    vldl_cholesterol: {
        canonicalName: 'Very-low-density lipoprotein (VLDL)',
        aliases: [
            'vldl',
            'vldl cholesterol',
            'very-low-density lipoprotein',
            'vldl-c',
            'vldl - cholesterol',
        ],
        standardUnit: 'mg/dL',
        general: {
            min: 5,
            max: 30,
            unit: 'mg/dL',
        },
        tiers: [
            {
                name: 'Normal',
                label: 'Normal (< 30)',
                status: 'Optimal',
                color: '#10b981',
                max: 30,
            },
            {
                name: 'High',
                label: 'High (> 30)',
                status: 'High',
                color: '#ef4444',
                min: 31,
            },
        ],
        source: 'ABIM January 2026 / ATP III',
    },
    non_hdl_cholesterol: {
        canonicalName: 'Non-HDL Cholesterol',
        aliases: ['non-hdl', 'non-hdl cholesterol', 'non hdl'],
        standardUnit: 'mg/dL',
        general: {
            max: 129,
            unit: 'mg/dL',
        },
        tiers: [
            {
                name: 'Optimal',
                label: 'Optimal (< 130)',
                status: 'Optimal',
                color: '#10b981',
                max: 129,
            },
            {
                name: 'Borderline High',
                label: 'Borderline High (130–159)',
                status: 'Borderline High',
                color: '#fb923c',
                min: 130,
                max: 159,
            },
            {
                name: 'High',
                label: 'High (≥ 160)',
                status: 'High',
                color: '#ef4444',
                min: 160,
            },
        ],
        source: 'ABIM January 2026 / NLA',
    },

    // -------------------------------------------------------------------------
    // Complete Blood Count (CBC)
    // -------------------------------------------------------------------------
    hemoglobin: {
        canonicalName: 'Hemoglobin, blood',
        aliases: ['hemoglobin', 'hb', 'hgb'],
        standardUnit: 'g/dL',
        general: {
            min: 12,
            max: 18,
            unit: 'g/dL',
        },
        female: {
            min: 12,
            max: 16,
            unit: 'g/dL',
        },
        male: {
            min: 14,
            max: 18,
            unit: 'g/dL',
        },
        source: 'ABIM January 2026',
    },
    hematocrit: {
        canonicalName: 'Hematocrit, blood',
        aliases: ['hematocrit', 'hct', 'pcv', 'packed cell volume'],
        standardUnit: '%',
        general: {
            min: 37,
            max: 50,
            unit: '%',
        },
        female: {
            min: 37,
            max: 47,
            unit: '%',
        },
        male: {
            min: 42,
            max: 50,
            unit: '%',
        },
        source: 'ABIM January 2026',
    },
    rbc_count: {
        canonicalName: 'Erythrocyte count (RBC)',
        aliases: ['red blood cells', 'rbc', 'rbc count', 'erythrocyte count'],
        standardUnit: '10*6/uL',
        general: {
            min: 4.2,
            max: 5.9,
            unit: '10*6/uL',
        },
        source: 'ABIM January 2026',
    },
    wbc_count: {
        canonicalName: 'Leukocyte count (WBC)',
        aliases: ['white blood cells', 'wbc', 'wbc count', 'leukocyte count', 'total count'],
        standardUnit: '/uL',
        general: {
            min: 4000,
            max: 11000,
            unit: '/uL',
        },
        source: 'ABIM January 2026',
    },
    platelet_count: {
        canonicalName: 'Platelet count',
        aliases: ['platelets', 'platelet count', 'plt'],
        standardUnit: '/uL',
        general: {
            min: 150000,
            max: 450000,
            unit: '/uL',
        },
        source: 'ABIM January 2026',
    },
    mcv: {
        canonicalName: 'Mean corpuscular volume (MCV)',
        aliases: ['mcv', 'mean corpuscular volume'],
        standardUnit: 'fL',
        general: {
            min: 80,
            max: 98,
            unit: 'fL',
        },
        source: 'ABIM January 2026',
    },
    mch: {
        canonicalName: 'Mean corpuscular hemoglobin (MCH)',
        aliases: ['mch', 'mean corpuscular hemoglobin'],
        standardUnit: 'pg',
        general: {
            min: 28,
            max: 32,
            unit: 'pg',
        },
        source: 'ABIM January 2026',
    },
    mchc: {
        canonicalName: 'Mean corpuscular hemoglobin concentration (MCHC)',
        aliases: ['mchc', 'mean corpuscular hemoglobin concentration'],
        standardUnit: 'g/dL',
        general: {
            min: 33,
            max: 36,
            unit: 'g/dL',
        },
        source: 'ABIM January 2026',
    },
    rdw: {
        canonicalName: 'Red cell distribution width (RDW)',
        aliases: ['rdw', 'red cell distribution width', 'rdw-cv'],
        standardUnit: '%',
        general: {
            min: 9.0,
            max: 14.5,
            unit: '%',
        },
        source: 'ABIM January 2026',
    },
    esr: {
        canonicalName: 'Erythrocyte sedimentation rate (ESR)',
        aliases: ['esr', 'erythrocyte sedimentation rate', 'sed rate'],
        standardUnit: 'mm/hr',
        general: {
            min: 0,
            max: 20,
            unit: 'mm/hr',
        },
        female: {
            min: 0,
            max: 20,
            unit: 'mm/hr',
        },
        male: {
            min: 0,
            max: 15,
            unit: 'mm/hr',
        },
        source: 'ABIM January 2026',
    },

    // -------------------------------------------------------------------------
    // Liver & Pancreas
    // -------------------------------------------------------------------------
    alt: {
        canonicalName: 'Aminotransferase, serum alanine (ALT, SGPT)',
        aliases: ['alt', 'sgpt', 'alanine aminotransferase', 'alanine transaminase'],
        standardUnit: 'U/L',
        general: {
            min: 10,
            max: 40,
            unit: 'U/L',
        },
        source: 'ABIM January 2026',
    },
    ast: {
        canonicalName: 'Aminotransferase, serum aspartate (AST, SGOT)',
        aliases: ['ast', 'sgot', 'aspartate aminotransferase', 'aspartate transaminase'],
        standardUnit: 'U/L',
        general: {
            min: 10,
            max: 40,
            unit: 'U/L',
        },
        source: 'ABIM January 2026',
    },
    alp: {
        canonicalName: 'Alkaline phosphatase, serum',
        aliases: ['alkaline phosphatase', 'alp', 'alk phos'],
        standardUnit: 'U/L',
        general: {
            min: 30,
            max: 120,
            unit: 'U/L',
        },
        source: 'ABIM January 2026',
    },
    ggt: {
        canonicalName: 'Gamma-glutamyltransferase (GGT)',
        aliases: ['ggt', 'ggtp', 'gamma-glutamyl transferase'],
        standardUnit: 'U/L',
        general: {
            min: 8,
            max: 50,
            unit: 'U/L',
        },
        female: {
            min: 8,
            max: 40,
            unit: 'U/L',
        },
        male: {
            min: 9,
            max: 50,
            unit: 'U/L',
        },
        source: 'ABIM January 2026',
    },
    bilirubin_total: {
        canonicalName: 'Bilirubin, serum (Total)',
        aliases: ['total bilirubin', 'bilirubin total', 'bilirubin - total'],
        standardUnit: 'mg/dL',
        general: {
            min: 0.3,
            max: 1.0,
            unit: 'mg/dL',
        },
        source: 'ABIM January 2026',
    },
    bilirubin_direct: {
        canonicalName: 'Bilirubin, serum (Direct)',
        aliases: ['direct bilirubin', 'conjugated bilirubin', 'bilirubin - direct'],
        standardUnit: 'mg/dL',
        general: {
            min: 0.1,
            max: 0.3,
            unit: 'mg/dL',
        },
        source: 'ABIM January 2026',
    },
    albumin: {
        canonicalName: 'Albumin, serum',
        aliases: ['albumin', 'serum albumin'],
        standardUnit: 'g/dL',
        general: {
            min: 3.5,
            max: 5.5,
            unit: 'g/dL',
        },
        source: 'ABIM January 2026',
    },
    total_protein: {
        canonicalName: 'Proteins, serum (Total)',
        aliases: ['total protein', 'proteins', 'serum protein'],
        standardUnit: 'g/dL',
        general: {
            min: 5.5,
            max: 9.0,
            unit: 'g/dL',
        },
        source: 'ABIM January 2026',
    },
    amylase: {
        canonicalName: 'Amylase, serum',
        aliases: ['amylase', 'serum amylase'],
        standardUnit: 'U/L',
        general: {
            min: 25,
            max: 125,
            unit: 'U/L',
        },
        source: 'ABIM January 2026',
    },
    lipase: {
        canonicalName: 'Lipase, serum',
        aliases: ['lipase', 'serum lipase'],
        standardUnit: 'U/L',
        general: {
            min: 10,
            max: 140,
            unit: 'U/L',
        },
        source: 'ABIM January 2026',
    },

    // -------------------------------------------------------------------------
    // Electrolytes & Minerals
    // -------------------------------------------------------------------------
    sodium: {
        canonicalName: 'Sodium, serum',
        aliases: ['sodium', 'serum sodium', 'na', 'na+'],
        standardUnit: 'mEq/L',
        general: {
            min: 136,
            max: 145,
            unit: 'mEq/L',
        },
        source: 'ABIM January 2026',
    },
    potassium: {
        canonicalName: 'Potassium, serum',
        aliases: ['potassium', 'serum potassium', 'k', 'k+'],
        standardUnit: 'mEq/L',
        general: {
            min: 3.5,
            max: 5.0,
            unit: 'mEq/L',
        },
        source: 'ABIM January 2026',
    },
    chloride: {
        canonicalName: 'Chloride, serum',
        aliases: ['chloride', 'serum chloride', 'cl', 'cl-'],
        standardUnit: 'mEq/L',
        general: {
            min: 98,
            max: 106,
            unit: 'mEq/L',
        },
        source: 'ABIM January 2026',
    },
    bicarbonate: {
        canonicalName: 'Bicarbonate, serum',
        aliases: ['bicarbonate', 'serum bicarbonate', 'hco3', 'co2'],
        standardUnit: 'mEq/L',
        general: {
            min: 23,
            max: 28,
            unit: 'mEq/L',
        },
        source: 'ABIM January 2026',
    },
    calcium: {
        canonicalName: 'Calcium, serum',
        aliases: ['calcium', 'serum calcium', 'ca', 'ca++'],
        standardUnit: 'mg/dL',
        general: {
            min: 8.6,
            max: 10.2,
            unit: 'mg/dL',
        },
        source: 'ABIM January 2026',
    },
    phosphorus: {
        canonicalName: 'Phosphorus, serum',
        aliases: ['phosphorus', 'phosphate', 'serum phosphorus', 'serum phosphate'],
        standardUnit: 'mg/dL',
        general: {
            min: 3.0,
            max: 4.5,
            unit: 'mg/dL',
        },
        source: 'ABIM January 2026',
    },
    magnesium: {
        canonicalName: 'Magnesium, serum',
        aliases: ['magnesium', 'serum magnesium', 'mg'],
        standardUnit: 'mg/dL',
        general: {
            min: 1.6,
            max: 2.6,
            unit: 'mg/dL',
        },
        source: 'ABIM January 2026',
    },

    // -------------------------------------------------------------------------
    // Vitamins & Thyroid
    // -------------------------------------------------------------------------
    vitamin_d: {
        canonicalName: '25-Hydroxyvitamin D, serum',
        aliases: ['vitamin d', '25-hydroxyvitamin d', '25-oh vitamin d', 'vitamin d3'],
        standardUnit: 'ng/mL',
        general: {
            min: 30,
            max: 60,
            unit: 'ng/mL',
        },
        tiers: [
            {
                name: 'Deficient',
                label: 'Deficient (< 20)',
                status: 'High',
                color: '#ef4444',
                max: 19.9,
            },
            {
                name: 'Insufficient',
                label: 'Insufficient (20–29)',
                status: 'Borderline High',
                color: '#f59e0b',
                min: 20,
                max: 29.9,
            },
            {
                name: 'Optimal',
                label: 'Optimal (30–60)',
                status: 'Optimal',
                color: '#10b981',
                min: 30,
                max: 60,
            },
            {
                name: 'Elevated',
                label: 'Elevated (> 60)',
                status: 'Normal',
                color: '#86efac',
                min: 60.1,
            },
        ],
        source: 'ABIM January 2026',
    },
    vitamin_b12: {
        canonicalName: 'Vitamin B12, serum',
        aliases: ['vitamin b12', 'b12', 'cobalamin'],
        standardUnit: 'pg/mL',
        general: {
            min: 200,
            max: 800,
            unit: 'pg/mL',
        },
        source: 'ABIM January 2026',
    },
    tsh: {
        canonicalName: 'Thyroid-stimulating hormone (TSH), serum',
        aliases: ['tsh', 'thyroid-stimulating hormone', 'thyrotropin'],
        standardUnit: 'mU/L',
        general: {
            min: 0.5,
            max: 4.0,
            unit: 'mU/L',
        },
        source: 'ABIM January 2026',
    },
    free_t4: {
        canonicalName: 'Thyroxine (T4), Free, serum',
        aliases: ['free t4', 'ft4', 'free thyroxine'],
        standardUnit: 'ng/dL',
        general: {
            min: 0.8,
            max: 1.8,
            unit: 'ng/dL',
        },
        source: 'ABIM January 2026',
    },
    ferritin: {
        canonicalName: 'Ferritin, serum',
        aliases: ['ferritin', 'serum ferritin'],
        standardUnit: 'ng/mL',
        general: {
            min: 24,
            max: 336,
            unit: 'ng/mL',
        },
        female: {
            min: 24,
            max: 307,
            unit: 'ng/mL',
        },
        male: {
            min: 24,
            max: 336,
            unit: 'ng/mL',
        },
        source: 'ABIM January 2026',
    },
    iron: {
        canonicalName: 'Iron, serum',
        aliases: ['iron', 'serum iron', 'fe'],
        standardUnit: 'ug/dL',
        general: {
            min: 50,
            max: 150,
            unit: 'ug/dL',
        },
        source: 'ABIM January 2026',
    },
}

/**
 * Find ABIM standard by name or alias
 */
export const findAbimBiomarkerStandard = (name: string): AbimBiomarkerStandard | undefined => {
    if (!name) return undefined
    const clean = name.toLowerCase().trim()
    const cleanAlpha = clean.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()

    // Pass 1: Exact canonical match
    for (const key of Object.keys(ABIM_REFERENCE_RANGES_2026)) {
        const item = ABIM_REFERENCE_RANGES_2026[key]
        if (item.canonicalName.toLowerCase() === clean) return item
    }

    // Pass 2: Exact alias match across all biomarkers
    for (const key of Object.keys(ABIM_REFERENCE_RANGES_2026)) {
        const item = ABIM_REFERENCE_RANGES_2026[key]
        if (item.aliases.some((alias) => alias.toLowerCase() === clean)) return item
    }

    // Pass 3: Normalized punctuation-stripped exact match
    for (const key of Object.keys(ABIM_REFERENCE_RANGES_2026)) {
        const item = ABIM_REFERENCE_RANGES_2026[key]
        const cleanItemCanonical = item.canonicalName.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
        if (cleanItemCanonical === cleanAlpha) return item
        if (item.aliases.some((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim() === cleanAlpha)) {
            return item
        }
    }

    // Pass 4: Specific substring / whole-word matches, prioritizing the LONGEST (most specific) alias match
    let bestMatch: { item: AbimBiomarkerStandard, aliasLength: number } | undefined

    const GENERIC_ALIASES = new Set(['cholesterol', 'protein', 'bilirubin', 'calcium', 't4', 't3', 'cell', 'cells'])

    for (const key of Object.keys(ABIM_REFERENCE_RANGES_2026)) {
        const item = ABIM_REFERENCE_RANGES_2026[key]
        for (const rawAlias of item.aliases) {
            const alias = rawAlias.toLowerCase().trim()
            if (alias.length < 2) continue

            // If the alias is generic (e.g. 'cholesterol') and clean contains qualifiers (e.g. 'ldl', 'hdl', 'vldl'), skip generic alias
            if (GENERIC_ALIASES.has(alias)) {
                if (/\b(ldl|hdl|vldl|non-hdl|direct|indirect|total|urine|free)\b/i.test(clean)) {
                    continue
                }
            }

            // Check if clean contains alias as whole words
            const regex = new RegExp(`\\b${alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
            if (regex.test(clean)) {
                if (!bestMatch || alias.length > bestMatch.aliasLength) {
                    bestMatch = {
                        item,
                        aliasLength: alias.length,
                    }
                }
            }
        }
    }

    return bestMatch?.item
}
