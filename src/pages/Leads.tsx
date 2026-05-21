import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageHeader } from '@/components/PageShell';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge, getLeadStatusVariant } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/formatting';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ky } from '@/lib/i18n';
import { leadsApi, usersApi } from '@/api/modules';
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions } from '@/hooks/use-role-permissions';
import { useLmsBridge } from '@/components/lms/LmsBridgeProvider';
import { useTenantConfig } from '@/components/core/TenantConfigProvider';
import type { AssignableUser, Lead, LeadSource } from '@/types';
import type { LmsCourseType } from '@/types/lms';
import { Plus, Trash2, Loader2, Phone, Mail, User, GraduationCap, Save, X, RotateCcw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyError } from '@/lib/error-messages';
import { LmsCourseContextFields } from '@/components/lms/LmsCourseContextFields';
import { leadInterestLevelLabels } from '@/lib/lms-formatting';
import { ListPriorityIndicator, PriorityScore, RiskScore } from '@/components/ai/PriorityIndicator';
import { useFeatureFlags } from '@/components/core/FeatureFlagProvider';
import { aiApi, isAiRateLimitError, type LeadPriorityScoreResult, type RiskScoreResult } from '@/api/ai';
import { runWithConcurrencyLimit } from '@/lib/async';

type LeadFormState = Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedManager' | 'company' | 'source' | 'courseType' | 'interestLevel'> & {
  source?: LeadSource;
  assignedManagerId: number;
  tags: string[];
  interestedCourseId: string;
  interestedGroupId: string;
  courseType: LmsCourseType | '';
  interestLevel: 'low' | 'medium' | 'high' | '';
};

export default function LeadsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { tenantConfig } = useTenantConfig();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canAssignLeads, canViewLmsTechnicalFields } = useRolePermissions();
  const { isLmsBridgeEnabled } = useLmsBridge();
  const { isFeatureEnabled } = useFeatureFlags();
  const canAssignToSales = canAssignLeads();
  const isAiOperationalIntelligenceEnabled = isFeatureEnabled('ai_assist_enabled') && isFeatureEnabled('ai_operator_guidance_enabled');
  const getSearchParam = (key: string, fallback = '') => searchParams.get(key) ?? fallback;
  const getPageParam = () => {
    const value = Number(searchParams.get('page'));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  };
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(() => getSearchParam('q'));
  const [statusFilter, setStatusFilter] = useState<string>(() => getSearchParam('status', 'all'));
  const [managerFilter, setManagerFilter] = useState<string>(() => getSearchParam('manager', 'all'));

  // Release 2 - Priority and risk data for leads
  const [leadPriorities, setLeadPriorities] = useState<Record<number, PriorityScore>>({});
  const [leadRisks, setLeadRisks] = useState<Record<number, RiskScore>>({});
  const [priorityLoading, setPriorityLoading] = useState(false);

  // Use tenant-configured lead sources if available, otherwise use hardcoded sources
  const leadSourceOptions = useMemo(() => {
    if (tenantConfig.leadSources && tenantConfig.leadSources.length > 0) {
      return tenantConfig.leadSources.map(source => ({
        value: source.sourceKey as LeadSource,
        label: source.sourceName,
      }));
    }
    return [
      { value: 'instagram' as LeadSource, label: ky.leadSource.instagram },
      { value: 'telegram' as LeadSource, label: ky.leadSource.telegram },
      { value: 'whatsapp' as LeadSource, label: ky.leadSource.whatsapp },
      { value: 'website' as LeadSource, label: ky.leadSource.website },
      { value: 'phone_call' as LeadSource, label: ky.leadSource.phone_call },
      { value: 'referral' as LeadSource, label: ky.leadSource.referral },
    ];
  }, [tenantConfig.leadSources]);

  // Use tenant-configured lead statuses if available, otherwise use hardcoded statuses
  const leadStatusOptions = useMemo(() => {
    if (tenantConfig.leadStatuses && tenantConfig.leadStatuses.length > 0) {
      return tenantConfig.leadStatuses.map(status => ({
        value: status.key,
        label: status.label,
      }));
    }
    return [
      { value: 'new', label: 'Жаңы' },
      { value: 'no_response', label: 'Жооп жок' },
      { value: 'contacted', label: 'Байланыш түзүлдү' },
      { value: 'interested', label: 'Кызыкты' },
      { value: 'offer_sent', label: 'Сунуш жөнөтүлдү' },
      { value: 'negotiation', label: 'Сүйлөшүү жүрүп жатат' },
      { value: 'payment_pending', label: 'Төлөм күтүлүүдө' },
      { value: 'won', label: 'Ийгиликтүү' },
      { value: 'lost', label: 'Жабылды' },
    ];
  }, [tenantConfig.leadStatuses]);
  const [dateFilter, setDateFilter] = useState<string>(() => getSearchParam('date', 'all'));
  const [customFromDate, setCustomFromDate] = useState<string>(() => getSearchParam('from'));
  const [customToDate, setCustomToDate] = useState<string>(() => getSearchParam('to'));
  const [page, setPage] = useState(() => getPageParam());
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [managers, setManagers] = useState<AssignableUser[]>([]);
  const [managerFilterOptions, setManagerFilterOptions] = useState<AssignableUser[]>([]);
  const emptyLeadForm: LeadFormState = {
    fullName: '',
    phone: '',
    email: '',
    source: undefined,
    status: 'new',
    contactId: null,
    assignedManagerId: 0,
    tags: [],
    notes: '',
    interestedCourseId: '',
    interestedGroupId: '',
    courseType: '',
    interestLevel: '',
  };
  const [newLead, setNewLead] = useState(emptyLeadForm);
  const [duplicateCheck, setDuplicateCheck] = useState<{ hasDuplicate: boolean; duplicateFields?: string[]; existingLead?: Lead } | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const duplicateCheckRequestRef = useRef(0);
  const fetchRequestRef = useRef(0);
  const shouldOpenCreate = searchParams.get('create') === '1';

  const clearCreateParam = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('create');
      return next;
    }, { replace: true });
  };

  const fetchLeads = useCallback(() => {
    const requestId = ++fetchRequestRef.current;
    setIsLoading(true);
    setError(null);
    leadsApi.list({
      search,
      status: statusFilter === 'all' ? undefined : statusFilter,
      assignedManagerId: managerFilter === 'all' ? undefined : Number(managerFilter),
      dateRange: dateFilter === 'custom' || dateFilter === 'all' ? undefined : dateFilter,
      fromDate: dateFilter === 'custom' && customFromDate ? customFromDate : undefined,
      toDate: dateFilter === 'custom' && customToDate ? customToDate : undefined,
      page,
      limit: 20,
    })
      .then(async (res) => {
        if (requestId !== fetchRequestRef.current) return;
        setLeads(res.items);
        setTotalItems(res.total || 0);
        setTotalPages(Math.max(res.totalPages || 1, 1));
        setIsLoading(false);

        // Load priority and risk data if AI operational intelligence is enabled
        if (isAiOperationalIntelligenceEnabled && res.items.length > 0) {
          setPriorityLoading(true);
          const priorities: Record<number, PriorityScore> = {};
          const risks: Record<number, RiskScore> = {};
          let priorityRateLimitHit = false;
          let riskRateLimitHit = false;

          await runWithConcurrencyLimit(res.items, 2, async (lead) => {
            if (requestId !== fetchRequestRef.current) return;

            if (!priorityRateLimitHit) {
              try {
                const priorityData = await aiApi.getPriorityScore('lead', lead.id);
                priorities[lead.id] = {
                  score: priorityData.score.score,
                  level: priorityData.score.tier,
                  factors: priorityData.score.breakdown.map(b => ({
                    factor: b.factor,
                    weight: b.weight,
                    contribution: b.contribution,
                    value: b.value
                  })),
                  explanation: `Priority score: ${priorityData.score.score}/${priorityData.score.maxScore}`,
                  maxScore: priorityData.score.maxScore,
                  tier: priorityData.score.tier,
                };
              } catch (err) {
                if (isAiRateLimitError(err)) {
                  priorityRateLimitHit = true;
                } else {
                  console.warn(`Failed to load priority for lead ${lead.id}:`, err);
                }
              }
            }

            if (requestId !== fetchRequestRef.current || riskRateLimitHit) return;

            try {
                const riskData = await aiApi.getRiskScore('lead', lead.id);
                risks[lead.id] = {
                  risk: riskData.risk,
                  reasons: riskData.reasons,
                  score: riskData.score,
                };
            } catch (err) {
              if (isAiRateLimitError(err)) {
                riskRateLimitHit = true;
              } else {
                console.warn(`Failed to load risk for lead ${lead.id}:`, err);
              }
            }
          });

          if (requestId !== fetchRequestRef.current) return;
          setLeadPriorities(priorities);
          setLeadRisks(risks);
          setPriorityLoading(false);
        } else {
          setLeadPriorities({});
          setLeadRisks({});
          setPriorityLoading(false);
        }
      })
      .catch(() => {
        if (requestId !== fetchRequestRef.current) return;
        setLeads([]);
        setTotalItems(0);
        setTotalPages(1);
        setLeadPriorities({});
        setLeadRisks({});
        setPriorityLoading(false);
        setError('Лиддерди жүктөө мүмкүн болгон жок. Тармакты же фильтрлерди текшериңиз.');
      })
      .finally(() => {
        if (requestId === fetchRequestRef.current) {
          setIsLoading(false);
        }
      });
  }, [page, search, statusFilter, managerFilter, dateFilter, customFromDate, customToDate, isAiOperationalIntelligenceEnabled]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const nextSearch = searchParams.get('q') ?? '';
    const nextStatus = searchParams.get('status') ?? 'all';
    const nextManager = searchParams.get('manager') ?? 'all';
    const nextDate = searchParams.get('date') ?? 'all';
    const nextFrom = searchParams.get('from') ?? '';
    const nextTo = searchParams.get('to') ?? '';
    const nextPage = getPageParam();

    if (nextSearch !== search) setSearch(nextSearch);
    if (nextStatus !== statusFilter) setStatusFilter(nextStatus);
    if (nextManager !== managerFilter) setManagerFilter(nextManager);
    if (nextDate !== dateFilter) setDateFilter(nextDate);
    if (nextFrom !== customFromDate) setCustomFromDate(nextFrom);
    if (nextTo !== customToDate) setCustomToDate(nextTo);
    if (nextPage !== page) setPage(nextPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (search) next.set('q', search);
      else next.delete('q');

      if (statusFilter !== 'all') next.set('status', statusFilter);
      else next.delete('status');

      if (managerFilter !== 'all') next.set('manager', managerFilter);
      else next.delete('manager');

      if (dateFilter !== 'all') next.set('date', dateFilter);
      else next.delete('date');

      if (dateFilter === 'custom' && customFromDate) next.set('from', customFromDate);
      else next.delete('from');

      if (dateFilter === 'custom' && customToDate) next.set('to', customToDate);
      else next.delete('to');

      if (page > 1) next.set('page', String(page));
      else next.delete('page');

      return next.toString() === current.toString() ? current : next;
    }, { replace: true });
  }, [search, statusFilter, managerFilter, dateFilter, customFromDate, customToDate, page, setSearchParams]);

  useEffect(() => {
    if (!createOpen) return;
    if (!canAssignToSales) {
      setManagers(user ? [{ id: user.id, fullName: user.fullName || user.email, role: user.role }] : []);
      return;
    }
    usersApi.assignables()
      .then((items) => {
        if (!user) {
          setManagers(items);
          return;
        }

        const hasCurrentUser = items.some((item) => item.id === user.id);
        const nextManagers = hasCurrentUser
          ? items
          : [{ id: user.id, fullName: user.fullName || user.email, role: user.role }, ...items];
        setManagers(nextManagers);
      })
      .catch(() => setManagers([]));
  }, [createOpen, canAssignToSales, user]);

  useEffect(() => {
    if (!user) {
      setManagerFilterOptions([]);
      return;
    }

    if (!canAssignToSales) {
      setManagerFilterOptions([{ id: user.id, fullName: user.fullName || user.email, role: user.role }]);
      return;
    }

    usersApi.assignables()
      .then((items) => {
        const hasCurrentUser = items.some((item) => item.id === user.id);
        setManagerFilterOptions(
          hasCurrentUser
            ? items
            : [{ id: user.id, fullName: user.fullName || user.email, role: user.role }, ...items],
        );
      })
      .catch(() => {
        setManagerFilterOptions([{ id: user.id, fullName: user.fullName || user.email, role: user.role }]);
      });
  }, [canAssignToSales, user]);

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const updateManagerFilter = (value: string) => {
    setManagerFilter(value);
    setPage(1);
  };

  const updateDateFilter = (value: string) => {
    setDateFilter(value);
    if (value !== 'custom') {
      setCustomFromDate('');
      setCustomToDate('');
    }
    setPage(1);
  };

  const updateCustomFromDate = (value: string) => {
    setCustomFromDate(value);
    setPage(1);
  };

  const updateCustomToDate = (value: string) => {
    setCustomToDate(value);
    setPage(1);
  };

  const checkForDuplicates = useCallback(async (phone: string, email?: string) => {
    const normalizedPhone = phone.trim();
    const normalizedEmail = email?.trim() || undefined;
    const requestId = ++duplicateCheckRequestRef.current;

    if (!normalizedPhone) {
      setDuplicateCheck(null);
      setIsCheckingDuplicates(false);
      return null;
    }

    setIsCheckingDuplicates(true);
    try {
      const result = await leadsApi.checkDuplicates({ phone: normalizedPhone, email: normalizedEmail });
      if (requestId === duplicateCheckRequestRef.current) {
        setDuplicateCheck(result);
      }
      return result;
    } catch (error) {
      if (requestId === duplicateCheckRequestRef.current) {
        console.error('Duplicate check failed:', error);
        setDuplicateCheck(null);
      }
      return null;
    } finally {
      if (requestId === duplicateCheckRequestRef.current) {
        setIsCheckingDuplicates(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setNewLead((prev) => (
      prev.assignedManagerId
        ? prev
        : { ...prev, assignedManagerId: user.id }
    ));
  }, [createOpen, user]);

  useEffect(() => {
    if (shouldOpenCreate) {
      setCreateOpen(true);
    }
  }, [shouldOpenCreate]);

  const resetCreateForm = () => {
    duplicateCheckRequestRef.current += 1;
    setIsCheckingDuplicates(false);
    setDuplicateCheck(null);
    setNewLead({
      ...emptyLeadForm,
      assignedManagerId: user ? user.id : 0,
    });
    clearCreateParam();
    setCreateOpen(false);
  };

  useEffect(() => {
    if (!createOpen) {
      duplicateCheckRequestRef.current += 1;
      setIsCheckingDuplicates(false);
      setDuplicateCheck(null);
      return;
    }

    // Check duplicates when phone or email changes
    const timeoutId = setTimeout(() => {
      checkForDuplicates(newLead.phone, newLead.email);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [newLead.phone, newLead.email, createOpen, checkForDuplicates]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await leadsApi.delete(deleteTarget.id);
      toast({ title: ky.leads.deleteSuccess });
      setDeleteTarget(null);
      fetchLeads();
    } catch (error) {
      const friendly = getFriendlyError(error, { fallbackTitle: ky.leads.deleteError });
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.fullName.trim() || !newLead.phone.trim()) return;

    const latestDuplicateCheck = await checkForDuplicates(newLead.phone, newLead.email);
    if (latestDuplicateCheck?.hasDuplicate) {
      toast({
        title: 'Кайталанган лид табылды',
        description: 'Бул телефон номери же email менен лид мурунтан эле бар. Адегенде бар болгон жазууну текшериңиз.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      await leadsApi.create({
        fullName: newLead.fullName.trim(),
        phone: newLead.phone.trim(),
        email: newLead.email.trim() || undefined,
        source: newLead.source || undefined,
        status: newLead.status || undefined,
        assignedManagerId: newLead.assignedManagerId || user?.id,
        tags: newLead.tags.length > 0 ? newLead.tags : undefined,
        notes: newLead.notes || undefined,
        interestedCourseId: isLmsBridgeEnabled ? newLead.interestedCourseId || undefined : undefined,
        interestedGroupId: isLmsBridgeEnabled ? newLead.interestedGroupId || undefined : undefined,
        courseType: isLmsBridgeEnabled ? newLead.courseType || undefined : undefined,
        interestLevel: isLmsBridgeEnabled ? newLead.interestLevel || undefined : undefined,
      });
      toast({ title: 'Лид ийгиликтүү түзүлдү' });
      setCreateOpen(false);
      setNewLead({
        ...emptyLeadForm,
        assignedManagerId: user ? user.id : 0,
      });
      setDuplicateCheck(null);
      clearCreateParam();
      fetchLeads();
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 409) {
        const apiError = error as { details?: { duplicateFields?: string[]; existingLeadId?: number } };
        setDuplicateCheck({
          hasDuplicate: true,
          duplicateFields: apiError.details?.duplicateFields,
          existingLead: apiError.details?.existingLeadId
            ? ({ id: apiError.details.existingLeadId } as Lead)
            : undefined,
        });
      }
      const friendly = getFriendlyError(error, { fallbackTitle: 'Лидди сактоо ишке ашкан жок' });
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (lead: Lead, status: string) => {
    setUpdatingLeadId(lead.id);
    try {
      await leadsApi.update(lead.id, { status });
      await fetchLeads();
      toast({ title: 'Статус ийгиликтүү өзгөртүлдү' });
    } catch (error) {
      const friendly = getFriendlyError(error, { fallbackTitle: 'Статусту өзгөртүү ишке ашкан жок' });
      toast({ title: friendly.title, description: friendly.description, variant: 'destructive' });
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const getLeadQuickActions = (lead: Lead): Array<{ value: string; label: string }> => {
    const status = lead.status;

    switch (status) {
      case 'new':
        return [
          { value: 'contacted', label: 'Байланыштым' },
          { value: 'no_response', label: 'Жооп жок' },
        ];
      case 'contacted':
        return [
          { value: 'interested', label: 'Кызыкты' },
          { value: 'lost', label: 'Жабуу' },
        ];
      case 'interested':
        return [
          { value: 'contacted', label: 'Кайра иштөө' },
          { value: 'lost', label: 'Жоготту' },
        ];
      case 'no_response':
        return [
          { value: 'contacted', label: 'Жооп берди' },
          { value: 'lost', label: 'Жабуу' },
        ];
      case 'lost':
        return [
          { value: 'contacted', label: 'Кайра ачуу' },
        ];
      default:
        return [];
    }
  };

  const mobileBoardColumns = leadStatusOptions
    .filter(({ value }) => statusFilter === 'all' || value === statusFilter)
    .map(({ value, label }) => ({ id: value, title: label }));
  const activeFilters = [
    ...(search.trim()
      ? [{
        key: 'search',
        label: `Издөө: ${search.trim()}`,
        onRemove: () => updateSearch(''),
      }]
      : []),
    ...(statusFilter !== 'all'
      ? [{
        key: 'status',
        label: `Статус: ${leadStatusOptions.find(opt => opt.value === statusFilter)?.label || statusFilter}`,
        onRemove: () => updateStatusFilter('all'),
      }]
      : []),
    ...(managerFilter !== 'all'
      ? [{
        key: 'manager',
        label: `Менеджер: ${managerFilterOptions.find((manager) => String(manager.id) === managerFilter)?.fullName || managerFilter}`,
        onRemove: () => updateManagerFilter('all'),
      }]
      : []),
    ...(dateFilter !== 'all'
      ? [{
        key: 'date',
        label: dateFilter === 'custom'
          ? (customFromDate || customToDate)
            ? `Күн: ${customFromDate || '...'} – ${customToDate || '...'}`
            : 'Күн: өзүңүз тандаңыз'
          : `Күн: ${ky.dateRange[dateFilter as keyof typeof ky.dateRange]}`,
        onRemove: () => {
          updateDateFilter('all');
        },
      }]
      : []),
  ];

  const columns: Column<Lead>[] = [
    {
      key: 'fullName',
      header: ky.common.name,
      render: (l) => (
        <div className="space-y-1">
          <span className="block font-medium">{l.fullName || '—'}</span>
          <span className="text-xs text-muted-foreground">{l.source ? ky.leadSource[l.source] : '—'}</span>
        </div>
      ),
    },
    // Release 2 - Priority/Risk Indicators
    ...(isAiOperationalIntelligenceEnabled ? [{
      key: 'priority',
      header: 'Приоритет',
      render: (l: Lead) => (
        <ListPriorityIndicator
          priority={leadPriorities[l.id]}
          risk={leadRisks[l.id]}
        />
      ),
      className: 'w-20',
    }] : []),
    { key: 'phone', header: ky.common.phone },
    { key: 'assignedManager', header: ky.leads.assignedManager, render: (l) => <span className="block max-w-[140px] truncate text-sm">{l.assignedManager?.fullName || '—'}</span>, className: 'hidden md:table-cell' },
    {
      key: 'status',
      header: ky.common.status,
      render: (l) => (
        <Select
          value={l.status}
          onValueChange={(value) => handleStatusChange(l, value)}
          disabled={updatingLeadId === l.id}
        >
          <SelectTrigger
            className="h-8 w-[168px]"
            onClick={(e) => e.stopPropagation()}
            aria-label={`${l.fullName} абалын өзгөртүү`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {leadStatusOptions.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    { key: 'createdAt', header: ky.common.date, render: (l) => <span className="text-sm text-muted-foreground">{formatDate(l.createdAt)}</span>, className: 'hidden md:table-cell' },
    {
      key: 'actions', header: '', render: (l) => (
        <div className="flex items-center justify-end gap-1">
          {isLmsBridgeEnabled && canViewLmsTechnicalFields() && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/enrollments?crmLeadId=${l.id}`);
              }}
              aria-label={`${l.fullName} үчүн LMS каттоону ачуу`}
            >
              <GraduationCap className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(l); }} aria-label={`${ky.common.delete} ${l.fullName}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (lead: Lead) => {
    const status = lead.status;
    const quickActions = getLeadQuickActions(lead);

    return (
      <div
        className="w-full rounded-2xl border border-border/60 bg-background p-3 text-left shadow-sm transition hover:border-border hover:shadow-md"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge variant={getLeadStatusVariant(status)} dot className="text-[11px]">
                {leadStatusOptions.find(opt => opt.value === status)?.label || status}
              </StatusBadge>
              {lead.source && (
                <span className="text-[11px] text-muted-foreground">{ky.leadSource[lead.source]}</span>
              )}
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{lead.fullName || '—'}</p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 text-sm">
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </a>
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              onClick={(e) => e.stopPropagation()}
              className="hidden items-center gap-1.5 text-muted-foreground hover:text-foreground sm:flex"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </a>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{lead.assignedManager?.fullName || ky.common.notAssigned}</span>
        </div>

        {lead.tags && lead.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lead.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-3 border-t border-border/60 pt-2.5">
          {quickActions.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <Button
                  key={action.value}
                  variant="secondary"
                  size="sm"
                  disabled={updatingLeadId === lead.id}
                  className="h-7 rounded-full px-2.5 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(lead, action.value);
                  }}
                >
                  {updatingLeadId === lead.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-1">
            {isLmsBridgeEnabled && canViewLmsTechnicalFields() && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/enrollments?crmLeadId=${lead.id}`);
                }}
                aria-label={`${lead.fullName} үчүн LMS каттоо`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(lead);
              }}
              aria-label={`${ky.common.delete} ${lead.fullName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setManagerFilter('all');
    setDateFilter('all');
    setCustomFromDate('');
    setCustomToDate('');
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all' || managerFilter !== 'all' || dateFilter !== 'all';
  const pageUnassignedCount = leads.filter((lead) => !lead.assignedManager?.fullName).length;
  const pageInterestedCount = leads.filter((lead) => lead.status === 'interested').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={ky.leads.title}
        description={isMobile ? undefined : "Лиддерди ыкчам квалификациялап, кийинки кадамга жылдырыңыз."}
        actions={
          <Button onClick={() => {
            clearCreateParam();
            setCreateOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {ky.leads.newLead}
          </Button>
        }
      />

      {!isMobile && (
        <>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Издөө
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Аты, телефон, email, тег, менеджер..."
                    value={search}
                    onChange={(e) => updateSearch(e.target.value)}
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Статус
                  </Label>
                  <Select value={statusFilter} onValueChange={updateStatusFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={ky.common.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бардык статус</SelectItem>
                      {leadStatusOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Күн аралыгы
                  </Label>
                  <Select value={dateFilter} onValueChange={updateDateFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={ky.common.filter} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бардык күндөр</SelectItem>
                      <SelectItem value="today">{ky.dateRange.today}</SelectItem>
                      <SelectItem value="week">{ky.dateRange.week}</SelectItem>
                      <SelectItem value="month">{ky.dateRange.month}</SelectItem>
                      <SelectItem value="custom">{ky.dateRange.custom}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Менеджер
                  </Label>
                  <Select value={managerFilter} onValueChange={updateManagerFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={ky.leads.assignedManager} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Баары</SelectItem>
                      {managerFilterOptions.map((manager) => (
                        <SelectItem key={manager.id} value={String(manager.id)}>{manager.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-[420px]">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {ky.dateRange.fromDate}
                  </Label>
                  <Input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => updateCustomFromDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {ky.dateRange.toDate}
                  </Label>
                  <Input
                    type="date"
                    value={customToDate}
                    onChange={(e) => updateCustomToDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
              <Badge variant="secondary" className="h-8 rounded-full px-3">
                {totalItems} лид
              </Badge>
              <Badge variant="secondary" className="h-8 rounded-full px-3">
                Бул бетте {pageUnassignedCount} дайындалбаган
              </Badge>
              <Badge variant="secondary" className="h-8 rounded-full px-3">
                Бул бетте {pageInterestedCount} кызыккан
              </Badge>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="ml-auto h-8 px-3 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Тазалоо
                </Button>
              )}
            </div>

            {activeFilters.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeFilters.map((filter) => (
                  <Badge key={filter.key} variant="secondary" className="gap-1 h-7 px-2.5">
                    {filter.label}
                    <button
                      type="button"
                      onClick={filter.onRemove}
                      className="ml-1 rounded-sm hover:bg-secondary-foreground/20"
                      aria-label={`${filter.label} чыпкасын алып салуу`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Mobile filter section */}
      {isMobile && (
        <div className="rounded-xl bg-muted/30 p-3 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Аты, телефон, email, тег, менеджер..."
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Filter controls row */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={updateStatusFilter}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бардык статус</SelectItem>
                {leadStatusOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={updateDateFilter}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Күн" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бардык күндөр</SelectItem>
                <SelectItem value="today">Бүгүн</SelectItem>
                <SelectItem value="week">Бул жума</SelectItem>
                <SelectItem value="month">Бул ай</SelectItem>
                <SelectItem value="custom">Өзүңүз тандаңыз</SelectItem>
              </SelectContent>
            </Select>
            <Select value={managerFilter} onValueChange={updateManagerFilter}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder={ky.leads.assignedManager} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Баары</SelectItem>
                {managerFilterOptions.map((manager) => (
                  <SelectItem key={manager.id} value={String(manager.id)}>{manager.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearAllFilters}
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                aria-label="Баарын тазалоо"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Custom date fields (conditional) */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Башталган күн</Label>
                <Input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => updateCustomFromDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Аяктаган күн</Label>
                <Input
                  type="date"
                  value={customToDate}
                  onChange={(e) => updateCustomToDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((filter) => (
                <Badge key={filter.key} variant="secondary" className="gap-1 h-7 px-2.5">
                  {filter.label}
                  <button
                    type="button"
                    onClick={filter.onRemove}
                    className="ml-1 rounded-sm hover:bg-secondary-foreground/20"
                    aria-label={`${filter.label} чыпкасын алып салуу`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={leads}
        isLoading={isLoading}
        errorMessage={error || undefined}
        onRetry={fetchLeads}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        totalItemsLabel="лид"
        stickyHeader
        onPageChange={setPage}
        onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
        renderMobileCard={renderMobileCard}
        mobileBoardColumns={mobileBoardColumns}
        getMobileBoardColumnId={(lead) => lead.status}
        mobileBoardEmptyMessage="Бул тилкеде лид жок"
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ky.leads.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{ky.leads.deleteConfirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{ky.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {ky.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={(open) => {
        if (!open) {
          resetCreateForm();
          return;
        }
        setCreateOpen(open);
      }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ky.leads.newLead}</DialogTitle>
            <DialogDescription>Лиддин негизги маалыматын сактап, керек болсо дароо жооптуу кызматкерге дайындаңыз.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">Негизги маалымат</p>
                <p className="text-xs text-muted-foreground">Аты жана телефону милдеттүү. Булак, статус жана owner workflow'ду тездетет.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{ky.common.name} *</Label>
                <Input value={newLead.fullName} onChange={(e) => setNewLead(p => ({ ...p, fullName: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>{ky.common.phone} *</Label>
                <Input value={newLead.phone} onChange={(e) => setNewLead(p => ({ ...p, phone: e.target.value }))} required placeholder="+996 ..." />
              </div>
              <div className="space-y-2">
                <Label>{ky.common.email}</Label>
                <Input type="email" value={newLead.email} onChange={(e) => setNewLead(p => ({ ...p, email: e.target.value }))} />
              </div>

              {/* Duplicate Warning */}
              {duplicateCheck?.hasDuplicate && (
                <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-amber-800 text-xs font-bold">!</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-800">Кайталанган лид табылды</p>
                      <p className="text-xs text-amber-700">
                        {duplicateCheck.duplicateFields?.includes('phone') && (
                          <span>Бул телефон номери менен лид мурунтан эле бар. </span>
                        )}
                        {duplicateCheck.duplicateFields?.includes('email') && (
                          <span>Бул email дареги менен лид мурунтан эле бар. </span>
                        )}
                        {duplicateCheck.existingLead && (
                          <span>Бар болгон лиддин ID: {duplicateCheck.existingLead.id}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>{ky.leads.source}</Label>
                <Select value={newLead.source} onValueChange={(v) => setNewLead(p => ({ ...p, source: v as LeadSource }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={ky.leads.source} />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSourceOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ky.common.status}</Label>
                <Select value={newLead.status} onValueChange={(v) => setNewLead(p => ({ ...p, status: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={ky.common.status} />
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatusOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ky.leads.assignedManager}</Label>
                {canAssignToSales ? (
                  <>
                    <Select value={String(newLead.assignedManagerId || '__none__')} onValueChange={(value) => setNewLead(p => ({ ...p, assignedManagerId: value === '__none__' ? 0 : Number(value) }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Жооптуу кызматкерди тандаңыз" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={String(manager.id)}>
                            {manager.id === user?.id ? `${manager.fullName} (Мен)` : manager.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Бул жерде жаңы лидди sales кызматкерге дайындаса болот.
                    </p>
                  </>
                ) : (
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                    {managers.find((manager) => manager.id === newLead.assignedManagerId)?.fullName
                      || user?.fullName
                      || user?.email
                      || 'Owner дайындалган эмес'}
                  </div>
                )}
              </div>
            </div>
            </div>
            <div className="rounded-2xl border border-border/60 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">Контекст</p>
                <p className="text-xs text-muted-foreground">Тегдер жана белгилер кийинки фильтрлөө менен follow-up үчүн колдонулат.</p>
              </div>
              <div className="space-y-2">
                <Label>{ky.common.tags}</Label>
                <Input value={newLead.tags.join(', ')} onChange={(e) => setNewLead(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} placeholder="IT, Frontend, Ысык лид" />
              </div>
              <div className="mt-4 space-y-2">
                <Label>{ky.common.notes}</Label>
                <Textarea value={newLead.notes} onChange={(e) => setNewLead(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            {isLmsBridgeEnabled ? (
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground">Окуу кызыгуусу</p>
                  <p className="text-xs text-muted-foreground">Курс жана группа тандоосу кийинки келишимди алдын ала толтурат.</p>
                </div>
                <LmsCourseContextFields
                  value={{
                    lmsCourseId: newLead.interestedCourseId || '',
                    lmsGroupId: newLead.interestedGroupId || '',
                    courseType: newLead.courseType,
                    courseNameSnapshot: '',
                    groupNameSnapshot: '',
                  }}
                  onChange={(next) => setNewLead((prev) => ({
                    ...prev,
                    interestedCourseId: next.lmsCourseId,
                    interestedGroupId: next.lmsGroupId,
                    courseType: next.courseType,
                  }))}
                  courseLabel="Кызыккан курс"
                  groupLabel="Кызыккан группа"
                  description="Бул маалымат кийин келишим ачканда автоматтык түрдө сунушталат."
                />
                <div className="space-y-2">
                  <Label>Кызыгуу деңгээли</Label>
                  <Select
                    value={newLead.interestLevel || '__none__'}
                    onValueChange={(value) => setNewLead((prev) => ({
                      ...prev,
                      interestLevel: value === '__none__' ? '' : (value as LeadFormState['interestLevel']),
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Кызыгуу деңгээлин тандаңыз" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Тандалган эмес</SelectItem>
                      <SelectItem value="low">{leadInterestLevelLabels.low}</SelectItem>
                      <SelectItem value="medium">{leadInterestLevelLabels.medium}</SelectItem>
                      <SelectItem value="high">{leadInterestLevelLabels.high}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            <DialogFooter className="border-t border-border/60 pt-4">
              <Button type="button" variant="outline" onClick={resetCreateForm}>{ky.common.cancel}</Button>
              <Button
                type="submit"
                disabled={
                  !newLead.fullName ||
                  !newLead.phone ||
                  isCreating ||
                  isCheckingDuplicates ||
                  duplicateCheck?.hasDuplicate
                }
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCheckingDuplicates && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {duplicateCheck?.hasDuplicate ? 'Кайталанган лид бар' : ky.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog >
    </div >
  );
}
