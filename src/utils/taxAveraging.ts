
export interface TaxBracket {
  min: number;
  max: number | null;
  baseTax: number;
  rate: number;
}

export const RESIDENT_TAX_RATES_2024_25: TaxBracket[] = [
  { min: 0, max: 18200, baseTax: 0, rate: 0 },
  { min: 18201, max: 45000, baseTax: 0, rate: 0.16 },
  { min: 45001, max: 135000, baseTax: 4288, rate: 0.30 },
  { min: 135001, max: 190000, baseTax: 31288, rate: 0.37 },
  { min: 190001, max: null, baseTax: 51638, rate: 0.45 },
];

export const calculateTax = (taxableIncome: number, brackets: TaxBracket[] = RESIDENT_TAX_RATES_2024_25): number => {
  if (taxableIncome <= 0) return 0;
  
  const bracket = brackets.find(b => taxableIncome >= b.min && (b.max === null || taxableIncome <= b.max));
  
  if (!bracket) return 0;
  
  return bracket.baseTax + (taxableIncome - (bracket.min - 1)) * bracket.rate;
};

export interface AveragingResult {
  taxableIncome: number;
  professionalIncome: number;
  averageProfessionalIncome: number;
  aboveAverageIncome: number;
  taxWithoutAveraging: number;
  taxWithAveraging: number;
  taxSaving: number;
}

export const calculateAveragingBenefit = (
  totalTaxableIncome: number,
  currentProfessionalIncome: number,
  historicalTPIs: number[] // Last 4 years
): AveragingResult => {
  // 1. Calculate Average Taxable Professional Income (ATPI)
  const sumHistorical = historicalTPIs.reduce((sum, val) => sum + val, 0);
  const averageProfessionalIncome = sumHistorical / 4;

  // 2. Calculate Above-Average Special Professional Income (ASPI)
  // ASPI is the amount by which current TPI exceeds ATPI
  const aboveAverageIncome = Math.max(0, currentProfessionalIncome - averageProfessionalIncome);

  // 3. Calculate Tax without averaging
  const taxWithoutAveraging = calculateTax(totalTaxableIncome);

  // 4. Calculate Tax with averaging
  // Formula: Tax on (TI - 4/5 ASPI) + 5 * [Tax on (TI - 4/5 ASPI + 1/5 ASPI) - Tax on (TI - 4/5 ASPI)]
  const aspi = aboveAverageIncome;
  const baseTI = totalTaxableIncome - (0.8 * aspi);
  const taxOnBase = calculateTax(baseTI);
  const taxOnBasePlusFifth = calculateTax(baseTI + (0.2 * aspi));
  
  const taxWithAveraging = taxOnBase + 5 * (taxOnBasePlusFifth - taxOnBase);

  return {
    taxableIncome: totalTaxableIncome,
    professionalIncome: currentProfessionalIncome,
    averageProfessionalIncome,
    aboveAverageIncome,
    taxWithoutAveraging,
    taxWithAveraging,
    taxSaving: Math.max(0, taxWithoutAveraging - taxWithAveraging)
  };
};
