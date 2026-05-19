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
        <button
          type="button"
          aria-label={`About ${label ?? 'metric'}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        align="center"
        sideOffset={6}
        className="max-w-[240px] rounded-lg border-0 bg-gray-900 p-2 text-[11px] leading-relaxed text-white shadow-lg"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
