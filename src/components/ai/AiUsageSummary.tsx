import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, TrendingUp, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { aiApi, type AiUsageSummary } from '@/api/ai';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ky } from '@/lib/i18n';
import { getAiErrorMessage, formatAiErrorForToast } from '@/lib/ai-error-messages';

interface AiUsageSummaryProps {
  className?: string;
}

const timeRangeOptions = [
  { value: '7', label: 'Акыркы 7 күн' },
  { value: '30', label: 'Акыркы 30 күн' },
  { value: '90', label: 'Акыркы 90 күн' },
];

export function AiUsageSummary({ className }: AiUsageSummaryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<AiUsageSummary | null>(null);
  const [timeRange, setTimeRange] = useState('30');

  const canViewUsage = user?.role === 'admin' || user?.role === 'manager';

  const loadUsageData = useCallback(async () => {
    if (!canViewUsage) return;

    try {
      setIsLoading(true);
      setError(null);

      const days = parseInt(timeRange);
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

      const data = await aiApi.getUsageSummary({
        from: from.toISOString(),
        to: to.toISOString(),
      });

      setUsageData(data);
    } catch (err: unknown) {
      const errorInfo = getAiErrorMessage(err, {
        fallbackTitle: 'AI колдонуу статистикасы катасы',
        fallbackDescription: 'AI колдонуу статистикасын жүктөө мүмкүн болгон жок. Кийинчиреп кайта аракет кылыңыз.',
      });

      setError(errorInfo.description);
      toast(formatAiErrorForToast(err, {
        fallbackTitle: 'AI колдонуу статистикасы катасы',
        fallbackDescription: 'AI колдонуу статистикасын жүктөө мүмкүн болгон жок. Кийинчиреп кайта аракет кылыңыз.',
      }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [canViewUsage, timeRange, toast]);

  useEffect(() => {
    if (!canViewUsage) {
      setError('AI колдонуу статистикасын көрүү үчүн менеджер же администратор уруксаты талап кылынат');
      setIsLoading(false);
      return;
    }

    loadUsageData();
  }, [canViewUsage, loadUsageData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUsageData();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ky-KG').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) {
      return `${Math.round(ms)}мс`;
    }
    return `${(ms / 1000).toFixed(1)}с`;
  };

  const formatDateRange = () => {
    if (!usageData) return '';

    const from = new Date(usageData.from);
    const to = new Date(usageData.to);

    return `${format(from, 'dd.MM.yyyy')} - ${format(to, 'dd.MM.yyyy')}`;
  };

  const getSuccessRateVariant = (rate: number) => {
    if (rate >= 0.9) return 'default';
    if (rate >= 0.7) return 'secondary';
    return 'destructive';
  };

  if (!canViewUsage) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertTriangle className="h-5 w-5" />
            <span>AI колдонуу статистикасын көрүү үчүн менеджер же администратор уруксаты талап кылынат</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI колдонуу статистикасы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI колдонуу статистикасы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadUsageData}>
              Кайта аракет кылуу
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI колдонуу статистикасы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            AI колдонуу маалыматтары жок
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI колдонуу статистикасы
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange} disabled={isRefreshing}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDateRange()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Request Count */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Суроолор</span>
            </div>
            <div className="text-2xl font-bold">{formatNumber(usageData.requestCount)}</div>
            <p className="text-xs text-muted-foreground">Жалпы суроолор саны</p>
          </div>

          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Ийгиликтүүлүк</span>
            </div>
            <div className="text-2xl font-bold">{formatPercentage(usageData.successRate)}</div>
            <Badge variant={getSuccessRateVariant(usageData.successRate)} className="text-xs">
              {usageData.successRate >= 0.9 ? 'Жакшы' : usageData.successRate >= 0.7 ? 'Канааттанарлык' : 'Начар'}
            </Badge>
          </div>

          {/* Average Latency */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Орточо жооп убагы</span>
            </div>
            <div className="text-2xl font-bold">{formatLatency(usageData.avgLatencyMs)}</div>
            <p className="text-xs text-muted-foreground">Орточо жооп убагы</p>
          </div>

          {/* Token Usage */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Токен колдонуу</span>
            </div>
            <div className="text-lg font-bold">
              {formatNumber(
                (usageData.estimatedPromptTokens ?? 0) +
                (usageData.estimatedCompletionTokens ?? 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {usageData.estimatedPromptTokens != null
                ? formatNumber(usageData.estimatedPromptTokens)
                : '—'} prompt + {' '}
              {usageData.estimatedCompletionTokens != null
                ? formatNumber(usageData.estimatedCompletionTokens)
                : '—'} completion
            </p>
          </div>
        </div>

        {/* Additional Details */}
        <div className="mt-6 pt-6 border-t space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Prompt токендери</h4>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(usageData.estimatedPromptTokens)}
              </div>
              <p className="text-xs text-muted-foreground">Киргизилген контекст</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Completion токендери</h4>
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(usageData.estimatedCompletionTokens)}
              </div>
              <p className="text-xs text-muted-foreground">AI сунуштаган жооптун тексти</p>
            </div>
          </div>
        </div>

        {/* Feature Info */}
        <div className="mt-6 pt-6 border-t">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Функция: {usageData.feature}</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Бул статистика "AI жооп сунушу" функциясынын колдонулушун көрсөтөт.
                  Бул жерде жооптордун өзү сакталбайт, колдонуу боюнча гана жыйынтык көрсөтүлөт.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
