import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageEmpty, PageError, PageHeader, PageLoading } from '@/components/PageShell';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, getLeadStatusVariant } from '@/components/StatusBadge';
import { ky } from '@/lib/i18n';
import { dealsApi } from '@/api/modules';
import type { Deal, DealPipelineStage } from '@/types';
import { getDealPipelineStage } from '@/lib/crm-status';
import { useTenantConfig } from '@/components/core/TenantConfigProvider';
import { User, DollarSign, TrendingUp, CircleOff, ArrowRight } from 'lucide-react';

export default function PipelinePage() {
  const navigate = useNavigate();
  const { tenantConfig } = useTenantConfig();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string>('new');

  // Use tenant-configured pipeline stages if available, otherwise use hardcoded stages
  const stages = useMemo(() => {
    if (tenantConfig.pipelineStages && tenantConfig.pipelineStages.length > 0) {
      return tenantConfig.pipelineStages.map(stage => ({
        id: stage.key as DealPipelineStage,
        title: stage.label,
      }));
    }
    // Fallback to hardcoded CRM-native stages (no education-specific trial stage)
    return [
      { id: 'new', title: ky.dealPipelineStage.new },
      { id: 'consultation', title: ky.dealPipelineStage.consultation },
      { id: 'negotiation', title: ky.dealPipelineStage.negotiation },
      { id: 'payment_pending', title: ky.dealPipelineStage.payment_pending },
      { id: 'won', title: ky.dealPipelineStage.won },
      { id: 'lost', title: ky.dealPipelineStage.lost },
    ];
  }, [tenantConfig.pipelineStages]);

  const fetchAllDeals = useCallback(async () => {
    const firstPage = await dealsApi.list({ page: 1, limit: 20 });
    const allDeals = [...firstPage.items];
    const totalPages = Math.max(firstPage.totalPages || 1, 1);

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await dealsApi.list({ page, limit: 20 });
      allDeals.push(...response.items);
    }

    return allDeals;
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchAllDeals()
      .then((allDeals) => {
        setDeals(allDeals);
      })
      .catch(() => {
        setDeals([]);
        setLoadError('Келишимдерди жүктөө мүмкүн болгон жок. Кийинчерээк кайра аракет кылыңыз.');
      })
      .finally(() => setIsLoading(false));
  }, [fetchAllDeals]);

  const columns: KanbanColumn<Deal>[] = stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    items: deals.filter((d) => getDealPipelineStage(d, tenantConfig.pipelineStages) === stage.id),
  }));

  const stageSummaries = useMemo(() => {
    const summaryStages = stages
      .filter((stage) => stage.id !== 'lost')
      .map((stage) => ({
        id: stage.id,
        title: stage.title,
        count: deals.filter((deal) => getDealPipelineStage(deal, tenantConfig.pipelineStages) === stage.id).length,
      }));

    return summaryStages.map((stage, index) => {
      const firstCount = summaryStages[0]?.count ?? 0;
      const previousCount = index > 0 ? summaryStages[index - 1].count : 0;

      return {
        ...stage,
        conversionFromPrevious:
          index === 0 || previousCount <= 0
            ? null
            : Number(((stage.count / previousCount) * 100).toFixed(1)),
        conversionFromStart:
          firstCount <= 0
            ? null
            : Number(((stage.count / firstCount) * 100).toFixed(1)),
      };
    });
  }, [deals, stages, tenantConfig.pipelineStages]);

  const lostDealsCount = useMemo(
    () => deals.filter((deal) => getDealPipelineStage(deal, tenantConfig.pipelineStages) === 'lost').length,
    [deals, tenantConfig.pipelineStages],
  );

  const activeDeals = useMemo(
    () => deals.filter((deal) => {
      const stage = getDealPipelineStage(deal, tenantConfig.pipelineStages);
      return stage !== 'won' && stage !== 'lost';
    }),
    [deals, tenantConfig.pipelineStages],
  );

  const totalActiveValue = useMemo(
    () => activeDeals.reduce((sum, deal) => sum + deal.amount, 0),
    [activeDeals],
  );

  const wonDealsValue = useMemo(
    () => deals
      .filter((deal) => getDealPipelineStage(deal, tenantConfig.pipelineStages) === 'won')
      .reduce((sum, deal) => sum + deal.amount, 0),
    [deals, tenantConfig.pipelineStages],
  );

  const bestPerformingStage = stageSummaries.reduce<typeof stageSummaries[number] | null>((best, stage) => {
    if (!best) return stage;
    return stage.count > best.count ? stage : best;
  }, null);

  const renderCard = (deal: Deal) => (
    <Card className="border-border/60 bg-background shadow-sm transition hover:border-border hover:shadow-md">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Кардар</span>
            </div>
            <p className="truncate text-sm font-semibold text-foreground">
              {deal.lead?.fullName || deal.contact?.fullName || '—'}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {deal.amount.toLocaleString()} {tenantConfig.currency}
            </span>
          </div>
          {(() => {
            const stage = getDealPipelineStage(deal, tenantConfig.pipelineStages);
            return (
              <StatusBadge variant={getLeadStatusVariant(stage)}>
                {stages.find((s) => s.id === stage)?.title || ky.dealPipelineStage[stage]}
              </StatusBadge>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) return <PageLoading />;

  if (loadError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title={ky.nav.pipeline}
          description="Келишимдердин агымын, этаптардагы көлөмдү жана жоготууларды көзөмөлдөңүз."
        />
        <PageError message={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title={ky.nav.pipeline}
          description="Келишимдердин агымын, этаптардагы көлөмдү жана жоготууларды көзөмөлдөңүз."
        />
        <PageEmpty message="Азырынча pipeline үчүн келишимдер жок." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={ky.nav.pipeline}
        description="Келишимдердин агымын, этаптардагы көлөмдү жана жоготууларды көзөмөлдөңүз."
      />

      <Card className="border-border/60 bg-card shadow-card">
        <CardContent className="p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {deals.length} келишим
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  Активдүү: {activeDeals.length}
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  Жоголгон: {lostDealsCount}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <PipelineStat
                  icon={DollarSign}
                  label="Активдүү сумма"
                  value={`${totalActiveValue.toLocaleString()} ${tenantConfig.currency}`}
                />
                <PipelineStat
                  icon={TrendingUp}
                  label="Жабылган сумма"
                  value={`${wonDealsValue.toLocaleString()} ${tenantConfig.currency}`}
                />
                <PipelineStat
                  icon={bestPerformingStage ? TrendingUp : CircleOff}
                  label="Эң чоң этап"
                  value={bestPerformingStage ? `${bestPerformingStage.title} (${bestPerformingStage.count})` : '—'}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Этаптардын көрүнүшү
              </p>
              <div className="mt-3 space-y-3">
                {stageSummaries.slice(0, 4).map((stage) => (
                  <div key={stage.id} className="rounded-xl border border-border/50 bg-background px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{stage.title}</span>
                      <span className="text-sm font-semibold text-foreground">{stage.count}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Мурункудан</span>
                      <span>{stage.conversionFromPrevious == null ? '—' : `${stage.conversionFromPrevious.toFixed(1)}%`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stageSummaries.map((stage) => (
          <Card key={stage.id} className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{stage.title}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stage.count}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>Мурункудан: {stage.conversionFromPrevious == null ? '—' : `${stage.conversionFromPrevious.toFixed(1)}%`}</p>
                <p>Башынан: {stage.conversionFromStart == null ? '—' : `${stage.conversionFromStart.toFixed(1)}%`}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <KanbanBoard
        columns={columns}
        renderCard={renderCard}
        onCardClick={(deal) => navigate(`/deals/${deal.id}`)}
        activeColumn={activeColumn}
        onColumnChange={setActiveColumn}
      />
    </div>
  );
}

function PipelineStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
