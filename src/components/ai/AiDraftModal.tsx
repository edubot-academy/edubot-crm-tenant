import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { aiApi, type DraftFollowupResponse } from '@/api/ai';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getAiErrorMessage, formatAiErrorForToast } from '@/lib/ai-error-messages';

/**
 * Allowed tone values — MUST stay in sync with backend AI_DRAFT_TONES
 * (src/ai/ai.constants.ts in edubot-crm-backend)
 */
const ALLOWED_TONES = ['friendly', 'formal', 'urgent', 'empathetic', 'brief'] as const;

const draftRequestSchema = z.object({
  tone: z.enum(ALLOWED_TONES, { message: 'Тонду тандаңыз' }),
  instructions: z.string().max(2000, 'Кошумча нускаулар 2000 символдон ашпоосу керек').optional(),
});

type DraftRequestForm = z.infer<typeof draftRequestSchema>;

const toneOptions = [
  { value: 'friendly', label: 'Жылуу' },
  { value: 'formal', label: 'Расмий' },
  { value: 'urgent', label: 'Шашылыш' },
  { value: 'empathetic', label: 'Түшүнүү менен' },
  { value: 'brief', label: 'Кыскача' },
];

interface AiDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'lead' | 'contact' | 'deal';
  targetId: number;
  targetName: string;
  onUseDraft: (message: string) => void;
}

export function AiDraftModal({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
  onUseDraft,
}: AiDraftModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<DraftFollowupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const showDebugInfo = user?.role === 'admin' || user?.role === 'manager';

  const form = useForm<DraftRequestForm>({
    resolver: zodResolver(draftRequestSchema),
    defaultValues: {
      tone: 'friendly',
      instructions: '',
    },
  });

  const targetTypeLabel = {
    lead: 'Лид',
    contact: 'Байланыш',
    deal: 'Келишим',
  }[targetType];

  const handleGenerateDraft = async (data: DraftRequestForm) => {
    setIsGenerating(true);
    setError(null);
    setDraft(null);

    try {
      const response = await aiApi.draftFollowup({
        targetType,
        targetId,
        tone: data.tone,
        instructions: data.instructions,
      });

      setDraft(response);
      setEditedMessage(response.message);
      toast({
        title: 'Сунуш даяр болду',
        description: 'AI жооптун текстин сунуштап берди',
      });
    } catch (err: unknown) {
      const errorInfo = getAiErrorMessage(err, {
        fallbackTitle: 'Сунушту даярдоодо ката кетти',
        fallbackDescription: 'AI жооп сунушун даярдоодо ката кетти. Бир аздан кийин кайра аракет кылыңыз.',
      });

      setError(errorInfo.description);
      toast(formatAiErrorForToast(err, {
        fallbackTitle: 'Сунушту даярдоодо ката кетти',
        fallbackDescription: 'AI жооп сунушун даярдоодо ката кетти. Бир аздан кийин кайра аракет кылыңыз.',
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (form.formState.isValid) {
      setEditedMessage('');
      handleGenerateDraft(form.getValues());
    }
  };

  const handleCopyDraft = async () => {
    if (!editedMessage) return;
    try {
      await navigator.clipboard.writeText(editedMessage);
      toast({
        title: 'Көчүрүлдү',
        description: 'Жооп алмашуу буферине көчүрүлдү',
      });
    } catch {
      toast({
        title: 'Көчүрүү мүмкүн болгон жок',
        description: 'Текстти кол менен белгилеп көчүрүп алыңыз',
        variant: 'destructive',
      });
    }
  };

  const handleUseDraft = () => {
    const message = editedMessage.trim();
    if (message) {
      onUseDraft(message);
      onOpenChange(false);
      setDraft(null);
      setEditedMessage('');
      setShowTechnicalDetails(false);
      form.reset();
    }
  };

  const handleDismiss = () => {
    setDraft(null);
    setEditedMessage('');
    setShowTechnicalDetails(false);
    form.reset();
  };

  const handleClose = () => {
    if (!isGenerating) {
      setDraft(null);
      setError(null);
      setEditedMessage('');
      setShowTechnicalDetails(false);
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI менен follow-up билдирүү даярдоо
          </DialogTitle>
          <DialogDescription>AI учурдагы контекстке жараша жооп сунуштайт. Колдонордон мурун текстти карап, кааласаңыз түзөтүңүз.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Information */}
          <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{targetTypeLabel}</p>
                <p className="text-lg font-semibold">{targetName}</p>
              </div>
            </div>
          </div>

          {/* Draft Request Form */}
          {!draft && !isGenerating && (
            <form onSubmit={form.handleSubmit(handleGenerateDraft)} className="space-y-5">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground">Сурам параметрлери</p>
                  <p className="text-xs text-muted-foreground">Тонду жана керек болсо кошумча көрсөтмөнү тандаңыз.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Жооптун стили *</Label>
                    <Select
                      value={form.watch('tone')}
                      onValueChange={(value) => form.setValue('tone', value as DraftRequestForm['tone'])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Тонду тандаңыз" />
                      </SelectTrigger>
                      <SelectContent>
                        {toneOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.tone && (
                      <p className="text-sm text-destructive">{form.formState.errors.tone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Кошумча көрсөтмө (милдеттүү эмес)</Label>
                    <Textarea
                      id="instructions"
                      placeholder="Мисалы: кыска жазыңыз же курс тууралуу кененирээк маалымат кошуңуз"
                      className="min-h-[100px]"
                      {...form.register('instructions')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Максимум 2000 символ
                    </p>
                    {form.formState.errors.instructions && (
                      <p className="text-sm text-destructive">{form.formState.errors.instructions.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isGenerating}
                >
                  Жокко чыгуу
                </Button>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сунуш даярдалып жатат...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Сунуш даярдоо
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-center text-muted-foreground">
                AI жооп сунушун даярдап жатат...
                <br />
                Бул бир нече секунд ала турган болушу мүмкүн.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isGenerating && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 border-red-200 text-red-800 hover:bg-red-100"
                      onClick={() => setError(null)}
                    >
                      Кайта аракет кылуу
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Draft Review */}
          {draft && !isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">Сунуш даяр болду</h3>
                {draft.draftKind === 'human_review_required' && (
                  <Badge variant="secondary" className="text-xs">
                    Текшерүү керек
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                {/* Generated Message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Сунушталган жооп</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyDraft}
                      className="h-8 gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      Көчүрүү
                    </Button>
                  </div>
                  <div className="bg-muted/30 rounded-lg border-l-4 border-orange-500 overflow-hidden">
                    <Textarea
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      className="min-h-[140px] border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-orange-500 rounded-none resize-y"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Эмнеге ушундай сунушталды</Label>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">{draft.reason}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Кийинки сунушталган кадам</Label>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">{draft.suggestedAction}</p>
                  </div>
                </div>

                {/* Confidence */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ишеним деңгээли</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${draft.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(draft.confidence * 100)}% ·{' '}
                      {(() => {
                        const c = draft.confidence;
                        if (c >= 0.9) return 'Жогорку';
                        if (c >= 0.7) return 'Орточо';
                        if (c >= 0.5) return 'Төмөн';
                        return 'Өтө төмөн';
                      })()}
                    </span>
                  </div>
                </div>

                {/* Technical Details (admin/debug only) */}
                {showDebugInfo && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowTechnicalDetails((v) => !v)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showTechnicalDetails ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      Техникалык маалымат
                    </button>
                    {showTechnicalDetails && (
                      <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">ID</Label>
                          <div className="text-sm">{targetId}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-border/60 pt-4">
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Жабуу
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Кайра түзүү
                </Button>
                <Button
                  onClick={handleUseDraft}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Жооп талаасына кошуу
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
