
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Music, Sparkles, HelpCircle } from "lucide-react";

interface BusinessStreamSelectorProps {
  value: 'Music' | 'Kinesiology' | 'Other';
  onChange: (value: 'Music' | 'Kinesiology' | 'Other') => void;
}

export const BusinessStreamSelector: React.FC<BusinessStreamSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Business Stream</Label>
      <Select value={value} onValueChange={(v: any) => onChange(v)}>
        <SelectTrigger className="w-full bg-white/50 backdrop-blur-sm border-indigo-100 focus:ring-indigo-500">
          <SelectValue placeholder="Select business stream" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Music">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-indigo-500" />
              <span>Music (Performing)</span>
            </div>
          </SelectItem>
          <SelectItem value="Kinesiology">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>Kinesiology</span>
            </div>
          </SelectItem>
          <SelectItem value="Other">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <span>Personal / Other</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
