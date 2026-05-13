import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const METRIC_TOOLTIPS: Record<string, string> = {
  'Facilities per 100K Population':
    'Number of mental health facilities per 100,000 people in the district. Calculated as: (total facilities ÷ district population) × 100,000. Source: BBS Census 2022 projections + ADB facility dataset.',
  'Poverty Index':
    'A composite district-level poverty index. Higher values indicate greater poverty burden. Source: Bangladesh Bureau of Statistics (BBS) 2022.',
  'Literacy Rate':
    'Percentage of the district population aged 7 and above who can read and write. Source: BBS Census 2022.',
  'Urban Percent':
    'Percentage of the district population residing in urban areas. Source: BBS Census 2022.',
  'Population per Facility':
    'Average number of people per mental health facility in the district. Lower values indicate better access. Calculated as: district population ÷ total facilities.',
  'Facilities with Free Service':
    'Count of facilities where the cost field is recorded as Free. Note: 44.7% of all facilities have missing cost data and are excluded from this count.',
  'Avg Poverty Index':
    'A composite district-level poverty index. Higher values indicate greater poverty burden. Source: Bangladesh Bureau of Statistics (BBS) 2022.',
  'Avg Literacy Rate':
    'Percentage of the district population aged 7 and above who can read and write. Source: BBS Census 2022.',
};

interface Props {
  text?: string;
  label?: string;
}

export default function MetricInfoTooltip({ text, label }: Props) {
  const content = text ?? (label ? METRIC_TOOLTIPS[label] : undefined);
  if (!content) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" aria-label={`About ${label ?? 'metric'}`}>
          <Info className="h-3 w-3 cursor-pointer text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg p-2 max-w-[220px] shadow-lg z-[9999] border-0"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
