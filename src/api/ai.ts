import { apiClient } from './client';

export interface DraftFollowupRequest {
  targetType: 'lead' | 'contact' | 'deal';
  targetId: number;
  tone: string;
  instructions?: string;
}

export interface DraftFollowupResponse {
  message: string;
  reason: string;
  confidence: number;
  suggestedAction: string;
  promptVersion: string;
  draftKind: 'human_review_required';
  model: string;
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AiUsageSummary {
  tenantId: string;
  feature: string;
  from: string;
  to: string;
  requestCount: number;
  successRate: number;
  avgLatencyMs: number;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
}

// Release 2 - Operational Intelligence Interfaces (matching backend contracts)
export interface LeadPriorityScoreResult {
  leadId: number;
  score: number;
  maxScore: number;
  breakdown: ScoreBreakdown[];
  tier: 'hot' | 'warm' | 'cold';
  generatedAt: string;
  leadUpdatedAt: string;
}

export interface ScoreBreakdown {
  factor: string;
  weight: number;
  contribution: number;
  value: unknown;
}

export interface RiskScoreResult {
  targetId: number;
  targetType: 'lead' | 'deal';
  risk: 'low' | 'medium' | 'high' | 'critical';
  reasons: RiskReason[];
  score: number;
  generatedAt: string;
}

export interface RiskReason {
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface NextBestActionResult {
  targetId: number;
  targetType: 'lead' | 'deal';
  actionKey: string;
  action:
  | 'call'
  | 'whatsapp'
  | 'schedule_trial'
  | 'send_reminder'
  | 'follow_up'
  | 'escalate'
  | 'reschedule_trial'
  | 'confirm_payment_intent'
  | 'complete_enrollment'
  | 'payment_reminder'
  | 're_engage'
  | 'send_offer'
  | 'complete_open_task';
  actionText: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  aiGenerated: boolean;
  knownAction: boolean;
  suggestedAt: string;
  prerequisites?: string[];
  aiRequestId?: string | null;
}

export interface RiskScoreResponse {
  risk: 'high' | 'medium' | 'low';
  reasonCodes: string[];
  daysOverdue?: number;
  explanation: string;
}

export interface TimelineSummaryResult {
  summary: string;
  aiRequestId?: string | null;
  promptVersion?: string;
  model?: string | null;
}

export interface ExtractionResult {
  preferredSchedule: string | null;
  courseInterest: string | null;
  budgetSignal: string | null;
  objections: string[];
  otherNotes: string | null;
  confidence: number;
  promptVersion: string;
  model: string | null;
  aiRequestId?: string | null;
}

interface NextBestActionApiResponse {
  actionKey: string;
  action: string;
  explanation: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  guidanceType: 'ai' | 'rule' | 'system';
  aiRequestId?: string | null;
}

export interface FeedbackRequest {
  outcome: 'accepted' | 'accepted_with_changes' | 'rejected' | 'ignored';
  targetType: 'followup_draft' | 'timeline_summary' | 'structured_extraction' | 'next_best_action' | 'lead_priority_score' | 'risk_score';
  aiRequestId?: string;
  sourceEntityType?: string;
  sourceEntityId?: number;
  comment?: string;
  editedOutputPreview?: string;
}

export interface FeedbackResponse {
  id: number;
  createdAt: string;
}


const urgencyToPriority = (urgency: 'low' | 'normal' | 'high' | 'urgent'): 'high' | 'medium' | 'low' => {
  if (urgency === 'urgent' || urgency === 'high') return 'high';
  if (urgency === 'normal') return 'medium';
  return 'low';
};

const normalizeNextBestActionKey = (
  actionKey: string | undefined,
): NextBestActionResult['action'] => {
  switch (actionKey) {
    case 'call':
    case 'whatsapp':
    case 'schedule_trial':
    case 'send_reminder':
    case 'follow_up':
    case 'escalate':
    case 'reschedule_trial':
    case 'confirm_payment_intent':
    case 'complete_enrollment':
    case 'payment_reminder':
    case 're_engage':
    case 'send_offer':
    case 'complete_open_task':
      return actionKey;
    default:
      return 'follow_up';
  }
};

const isKnownNextBestActionKey = (actionKey: string | undefined): boolean => {
  if (!actionKey) {
    return false;
  }

  return normalizeNextBestActionKey(actionKey) === actionKey;
};

export function isAiRateLimitError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'status' in error
    && (error as { status?: number }).status === 429;
}

export const aiApi = {
  // Release 1 - AI Follow-up Drafts
  draftFollowup: (data: DraftFollowupRequest): Promise<DraftFollowupResponse> => {
    return apiClient.post('/ai/draft-followup', data);
  },

  getUsageSummary: (params?: { from?: string; to?: string }): Promise<AiUsageSummary> => {
    return apiClient.get('/ai/usage-summary', params);
  },

  // Release 2 - Operational Intelligence (matching backend endpoints)
  getPriorityScore: (targetType: 'lead', targetId: number): Promise<{ tenantId: string; score: LeadPriorityScoreResult }> => {
    return apiClient.get(`/ai/lead-priority/${targetId}`);
  },

  getNextBestAction: async (targetType: 'lead' | 'deal', targetId: number): Promise<NextBestActionResult> => {
    const result = await apiClient.post<NextBestActionApiResponse>('/ai/next-best-action', { targetType, targetId, useAi: 'true', store: 'true' });
    const knownAction = isKnownNextBestActionKey(result.actionKey);

    return {
      targetId,
      targetType,
      actionKey: result.actionKey,
      action: normalizeNextBestActionKey(result.actionKey),
      actionText: result.action,
      reasoning: result.explanation,
      priority: urgencyToPriority(result.urgency),
      aiGenerated: result.guidanceType === 'ai',
      knownAction,
      suggestedAt: new Date().toISOString(),
      aiRequestId: result.aiRequestId ?? null,
    };
  },

  getRiskScore: (targetType: 'lead' | 'deal', targetId: number): Promise<RiskScoreResult> => {
    return apiClient.post('/ai/risk-score', { targetType, targetId, followUpOverdueDays: 7, stalledTrialDays: 14, noContactDays: 30, paymentPendingDays: 7 });
  },

  getTimelineSummary: (targetType: 'lead' | 'contact' | 'deal', targetId: number): Promise<TimelineSummaryResult> => {
    const queryParams = targetType === 'lead' ? { leadId: targetId } :
      targetType === 'contact' ? { contactId: targetId } :
        { dealId: targetId };
    return apiClient.post('/ai/timeline-summary', queryParams);
  },

  getExtraction: (targetType: 'lead' | 'contact' | 'deal', targetId: number, text: string): Promise<ExtractionResult> => {
    return apiClient.post('/ai/extract', { text, sourceEntityType: targetType, sourceEntityId: targetId });
  },

  submitFeedback: (data: FeedbackRequest): Promise<FeedbackResponse> => {
    return apiClient.post('/ai/feedback', data);
  },
};
