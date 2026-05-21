import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageError, PageHeader, PageLoading } from '@/components/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ky } from '@/lib/i18n';
import { contactApi, bridgeApi } from '@/api/modules';
import type { Contact } from '@/types';
import type { ContactWithStudentMapping } from '@/types/bridge';
import { User, Phone, Mail, Link2, BookOpen, Workflow, GraduationCap, Pencil, Trash2, Copy, Loader2, ArrowLeft, Calendar, Activity, Sparkles, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions } from '@/hooks/use-role-permissions';
import { useFeatureFlags } from '@/components/core/FeatureFlagProvider';
import { useLmsBridge } from '@/components/lms/LmsBridgeProvider';
import { ContactStudentMapping } from '@/components/lms/ContactStudentMapping';
import { useCreateStudentOnboardingLink, useLmsIntegrationHistory, useLmsStudentSummary } from '@/hooks/use-lms';
import { ScheduleTimelineEventDialog } from '@/components/ScheduleTimelineEventDialog';
import { ScheduledTimelineEventsCard } from '@/components/ScheduledTimelineEventsCard';
import { getFriendlyError } from '@/lib/error-messages';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AiDraftModal } from '@/components/ai/AiDraftModal';
import { AiDraftHandoffCard } from '@/components/ai/AiDraftHandoffCard';
import { AiFeedbackControls } from '@/components/ai/AiFeedbackControls';
import { CommunicationSummary, CommunicationSummary as CommunicationSummaryType } from '@/components/ai/CommunicationSummary';
import { aiApi, type TimelineSummaryResult, type FeedbackRequest } from '@/api/ai';
import { RecordWhatsAppTimelineCard } from '@/components/whatsapp/RecordWhatsAppTimelineCard';

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFeatureEnabled } = useFeatureFlags();
  const { canViewLmsTechnicalFields, canViewStudentSummary, canViewIntegrationHistory } = useRolePermissions();
  const { isLmsBridgeEnabled } = useLmsBridge();
  const isAiDraftsEnabled =
    isFeatureEnabled('ai_assist_enabled') && isFeatureEnabled('ai_followup_drafts_enabled');
  const isAiOperationalIntelligenceEnabled =
    isFeatureEnabled('ai_assist_enabled') && isFeatureEnabled('ai_operator_guidance_enabled');
  const [contact, setContact] = useState<Contact | null>(null);
  const [bridgeData, setBridgeData] = useState<ContactWithStudentMapping | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAiDraftOpen, setIsAiDraftOpen] = useState(false);
  const [aiDraftMessage, setAiDraftMessage] = useState('');
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);

  // Release 2 - Communication Summary State
  const [communicationSummary, setCommunicationSummary] = useState<CommunicationSummaryType | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    contactApi.get(Number(id))
      .then((data) => {
        setContact(data);
        setOnboardingLink(null);
      })
      .catch(() => setError('Байланыш табылган жок'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    const canReadBridgeData =
      canViewStudentSummary() || canViewIntegrationHistory() || canViewLmsTechnicalFields();

    if (!contact || !isLmsBridgeEnabled || !canReadBridgeData) {
      setBridgeData(null);
      return;
    }
    bridgeApi.getContactBridgeData(contact.id)
      .then((data) => setBridgeData(data))
      .catch(() => setBridgeData(null));
  }, [contact, isLmsBridgeEnabled, canViewIntegrationHistory, canViewLmsTechnicalFields, canViewStudentSummary]);

  const {
    data: studentSummary,
    isLoading: lmsLoading,
    isError: lmsError,
  } = useLmsStudentSummary(
    isLmsBridgeEnabled && canViewStudentSummary() ? (bridgeData?.lmsStudentId || undefined) : undefined
  );
  const {
    data: historyData,
    isLoading: historyLoading,
  } = useLmsIntegrationHistory(
    isLmsBridgeEnabled && canViewLmsTechnicalFields() ? {
      crmContactId: contact?.id,
      lmsStudentId: bridgeData?.lmsStudentId,
      limit: 5,
    } : undefined,
  );
  const createOnboardingLinkMutation = useCreateStudentOnboardingLink();

  useEffect(() => {
    if (!contact) return;
    setForm({
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email || '',
      notes: contact.notes || '',
    });
  }, [contact]);

  // Release 2 - Load communication summary
  useEffect(() => {
    if (!contact || !isAiOperationalIntelligenceEnabled) return;

    const loadCommunicationSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);

      try {
        const contactId = Number(contact.id);
        const summaryData = await aiApi.getTimelineSummary('contact', contactId);
        setCommunicationSummary(summaryData);
      } catch (err) {
        console.warn('Failed to load communication summary:', err);
        setSummaryError('Байланышуу жыйынтыгын жүктөө мүмкүн болгон жок');
      } finally {
        setSummaryLoading(false);
      }
    };

    loadCommunicationSummary();
  }, [contact, isAiOperationalIntelligenceEnabled, summaryRefreshKey]);

  const handleAiFeedback = async (feedback: FeedbackRequest) => {
    await aiApi.submitFeedback(feedback);
  };

  const refreshCommunicationSummary = () => {
    if (!contact || !isAiOperationalIntelligenceEnabled) return;
    setSummaryError(null);
    setSummaryRefreshKey((current) => current + 1);
  };

  const resetEditForm = () => {
    if (!contact) {
      setIsEditOpen(false);
      return;
    }

    setForm({
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email || '',
      notes: contact.notes || '',
    });
    setIsEditOpen(false);
  };

  const handleSave = async () => {
    if (!contact || !form.fullName || !form.phone) return;

    setIsSaving(true);
    try {
      const updatedContact = await contactApi.update(contact.id, {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        notes: form.notes || undefined,
      });
      setContact(updatedContact);
      setIsEditOpen(false);
      toast({ title: 'Байланыш ийгиликтүү өзгөртүлдү' });
    } catch (error) {
      const friendly = getFriendlyError(error, { fallbackTitle: 'Байланышты сактоо ишке ашкан жок' });
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOnboardingLink = () => {
    if (!bridgeData?.lmsStudentId) return;

    createOnboardingLinkMutation.mutate(
      { studentId: bridgeData.lmsStudentId },
      {
        onSuccess: async (response) => {
          const setupLink = response.onboarding?.setupLink || null;
          setOnboardingLink(setupLink);

          if (!setupLink) {
            toast({ title: 'Жаңы LMS кирүү шилтемеси түзүлгөн жок', variant: 'destructive' });
            return;
          }

          try {
            await navigator.clipboard.writeText(setupLink);
            toast({ title: 'LMS кирүү шилтемеси көчүрүлдү' });
          } catch {
            toast({ title: 'LMS кирүү шилтемеси даяр болду' });
          }
        },
      },
    );
  };

  const handleCopyOnboardingLink = async () => {
    if (!onboardingLink) return;

    try {
      await navigator.clipboard.writeText(onboardingLink);
      toast({ title: 'LMS кирүү шилтемеси көчүрүлдү' });
    } catch {
      toast({ title: 'Шилтемени көчүрүү мүмкүн болгон жок', variant: 'destructive' });
    }
  };

  const handleUseDraft = (message: string) => {
    setAiDraftMessage(message);
    toast({
      title: 'Сунуш кошулду',
      description: 'Сунушталган жооп төмөнкү талаага жайгаштырылды.',
    });
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (error || !contact) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Байланыш" actions={<Button variant="outline" onClick={() => navigate('/contacts')}><ArrowLeft className="mr-2 h-4 w-4" />{ky.common.back}</Button>} />
        <PageError message={error || 'Байланыш табылган жок'} onRetry={() => navigate('/contacts')} actionLabel="Тизмеге кайтуу" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={contact.fullName}
        actions={
          <div className="flex w-full items-center justify-between gap-2 sm:flex-wrap sm:justify-end">
            <div className="flex items-center gap-2 sm:hidden">
              <Button className="h-9" variant="outline" onClick={() => navigate('/contacts')}>
                <ArrowLeft className="mr-2 h-4 w-4" />{ky.common.back}
              </Button>
              <Button className="h-9" onClick={() => setIsEditOpen(true)}>{ky.common.edit}</Button>
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
                <DropdownMenuItem onClick={() => setIsScheduleOpen(true)}>
                  Пландоо
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden sm:flex sm:flex-wrap sm:justify-end sm:gap-2">
              <Button className="h-9" variant="outline" onClick={() => navigate('/contacts')}>
                <ArrowLeft className="mr-2 h-4 w-4" />{ky.common.back}
              </Button>
              <Button className="h-9" variant="outline" onClick={() => setIsScheduleOpen(true)}>
                <Calendar className="mr-2 h-4 w-4" />
                Пландоо
              </Button>
              <div className="ml-1 flex items-center gap-2 rounded-full border border-border/70 bg-muted/20 px-2 py-1">
                <Button className="h-8" variant="ghost" onClick={() => setIsEditOpen(true)}>{ky.common.edit}</Button>
                {isAiDraftsEnabled ? (
                  <Button className="h-8" variant="ghost" onClick={() => setIsAiDraftOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI жооп сунушу
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        }
      />
      <Card className="border-border/60 bg-card shadow-card">
        <CardContent className="p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">Байланыш</Badge>
                {bridgeData?.lmsStudentId ? <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">LMS менен байланышкан</Badge> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryStat label="Телефон" value={contact.phone} icon={Phone} />
                <SummaryStat label="Email" value={contact.email || 'Email жок'} icon={Mail} />
                <SummaryStat label="Түзүлгөн күнү" value={formatDateTime(contact.createdAt)} icon={Calendar} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <ActionTile label={ky.common.phone} value={contact.phone} href={`tel:${contact.phone}`} icon={Phone} />
              <ActionTile label={ky.common.email} value={contact.email || 'Email жок'} href={contact.email ? `mailto:${contact.email}` : undefined} icon={Mail} muted={!contact.email} />
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
            <CardHeader><CardTitle className="text-base">{ky.contacts.infoTitle}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={User} label={ky.common.name} value={contact.fullName} />
                <InfoRow icon={Phone} label={ky.common.phone} value={contact.phone} />
                <InfoRow icon={Mail} label={ky.common.email} value={contact.email || '—'} />
              </div>
            </CardContent>
          </Card>
          {isLmsBridgeEnabled && canViewLmsTechnicalFields() && bridgeData ? (
            <ContactStudentMapping
              lmsStudentId={bridgeData.lmsStudentId}
              externalStudentId={bridgeData.externalStudentId}
              contactId={contact.id}
            />
          ) : null}
        </div>

        <div className="space-y-4 xl:sticky xl:top-6">
          {isAiOperationalIntelligenceEnabled && (
            <>
              <CommunicationSummary
                summary={communicationSummary || undefined}
                targetType="contact"
                targetId={Number(contact.id)}
                onRefresh={refreshCommunicationSummary}
                loading={summaryLoading}
                error={summaryError}
              />
              {communicationSummary?.aiRequestId && (
                <AiFeedbackControls
                  targetType="contact"
                  targetId={Number(contact.id)}
                  feature="timeline_summary"
                  aiRequestId={communicationSummary.aiRequestId}
                  disabled={summaryLoading}
                  onFeedbackSubmit={handleAiFeedback}
                />
              )}
            </>
          )}
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="text-base">{ky.common.notes}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{contact.notes || 'Эскертүүлөр жок'}</p>
            </CardContent>
          </Card>

          {isLmsBridgeEnabled && canViewStudentSummary() && bridgeData?.lmsStudentId && (
            <Card className="shadow-card border-border/50">
              <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="text-base flex items-center gap-2 leading-tight">
                  <BookOpen className="h-4 w-4" />
                  {ky.contacts.lmsInfoTitle}
                </CardTitle>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateOnboardingLink}
                    disabled={createOnboardingLinkMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {createOnboardingLinkMutation.isPending ? 'Түзүлүүдө...' : ky.contacts.newLmsLink}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {onboardingLink && (
                  <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Жаңы LMS кирүү шилтемеси</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{onboardingLink}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyOnboardingLink}
                        className="w-full sm:w-auto"
                      >
                        Шилтемени көчүрүү
                      </Button>
                    </div>
                  </div>
                )}

                {lmsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    LMS маалыматы жүктөлүүдө...
                  </div>
                ) : lmsError || !studentSummary ? (
                  <p className="text-sm text-muted-foreground">LMS маалыматын алуу мүмкүн болбоду.</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{studentSummary.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        LMS ID: {studentSummary.studentId}
                      </p>
                      {studentSummary.phone && (
                        <p className="text-xs text-muted-foreground">{studentSummary.phone}</p>
                      )}
                      {studentSummary.email && (
                        <p className="text-xs text-muted-foreground">{studentSummary.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Каттоолор</p>
                      {studentSummary.enrollments?.length ? (
                        studentSummary.enrollments.map((enrollment) => (
                          <div key={enrollment.enrollmentId} className="rounded-md border p-3 space-y-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{enrollment.courseName || enrollment.courseId}</p>
                                <p className="text-xs text-muted-foreground">
                                  {enrollment.groupName || enrollment.groupId || 'Топсуз каттоо'}
                                </p>
                              </div>
                              <EnrollmentStatusBadge status={enrollment.status} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Каттоо ID: {enrollment.enrollmentId}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Каттоолор табылган жок.</p>
                      )}
                    </div>

                    {studentSummary.academic && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Академиялык көрүнүш
                        </p>
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                          <Metric label="Катышуу" value={studentSummary.academic.attendanceRate} />
                          <Metric label="Үй тапшырма" value={studentSummary.academic.homeworkCompletionRate} />
                          <Metric label="Тест катышуу" value={studentSummary.academic.quizParticipationRate} />
                          <Metric label="Жалпы прогресс" value={studentSummary.academic.progressPercent} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {isLmsBridgeEnabled && canViewIntegrationHistory() && bridgeData?.lmsStudentId && (
            <Card className="shadow-card border-border/50">
              <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base leading-tight">
                  <Workflow className="h-4 w-4" />
                  LMS окуялары
                </CardTitle>
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/enrollments?crmContactId=${contact.id}${bridgeData?.lmsStudentId ? `&studentId=${encodeURIComponent(bridgeData.lmsStudentId)}` : ''}`)}
                >
                  Толук тарых
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {historyLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    LMS окуялары жүктөлүүдө...
                  </div>
                ) : !historyData?.data?.length ? (
                  <p className="text-sm text-muted-foreground">LMS окуялары табылган жок.</p>
                ) : (
                  historyData.data.map((item) => (
                    <div key={item.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {item.source === 'outbound' ? 'CRM → LMS' : 'LMS → CRM'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.endpoint || '—'} • {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                        <HistoryStatusBadge status={item.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.message || 'Интеграция окуясы'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {item.enrollmentStatus ? <span>Статус: {item.enrollmentStatus}</span> : null}
                        {item.requestId ? <span>Request ID: {item.requestId}</span> : null}
                        {item.eventId ? <span>Event ID: {item.eventId}</span> : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          <ScheduledTimelineEventsCard
            contactId={contact.id}
            refreshKey={scheduleRefreshKey}
          />
          {isFeatureEnabled('whatsapp_integration_enabled') ? (
            <RecordWhatsAppTimelineCard contactId={contact.id} />
          ) : null}
        </div>
      </div>
      {isScheduleOpen && (
        <ScheduleTimelineEventDialog
          open={isScheduleOpen}
          onOpenChange={setIsScheduleOpen}
          defaultType="call"
          contactId={contact.id}
          onSaved={() => setScheduleRefreshKey((prev) => prev + 1)}
        />
      )}
      {isAiDraftsEnabled ? (
        <AiDraftModal
          open={isAiDraftOpen}
          onOpenChange={setIsAiDraftOpen}
          targetType="contact"
          targetId={contact.id}
          targetName={contact.fullName}
          onUseDraft={handleUseDraft}
        />
      ) : null}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        if (!open) {
          resetEditForm();
          return;
        }
        setIsEditOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ky.contacts.editTitle}</DialogTitle>
            <DialogDescription>Байланыштын негизги маалыматын жаңыртыңыз. Өзгөрүүлөр карточкада дароо колдонулат.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">Негизги байланыш</p>
                <p className="text-xs text-muted-foreground">Аты жана телефону талап кылынат.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{ky.common.name} *</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder={ky.common.fullNamePlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{ky.common.phone} *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+996 ..."
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{ky.common.email}</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder={ky.common.emailPlaceholder}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">Эскертүү</p>
                <p className="text-xs text-muted-foreground">Команда үчүн пайдалуу контекстти ушул жерде сактаңыз.</p>
              </div>
              <div className="space-y-2">
                <Label>{ky.common.notes}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={ky.common.notesPlaceholder}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-border/60 pt-4">
            <Button variant="outline" onClick={resetEditForm} disabled={isSaving}>
              {ky.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.fullName || !form.phone}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ky.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="rounded-md bg-muted p-2"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActionTile({ icon: Icon, label, value, href, muted = false }: { icon: React.ElementType; label: string; value: string; href?: string; muted?: boolean }) {
  const content = (
    <div className="rounded-xl border border-border/60 bg-background p-3 transition-colors hover:bg-muted/20">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-sm font-semibold ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>{value}</p>
    </div>
  );
  return href ? <a href={href} className="block">{content}</a> : content;
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'active' || status === 'completed'
      ? 'default'
      : status === 'cancelled'
        ? 'destructive'
        : 'secondary';

  const label =
    status === 'pending'
      ? 'Күтүүдө'
      : status === 'active'
        ? 'Активдүү'
        : status === 'completed'
          ? 'Аяктаган'
          : status === 'cancelled'
            ? 'Жокко чыгарылган'
            : status;

  return <Badge variant={variant}>{label}</Badge>;
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? 0}%</p>
    </div>
  );
}

function HistoryStatusBadge({ status }: { status?: string | null }) {
  const variant =
    status === 'success' || status === 'received' || status === 'active'
      ? 'default'
      : status === 'error' || status === 'failed' || status === 'cancelled'
        ? 'destructive'
        : 'secondary';

  return <Badge variant={variant}>{status || '—'}</Badge>;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ky-KG', { dateStyle: 'short', timeStyle: 'short' });
}
