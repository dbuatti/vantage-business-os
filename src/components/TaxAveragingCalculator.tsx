
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, Info, DollarSign, ArrowRight } from "lucide-react";
import { calculateAveragingBenefit, AveragingResult } from '@/utils/taxAveraging';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaxAveragingCalculatorProps {
  totalTaxableIncome: number;
  currentProfessionalIncome: number;
  historicalTPIs: number[];
}

export const TaxAveragingCalculator: React.FC<TaxAveragingCalculatorProps> = ({
  totalTaxableIncome,
  currentProfessionalIncome,
  historicalTPIs
}) => {
  const result = useMemo(() => {
    return calculateAveragingBenefit(totalTaxableIncome, currentProfessionalIncome, historicalTPIs);
  }, [totalTaxableIncome, currentProfessionalIncome, historicalTPIs]);

  const stats = [
    {
      label: 'Current Year TPI',
      value: formatCurrency(result.professionalIncome),
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
      tooltip: 'Your Taxable Professional Income for the current financial year.'
    },
    {
      label: '4-Year Average (ATPI)',
      value: formatCurrency(result.averageProfessionalIncome),
      icon: Calculator,
      color: 'text-foreground',
      bg: 'bg-muted',
      tooltip: 'The average of your TPI over the previous 4 years.'
    },
    {
      label: 'Above-Average (ASPI)',
      value: formatCurrency(result.aboveAverageIncome),
      icon: TrendingDown,
      color: 'text-profit',
      bg: 'bg-profit-bg',
      tooltip: 'The amount by which your current TPI exceeds your 4-year average.'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/50 backdrop-blur-sm border-border shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground/50 cursor-help group-hover:text-muted-foreground transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{stat.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
              <p className={cn("text-2xl font-black tracking-tight", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Calculator className="h-32 w-32" />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white/20 text-white border-white/30 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              ATO Averaging Benefit
            </Badge>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight mt-4">
            Estimated Tax Saving: {formatCurrency(result.taxSaving)}
          </CardTitle>
          <CardDescription className="text-primary-foreground/70 font-medium">
            Based on 2024-25 Resident Tax Rates (Stage 3 Cuts)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70">Standard Tax</p>
                  <p className="text-xl font-bold">{formatCurrency(result.taxWithoutAveraging)}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary-foreground/60" />
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70">Averaged Tax</p>
                  <p className="text-xl font-bold text-profit">{formatCurrency(result.taxWithAveraging)}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/70">
                <div className="h-1.5 w-1.5 rounded-full bg-profit" />
                <span>Total Taxable Income: {formatCurrency(result.taxableIncome)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/70">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60" />
                <span>Professional Portion: {((result.professionalIncome / result.taxableIncome) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-[10px] text-primary-foreground/60 mt-4 italic">
                * This is an estimate only. Please consult with your accountant for final tax calculations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
