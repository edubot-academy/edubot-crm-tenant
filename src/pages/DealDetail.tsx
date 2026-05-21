import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageError, PageHeader, PageLoading } from '@/components/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, CreditCard, Workflow, Pencil, Sparkles, MoreHorizontal, Phone, Mail, Calendar, User } from 'lucide-react';
import { contactApi, dealsApi, paymentsApi, bridgeApi } from '@/api/modules';
import type { Contact, Deal, Lead, Payment } from '@/types';
import type { ContactWithStudentMapping } from '@/types/bridge';
import { ky } from '@/lib/i18n';
import { formatDate } from '@/lib/formatting';
import { IntegrationHistoryPanel } from '@/components/lms/IntegrationHistoryPanel';
import { DealCourseMapping } from '@/components/lms/DealCourseMapping';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyError } from '@/lib/error-messages';
import { useRolePermissions } from '@/hooks/use-role-permissions';
import { useFeatureFlags } from '@/components/core/FeatureFlagProvider';
import { useLmsBridge } from '@/components/lms/LmsBridgeProvider';
import { LmsCourseContextFields } from '@/components/lms/LmsCourseContextFields';
import type { LmsCourseType } from '@/types/lms';
import { AiDraftModal } from '@/components/ai/AiDraftModal';
import { AiDraftHandoffCard } from '@/components/ai/AiDraftHandoffCard';
import { PriorityIndicator, PriorityScore, RiskScore } from '@/components/ai/PriorityIndicator';
import { NextBestActionCard, NextBestAction } from '@/components/ai/NextBestActionCard';
import { CommunicationSummary, CommunicationSummary as CommunicationSummaryType } from '@/components/ai/CommunicationSummary';
import { StructuredSuggestionReview, SuggestionSet, FieldSuggestion } from '@/components/ai/StructuredSuggestionReview';
import { AiFeedbackControls } from '@/components/ai/AiFeedbackControls';
import { aiApi, type FeedbackRequest } from '@/api/ai';
import { RecordWhatsAppTimelineCard } from '@/components/whatsapp/RecordWhatsAppTimelineCard';

type DealEditLmsFormState = {
  lmsCourseId: string;
  lmsGroupId: string;
  courseType: LmsCourseType | '';
  courseNameSnapshot: string;
  groupNameSnapshot: string;
};

// Helper functions for extraction mapping
function getFieldLabel(field: string): string {
  const fieldLabels: Record<string, string> = {
    preferredSchedule: 'Ыңгайлуу убакыт',
    courseInterest: 'Кызыккан курс',
    budgetSignal: 'Бюджет белгиси',
    objections: 'Каршылыктар',
    otherNotes: 'Кошумча белгилер',
  };
  return fieldLabels[field] || field;
}

function getCurrentFieldValue(field: string, item: Lead | Deal): string {
  switch (field) {
    case 'courseInterest':
      return 'interestedCourseId' in item ? (item.interestedCourseId || '') : '';
    case 'otherNotes':
      return item.notes || '';
    default:
      return '';
  }
}

function inferFieldType(field: string): FieldSuggestion['fieldType'] {
  return field === 'objections' || field === 'otherNotes' ? 'textarea' : 'text';
}

export default function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFeatureEnabled } = useFeatureFlags();
  const { canViewIntegrationHistory, canViewLmsTechnicalFields, canViewStudentSummary } = useRolePermissions();
  const { isLmsBridgeEnabled } = useLmsBridge();
  const isAiDraftsEnabled =
    isFeatureEnabled('ai_assist_enabled') && isFeatureEnabled('ai_followup_drafts_enabled');
  const isAiOperationalIntelligenceEnabled =
    isFeatureEnabled('ai_assist_enabled') && isFeatureEnabled('ai_operator_guidance_enabled');
  const [deal, setDeal] = useState<Deal | null>(null);
  const [contactBridgeData, setContactBridgeData] = useState<ContactWithStudentMapping | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isAiDraftOpen, setIsAiDraftOpen] = useState(false);
  const [aiDraftMessage, setAiDraftMessage] = useState('');

  // Release 2 - Operational Intelligence State
  const [priorityScore, setPriorityScore] = useState<PriorityScore | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [nextBestAction, setNextBestAction] = useState<NextBestAction | null>(null);
  const [communicationSummary, setCommunicationSummary] = useState<CommunicationSummaryType | null>(null);
  const [extractionSuggestions, setExtractionSuggestions] = useState<SuggestionSet | null>(null);
  const [isSuggestionReviewOpen, setIsSuggestionReviewOpen] = useState(false);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const [intelligenceRefreshKey, setIntelligenceRefreshKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<DealEditLmsFormState>({
    lmsCourseId: '',
    lmsGroupId: '',
    courseType: '',
    courseNameSnapshot: '',
    groupNameSnapshot: '',
  });

  const loadDeal = async (dealId: number) => {
    const dealResult = await dealsApi.get(dealId);
    setDeal(dealResult);
    if (dealResult.contactId) {
      try {
        const contactResult = await contactApi.get(dealResult.contactId);
        setContact(contactResult);
      } catch {
        setContact(null);
      }
    } else {
      setContact(null);
    }
    return dealResult;
  };

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    loadDeal(Number(id))
      .catch(() => setError('Келишим табылган жок'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (
      !contact
      || !isLmsBridgeEnabled
      || (!canViewIntegrationHistory() && !canViewLmsTechnicalFields() && !canViewStudentSummary())
    ) {
      setContactBridgeData(null);
      return;
    }
    bridgeApi.getContactBridgeData(contact.id)
      .then((data) => setContactBridgeData(data))
      .catch(() => setContactBridgeData(null));
  }, [canViewIntegrationHistory, canViewLmsTechnicalFields, canViewStudentSummary, contact, isLmsBridgeEnabled]);

  useEffect(() => {
    if (!id) return;
    setPaymentsLoading(true);
    paymentsApi.list({ dealId: id, limit: 100 })
      .then((res) => setPayments(res.items))
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!deal || !editOpen) return;
    setEditForm({
      lmsCourseId: deal.lmsMapping?.lmsCourseId || '',
      lmsGroupId: deal.lmsMapping?.lmsGroupId || '',
      courseType: deal.lmsMapping?.courseType || '',
      courseNameSnapshot: deal.lmsMapping?.courseNameSnapshot || '',
      groupNameSnapshot: deal.lmsMapping?.groupNameSnapshot || '',
    });
  }, [deal, editOpen]);

  // Release 2 - Load operational intelligence data
  useEffect(() => {
    if (!deal || !isAiOperationalIntelligenceEnabled) return;

    const loadIntelligenceData = async () => {
      setIntelligenceLoading(true);
      setIntelligenceError(null);

      try {
        const dealId = Number(deal.id);

        // Priority scoring not available for deals - API only supports leads

        // Load risk score
        try {
          const riskData = await aiApi.getRiskScore('deal', dealId);
          setRiskScore({
            risk: riskData.risk,
            reasons: riskData.reasons,
            score: riskData.score,
          });
        } catch (err) {
          console.warn('Failed to load risk score:', err);
        }

        // Load next best action
        try {
          const actionData = await aiApi.getNextBestAction('deal', dealId);
          setNextBestAction(actionData);
        } catch (err) {
          console.warn('Failed to load next best action:', err);
        }

        try {
          const summaryData = await aiApi.getTimelineSummary('deal', dealId);
          setCommunicationSummary(summaryData);
        } catch (err) {
          console.warn('Failed to load communication summary:', err);
        }

        // Load extraction suggestions
        try {
          // Extract text from deal notes for analysis
          const textToExtract = deal.notes || '';
          if (textToExtract.trim()) {
            const extractionData = await aiApi.getExtraction('deal', dealId, textToExtract);
            const rawSuggestions = [
              { field: 'preferredSchedule', value: extractionData.preferredSchedule },
              { field: 'courseInterest', value: extractionData.courseInterest },
              { field: 'budgetSignal', value: extractionData.budgetSignal },
              { field: 'objections', value: extractionData.objections.length > 0 ? extractionData.objections.join(', ') : null },
              { field: 'otherNotes', value: extractionData.otherNotes },
            ].filter((item): item is { field: string; value: string } => Boolean(item.value && item.value.trim()));

            if (rawSuggestions.length > 0) {
              const suggestions: FieldSuggestion[] = rawSuggestions.map((field) => ({
                field: field.field,
                fieldLabel: getFieldLabel(field.field),
                currentValue: getCurrentFieldValue(field.field, deal),
                suggestedValue: field.value,
                confidence: extractionData.confidence,
                reasoning: `Жазуудан ${Math.round(extractionData.confidence * 100)}% ишеним менен алынган`,
                fieldType: inferFieldType(field.field),
              }));

              setExtractionSuggestions({
                id: `extraction-${deal.id}`,
                targetType: 'deal',
                targetId: dealId,
                suggestions,
                overallConfidence: extractionData.confidence,
                source: 'ai_extraction',
                generatedAt: new Date().toISOString(),
                aiRequestId: extractionData.aiRequestId || null,
              });
            }
          }
        } catch (err) {
          console.warn('Failed to load extraction suggestions:', err);
        }
      } catch (err) {
        setIntelligenceError('Операциялык интеллект маалыматын жүктөөдө ката кетти');
      } finally {
        setIntelligenceLoading(false);
      }
    };

    loadIntelligenceData();
  }, [deal, isAiOperationalIntelligenceEnabled, intelligenceRefreshKey]);

  // Handle next best action execution
  const handleNextBestAction = (action: NextBestAction) => {
    switch (action.action) {
      case 'call':
        if (contact?.phone) {
          window.location.href = `tel:${contact.phone}`;
        } else {
          toast({
            title: 'Телефон номери жок',
            description: 'Бул келишимде телефон номери жазылган эмес',
            variant: 'destructive',
          });
        }
        break;
      case 'whatsapp':
        setIsAiDraftOpen(true);
        break;
      case 'schedule_trial':
        toast({
          title: 'Сыноо сабак',
          description: 'Сыноо сабакты жаздыруу үчүн байланышка өтүңүз',
        });
        break;
      case 'send_reminder':
        setIsAiDraftOpen(true);
        break;
      case 'follow_up':
        setIsAiDraftOpen(true);
        break;
      case 'escalate':
        toast({
          title: 'Жогорку деңгээлге өткөрүү',
          description: 'Бул келишим жогорку деңгээлге өткөрүлдү',
        });
        break;
      default:
        toast({
          title: 'Аракет аткарылды',
          description: `${action.action} аракети аткарылды`,
        });
    }
  };

  const handleAiFeedback = async (feedback: FeedbackRequest) => {
    await aiApi.submitFeedback(feedback);
  };

  const refreshIntelligenceData = () => {
    if (!deal || !isAiOperationalIntelligenceEnabled) return;
    setIntelligenceError(null);
    setIntelligenceRefreshKey((current) => current + 1);
  };

  // Handle suggestion application
  const handleApplySuggestions = async (acceptedSuggestions: { field: string; value: string }[]) => {
    if (!deal) return;

    try {
      toast({
        title: 'Сунуштар колдонулду',
        description: `${acceptedSuggestions.length} өзгөртүү колдонулду`,
      });
    } catch (error) {
      toast({
        title: 'Ката кетти',
        description: 'Сунуштарды колдонууда ката кетти',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (error || !deal) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Келишим" actions={<Button variant="outline" onClick={() => navigate('/deals')}><ArrowLeft className="mr-2 h-4 w-4" />Артка</Button>} />
        <PageError message={error || 'Келишим табылган жок'} onRetry={() => navigate('/deals')} actionLabel="Тизмеге кайтуу" />
      </div>
    );
  }

  const paymentSummary = payments[0]?.dealPaymentSummary ?? null;

  const handleSaveLmsData = async () => {
    setIsSaving(true);
    try {
      const updatedDeal = await dealsApi.update(deal.id, {
        lmsCourseId: editForm.lmsCourseId,
        lmsGroupId: editForm.lmsGroupId,
        courseType: editForm.courseType || null,
        courseNameSnapshot: editForm.courseNameSnapshot,
        groupNameSnapshot: editForm.groupNameSnapshot,
      });
      setDeal(updatedDeal);
      setEditOpen(false);
      toast({
        title: 'Окуу маалыматы жаңыртылды',
        description: 'Келишимдеги курс жана группа сакталды.',
      });
    } catch (error) {
      const friendly = getFriendlyError(error, { fallbackTitle: 'Келишимди жаңыртуу ишке ашкан жок' });
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseDraft = (message: string) => {
    setAiDraftMessage(message);
    toast({
      title: 'Сунуш кошулду',
      description: 'Сунушталган жооп төмөнкү талаага жайгаштырылды.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Келишим #${deal.id}`}
        description={contact?.fullName || (isLmsBridgeEnabled ? (deal.lmsMapping?.courseNameSnapshot || 'Окуу байланышы көрсөтүлгөн эмес') : undefined)}
        actions={
          <div className="flex w-full items-center justify-between gap-2 sm:flex-wrap sm:justify-end">
            <div className="flex items-center gap-2 sm:hidden">
              <Button className="h-9" variant="outline" onClick={() => navigate('/deals')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Артка
              </Button>
              <Button className="h-9" onClick={() => navigate(`/payments?create=1&dealId=${deal.id}`)}>
                Төлөм кошуу
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 w-9 sm:hidden" variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAiDraftsEnabled ? (
                  <DropdownMenuItem onClick={() => setIsAiDraftOpen(true)}>
                    AI жооп сунушу
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => navigate(`/payments?create=1&dealId=${deal.id}`)}>
                  Төлөм кошуу
                </DropdownMenuItem>
                {isLmsBridgeEnabled ? (
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    Продукт маалыматты оңдоо
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden sm:flex sm:flex-wrap sm:justify-end sm:gap-2">
              <Button className="h-9" variant="outline" onClick={() => navigate('/deals')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Артка
              </Button>
              <Button className="h-9" onClick={() => navigate(`/payments?create=1&dealId=${deal.id}`)}>
                Төлөм кошуу
              </Button>
              <div className="ml-1 flex items-center gap-2 rounded-full border border-border/70 bg-muted/20 px-2 py-1">
                {isAiDraftsEnabled ? (
                  <Button className="h-8" variant="ghost" onClick={() => setIsAiDraftOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI жооп сунушу
                  </Button>
                ) : null}
                {isLmsBridgeEnabled ? (
                  <Button className="h-8" variant="ghost" onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Продукт маалыматты оңдоо
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        }
      />
      <Card className="border-border/60 bg-card shadow-card">
        <CardContent className="p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {ky.dealPipelineStage[deal.pipelineStage] || deal.pipelineStage}
                </Badge>
                {paymentSummary ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    Калганы: {paymentSummary.remaining.toLocaleString()} сом
                  </Badge>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryStat label="Сумма" value={`${deal.amount.toLocaleString()} ${deal.currency || 'KGS'}`} icon={CreditCard} />
                <SummaryStat label="Байланыш" value={contact?.fullName || 'Байланыш жок'} icon={User} />
                <SummaryStat label="Түзүлгөн күнү" value={formatDate(deal.createdAt)} icon={Calendar} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <ActionTile
                label="Төлөм кошуу"
                value="Төлөмдү дароо каттоо"
                onClick={() => navigate(`/payments?create=1&dealId=${deal.id}`)}
                icon={CreditCard}
              />
              <ActionTile
                label={ky.common.phone}
                value={contact?.phone || 'Телефон жок'}
                href={contact?.phone ? `tel:${contact.phone}` : undefined}
                icon={Phone}
                muted={!contact?.phone}
              />
              <ActionTile
                label={ky.common.email}
                value={contact?.email || 'Email жок'}
                href={contact?.email ? `mailto:${contact.email}` : undefined}
                icon={Mail}
                muted={!contact?.email}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        {aiDraftMessage ? (
          <AiDraftHandoffCard
            value={aiDraftMessage}
            onChange={setAiDraftMessage}
            onClear={() => setAiDraftMessage('')}
            className="xl:col-span-2"
          />
        ) : null}

        <div className="space-y-6">
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Келишим маалыматы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={User} label="Байланыш" value={contact?.fullName || '—'} />
                <InfoRow icon={CreditCard} label="Сумма" value={`${deal.amount.toLocaleString()} ${deal.currency || 'KGS'}`} />
                <InfoRow icon={Phone} label={ky.common.phone} value={contact?.phone || '—'} />
                <InfoRow icon={Mail} label={ky.common.email} value={contact?.email || '—'} />
              </div>
              {deal.notes ? (
                <div className="rounded-xl bg-muted/45 p-3 text-sm text-muted-foreground">{deal.notes}</div>
              ) : (
                <p className="text-sm text-muted-foreground">Кошумча эскертүү жок.</p>
              )}
            </CardContent>
          </Card>

          {isLmsBridgeEnabled && deal.lmsMapping ? (
            <DealCourseMapping
              lmsCourseId={deal.lmsMapping.lmsCourseId}
              lmsGroupId={deal.lmsMapping.lmsGroupId}
              courseType={deal.lmsMapping.courseType}
              courseNameSnapshot={deal.lmsMapping.courseNameSnapshot}
              groupNameSnapshot={deal.lmsMapping.groupNameSnapshot}
              dealId={deal.id}
              contactLmsStudentId={contactBridgeData?.lmsStudentId}
            />
          ) : null}
        </div>

        <div className="space-y-4 xl:sticky xl:top-6">
          {isAiOperationalIntelligenceEnabled && (
            <>
              {(priorityScore || riskScore) && (
                <Card className="shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-orange-500" />
                      AI анализ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PriorityIndicator
                      priority={priorityScore}
                      risk={riskScore}
                      showDetails={true}
                    />
                  </CardContent>
                </Card>
              )}

              <NextBestActionCard
                action={nextBestAction}
                targetType="deal"
                targetId={Number(deal.id)}
                onActionExecute={handleNextBestAction}
                loading={intelligenceLoading}
                error={intelligenceError}
              />
              {nextBestAction?.aiRequestId && (
                <AiFeedbackControls
                  targetType="deal"
                  targetId={Number(deal.id)}
                  feature="next_best_action"
                  aiRequestId={nextBestAction.aiRequestId}
                  disabled={intelligenceLoading}
                  onFeedbackSubmit={handleAiFeedback}
                />
              )}

              <CommunicationSummary
                summary={communicationSummary || undefined}
                targetType="deal"
                targetId={Number(deal.id)}
                onRefresh={refreshIntelligenceData}
                loading={intelligenceLoading && !communicationSummary}
                error={intelligenceError}
              />
              {communicationSummary?.aiRequestId && (
                <AiFeedbackControls
                  targetType="deal"
                  targetId={Number(deal.id)}
                  feature="timeline_summary"
                  aiRequestId={communicationSummary.aiRequestId}
                  disabled={intelligenceLoading}
                  onFeedbackSubmit={handleAiFeedback}
                />
              )}

              {extractionSuggestions && (
                <Card className="shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-orange-500" />
                      AI сунуштары
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        AI тарабынан {extractionSuggestions.suggestions.length} өзгөртүү сунушталды
                      </p>
                      <Button
                        onClick={() => setIsSuggestionReviewOpen(true)}
                        variant="outline"
                        size="sm"
                      >
                        Сунуштарды кароо
                      </Button>
                      {extractionSuggestions.aiRequestId && (
                        <AiFeedbackControls
                          targetType="deal"
                          targetId={Number(deal.id)}
                          feature="extraction"
                          aiRequestId={extractionSuggestions.aiRequestId}
                          disabled={intelligenceLoading}
                          onFeedbackSubmit={handleAiFeedback}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Төлөмдөр
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentSummary ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <MiniMetric label="Жалпы сумма" value={`${paymentSummary.dealTotal.toLocaleString()} сом`} />
                  <MiniMetric label="Ырасталган төлөм" value={`${paymentSummary.confirmedPaid.toLocaleString()} сом`} />
                  <MiniMetric label="Депозит" value={`${paymentSummary.depositPaid.toLocaleString()} сом`} />
                  <MiniMetric label="Калганы" value={`${paymentSummary.remaining.toLocaleString()} сом`} />
                </div>
              ) : null}
              {paymentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Төлөмдөр жүктөлүүдө...
                </div>
              ) : payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Бул келишим боюнча төлөм табылган жок.</p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium">{payment.amount.toLocaleString()} сом</p>
                      <PaymentStatusBadge status={payment.paymentStatus || payment.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPaymentMethod(payment.method)}
                      {payment.paidAt ? ` • ${formatDate(payment.paidAt)}` : ''}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {isLmsBridgeEnabled && canViewIntegrationHistory() && contactBridgeData?.lmsStudentId ? (
            <Card className="shadow-card border-border/50">
              <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base leading-tight">
                  <Workflow className="h-4 w-4" />
                  Интеграция тарыхы
                </CardTitle>
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/enrollments?crmDealId=${deal.id}${contactBridgeData.lmsStudentId ? `&studentId=${encodeURIComponent(contactBridgeData.lmsStudentId)}` : ''}`)}
                >
                  Толук тарых
                </Button>
              </CardHeader>
              <CardContent>
                <IntegrationHistoryPanel
                  initialFilters={{
                    crmDealId: deal.id,
                    crmContactId: contact?.id,
                    lmsStudentId: contactBridgeData.lmsStudentId,
                  }}
                />
              </CardContent>
            </Card>
          ) : null}

          {isFeatureEnabled('whatsapp_integration_enabled') ? (
            <RecordWhatsAppTimelineCard
              dealId={deal.id}
              contactId={contact?.id}
              leadId={deal.leadId || undefined}
            />
          ) : null}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Окуу маалыматын оңдоо</DialogTitle>
            <DialogDescription>Келишим ушул курс жана группа менен байланышат. Төлөм жана enrollment логикасы ушул маалыматка таянат.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <LmsCourseContextFields
              value={{
                lmsCourseId: editForm.lmsCourseId,
                lmsGroupId: editForm.lmsGroupId,
                courseType: editForm.courseType,
                courseNameSnapshot: editForm.courseNameSnapshot,
                groupNameSnapshot: editForm.groupNameSnapshot,
              }}
              onChange={(next) => setEditForm(next)}
              courseLabel="Курс"
              groupLabel="Группа"
              description="Келишимдеги акыркы окуу тандоосу ушул жерде сакталат. Төлөм жана enrollment ушул мааниге таянат."
            />
          </div>
          <DialogFooter className="border-t border-border/60 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Жабуу
            </Button>
            <Button onClick={handleSaveLmsData} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Сактоо
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isAiDraftsEnabled ? (
        <AiDraftModal
          open={isAiDraftOpen}
          onOpenChange={setIsAiDraftOpen}
          targetType="deal"
          targetId={deal.id}
          targetName={`Келишим #${deal.id}`}
          onUseDraft={handleUseDraft}
        />
      ) : null}

      {/* Release 2 - Structured Suggestion Review Dialog */}
      {isAiOperationalIntelligenceEnabled && extractionSuggestions && (
        <StructuredSuggestionReview
          suggestions={extractionSuggestions}
          open={isSuggestionReviewOpen}
          onOpenChange={setIsSuggestionReviewOpen}
          onApplySuggestions={handleApplySuggestions}
          loading={intelligenceLoading}
          error={intelligenceError}
        />
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CreditCard;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActionTile({
  label,
  value,
  href,
  onClick,
  icon: Icon,
  muted = false,
}: {
  label: string;
  value: string;
  href?: string;
  onClick?: () => void;
  icon: typeof CreditCard;
  muted?: boolean;
}) {
  const classes = `flex items-start gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors ${
    muted ? 'bg-muted/25 text-muted-foreground' : 'bg-background hover:bg-muted/40'
  }`;

  const content = (
    <>
      <span className="mt-0.5 rounded-lg bg-muted/70 p-2">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <span className="mt-1 block truncate text-sm font-medium text-foreground">{value}</span>
      </span>
    </>
  );

  if (href && !muted) {
    return <a href={href} className={classes}>{content}</a>;
  }

  if (onClick && !muted) {
    return <button type="button" onClick={onClick} className={classes}>{content}</button>;
  }

  return <div className={classes}>{content}</div>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-3">
      <span className="rounded-lg bg-muted/70 p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status?: string }) {
  const variant =
    status === 'confirmed'
      ? 'default'
      : status === 'failed' || status === 'refunded' || status === 'overdue'
        ? 'destructive'
        : 'secondary';
  const label =
    status === 'submitted'
      ? 'Жиберилди'
      : status === 'confirmed'
        ? 'Ырасталды'
        : status === 'failed'
          ? 'Ишке ашкан жок'
          : status === 'refunded'
            ? 'Кайтарылды'
            : status === 'overdue'
              ? 'Мөөнөтү өткөн'
              : status || '—';
  return <Badge variant={variant}>{label}</Badge>;
}

function formatPaymentMethod(value?: string) {
  if (value === 'card') return 'Карта';
  if (value === 'qr') return 'QR';
  if (value === 'bank') return 'Банк';
  if (value === 'manual') return 'Кол менен';
  return value || '—';
}
