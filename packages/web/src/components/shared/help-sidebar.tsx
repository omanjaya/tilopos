import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Info,
  ChevronRight,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  getPageHelp,
  getPageTips,
  getCommonIssues,
} from '@/config/help-content.config';
import { HelpTooltip } from './help-tooltip';

interface HelpSidebarProps {
  page: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HelpSidebar({
  page,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: HelpSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const pageHelp = getPageHelp(page);
  const tips = getPageTips(page);
  const commonIssues = getCommonIssues(page);

  if (!pageHelp) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <div className="flex flex-col h-full">
          <SheetHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>{pageHelp.title}</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SheetDescription className="mt-2">{pageHelp.description}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-6">
            <div className="space-y-6 pr-4">
              {/* Tips Section */}
              {tips.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-sm">Tips</h3>
                  </div>
                  <ul className="space-y-2">
                    {tips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2 text-sm text-muted-foreground"
                      >
                        <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {tips.length > 0 && commonIssues.length > 0 && (
                <Separator />
              )}

              {/* Common Issues Section */}
              {commonIssues.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-sm">Common Issues</h3>
                  </div>
                  <div className="space-y-3">
                    {commonIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border bg-card p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Badge
                            variant="outline"
                            className="flex-shrink-0 mt-0.5 bg-destructive/10 text-destructive border-destructive/20"
                          >
                            Issue
                          </Badge>
                          <div className="space-y-1 flex-1">
                            <p className="text-sm font-medium">{issue.problem}</p>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-blue-500" />
                              <p>{issue.solution}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                window.open('/app/help', '_self');
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              View Full Help Center
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * InlineHelpCard component - Displays help tips inline on a page
 */
interface InlineHelpCardProps {
  page: string;
  variant?: 'tips' | 'issues' | 'both';
  className?: string;
}

export function InlineHelpCard({
  page,
  variant = 'both',
  className,
}: InlineHelpCardProps) {
  const tips = getPageTips(page);
  const commonIssues = getCommonIssues(page);

  if (tips.length === 0 && commonIssues.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx(
        'rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4',
        className
      )}
    >
      {/* Tips */}
      {(variant === 'tips' || variant === 'both') && tips.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">Quick Tips</h4>
          </div>
          <ul className="space-y-1">
            {tips.slice(0, 3).map((tip, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                <span className="text-blue-500">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Issues */}
      {(variant === 'issues' || variant === 'both') && commonIssues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">Need Help?</h4>
          </div>
          <div className="space-y-2">
            {commonIssues.slice(0, 2).map((issue, idx) => (
              <details
                key={idx}
                className="group text-sm rounded border bg-background p-2"
              >
                <summary className="cursor-pointer font-medium list-none flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 flex-shrink-0 transition-transform group-open:rotate-90" />
                  {issue.problem}
                </summary>
                <p className="mt-2 text-muted-foreground ml-5">{issue.solution}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * FieldHelpTooltip component - Displays help tooltip for a specific field
 */
interface FieldHelpTooltipProps {
  page: string;
  field: string;
  trigger?: React.ReactNode;
}

export function FieldHelpTooltip({ page, field, trigger }: FieldHelpTooltipProps) {
  const fieldHelp = getPageHelp(page)?.fields?.[field];

  if (!fieldHelp) {
    return null;
  }

  return (
    <span className="inline-flex ml-1">
      {trigger || <HelpTooltip content={fieldHelp.help} title={fieldHelp.title} variant={fieldHelp.variant} />}
    </span>
  );
}
