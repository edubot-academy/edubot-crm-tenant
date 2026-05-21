import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle, ChevronDown, ChevronUp, Edit, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface FieldSuggestion {
  field: string;
  fieldLabel: string;
  currentValue?: string;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
  fieldType: 'text' | 'textarea' | 'select' | 'number' | 'date';
  options?: string[];
}

export interface SuggestionSet {
  id: string;
  targetType: 'lead' | 'contact' | 'deal';
  targetId: number;
  suggestions: FieldSuggestion[];
  overallConfidence: number;
  source: 'ai_extraction' | 'ai_analysis';
  generatedAt: string;
  aiRequestId?: string | null;
}

interface StructuredSuggestionReviewProps {
  suggestions?: SuggestionSet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplySuggestions?: (acceptedSuggestions: { field: string; value: string }[]) => void;
  onRejectSuggestions?: (rejectedFields: string[]) => void;
  loading?: boolean;
  error?: string;
}

type Decision = 'pending' | 'accepted' | 'rejected';

function renderEditableField(
  suggestion: FieldSuggestion,
  value: string,
  onChange: (value: string) => void,
  disabled: boolean,
) {
  if (suggestion.fieldType === 'textarea') {
    return <Textarea value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="min-h-[88px]" />;
  }
  if (suggestion.fieldType === 'number') {
    return <Input type="number" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />;
  }
  if (suggestion.fieldType === 'date') {
    return <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />;
  }
  if (suggestion.fieldType === 'select') {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {suggestion.options?.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }
  return <Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />;
}

function SuggestionRow({
  suggestion,
  decision,
  editedValue,
  onEdit,
  onDecisionChange,
}: {
  suggestion: FieldSuggestion;
  decision: Decision;
  editedValue?: string;
  onEdit: (value: string) => void;
  onDecisionChange: (decision: Decision) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const value = editedValue ?? suggestion.suggestedValue;

  const tone = decision === 'accepted'
    ? 'border-emerald-200 bg-emerald-50/70'
    : decision === 'rejected'
      ? 'border-red-200 bg-red-50/70'
      : 'border-border/70 bg-background';

  return (
    <Card className={tone}>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">{suggestion.fieldLabel}</h4>
              <Badge variant="outline">{Math.round(suggestion.confidence * 100)}% ишеним</Badge>
              {editedValue !== undefined && <Badge variant="secondary">Кол менен өзгөртүлдү</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">Бул маани CRM талаасына сунуш катары даярдалды.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant={decision === 'accepted' ? 'default' : 'outline'} size="sm" onClick={() => onDecisionChange(decision === 'accepted' ? 'pending' : 'accepted')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Кабыл алуу
            </Button>
            <Button variant={decision === 'rejected' ? 'destructive' : 'outline'} size="sm" onClick={() => onDecisionChange(decision === 'rejected' ? 'pending' : 'rejected')}>
              <X className="mr-2 h-4 w-4" />
              Четке кагуу
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing((current) => !current)}>
              <Edit className="mr-2 h-4 w-4" />
              {isEditing ? 'Даяр' : 'Өзгөртүү'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Азыркы маани</Label>
            <p className="text-sm text-foreground">{suggestion.currentValue || 'Толтурула элек'}</p>
          </div>
          <div className="flex items-center justify-center text-sm font-medium text-muted-foreground">→</div>
          <div className="rounded-xl border border-border/70 bg-background p-3">
            <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Сунушталган маани</Label>
            {renderEditableField(suggestion, value, onEdit, !isEditing)}
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => setShowReasoning((current) => !current)} className="px-0 text-xs text-muted-foreground hover:text-foreground">
            {showReasoning ? <ChevronUp className="mr-2 h-3.5 w-3.5" /> : <ChevronDown className="mr-2 h-3.5 w-3.5" />}
            Эмне үчүн ушундай сунуш берилди
          </Button>
          {showReasoning && (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
              {suggestion.reasoning}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StructuredSuggestionReview({
  suggestions,
  open,
  onOpenChange,
  onApplySuggestions,
  onRejectSuggestions,
  loading = false,
  error,
}: StructuredSuggestionReviewProps) {
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());
  const [rejectedFields, setRejectedFields] = useState<Set<string>>(new Set());
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  if (!suggestions) return null;

  const handleDecisionChange = (field: string, decision: Decision) => {
    setAcceptedFields((current) => {
      const next = new Set(current);
      if (decision === 'accepted') next.add(field);
      else next.delete(field);
      return next;
    });
    setRejectedFields((current) => {
      const next = new Set(current);
      if (decision === 'rejected') next.add(field);
      else next.delete(field);
      return next;
    });
  };

  const handleApply = () => {
    const acceptedSuggestions = suggestions.suggestions
      .filter((suggestion) => acceptedFields.has(suggestion.field))
      .map((suggestion) => ({
        field: suggestion.field,
        value: editedValues[suggestion.field] ?? suggestion.suggestedValue,
      }));

    if (acceptedSuggestions.length === 0) return;

    onApplySuggestions?.(acceptedSuggestions);
    toast({ title: 'Сунуштар колдонулду', description: `${acceptedSuggestions.length} талаа жаңыртууга даяр.` });
    onOpenChange(false);
  };

  const handleReject = () => {
    const rejected = Array.from(rejectedFields);
    onRejectSuggestions?.(rejected);
    toast({ title: 'Сунуштар четке кагылды', description: `${rejected.length} талаа сакталбайт.` });
    onOpenChange(false);
  };

  const pendingCount = suggestions.suggestions.filter((suggestion) => !acceptedFields.has(suggestion.field) && !rejectedFields.has(suggestion.field)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI сунуштарын текшерүү
          </DialogTitle>
          <DialogDescription>Ар бир сунушталган өзгөртүүнү карап чыгып, кабыл алыңыз, четке кагыңыз же кол менен түзөтүңүз.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{suggestions.suggestions.length} талаа каралууда</p>
                <p className="text-sm text-muted-foreground">Жалпы ишеним: {Math.round(suggestions.overallConfidence * 100)}%. Адегенде кабыл ала турган талааларды тандаңыз.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Күтүүдө: {pendingCount}</Badge>
                <Badge variant="outline">Кабыл алынган: {acceptedFields.size}</Badge>
                <Badge variant="outline">Четке кагылган: {rejectedFields.size}</Badge>
              </div>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-2 h-8 w-8 animate-spin text-orange-500" />
              <p className="text-sm">Сунуштар жүктөлүп жатат...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.suggestions.map((suggestion) => {
                const decision: Decision = acceptedFields.has(suggestion.field)
                  ? 'accepted'
                  : rejectedFields.has(suggestion.field)
                    ? 'rejected'
                    : 'pending';

                return (
                  <SuggestionRow
                    key={suggestion.field}
                    suggestion={suggestion}
                    decision={decision}
                    editedValue={editedValues[suggestion.field]}
                    onEdit={(value) => {
                      setEditedValues((current) => ({ ...current, [suggestion.field]: value }));
                      handleDecisionChange(suggestion.field, 'accepted');
                    }}
                    onDecisionChange={(nextDecision) => handleDecisionChange(suggestion.field, nextDecision)}
                  />
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Жабуу</Button>
            <Button variant="outline" onClick={() => {
              setAcceptedFields(new Set(suggestions.suggestions.map((item) => item.field)));
              setRejectedFields(new Set());
            }}>
              Баарын кабыл алуу
            </Button>
            <Button variant="outline" onClick={() => {
              setRejectedFields(new Set(suggestions.suggestions.map((item) => item.field)));
              setAcceptedFields(new Set());
            }}>
              Баарын четке кагуу
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {rejectedFields.size > 0 && (
              <Button variant="outline" onClick={handleReject} className="text-red-600">
                Четке кагылгандарды сактоо
              </Button>
            )}
            <Button onClick={handleApply} disabled={acceptedFields.size === 0}>
              Кабыл алынгандарды колдонуу ({acceptedFields.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
