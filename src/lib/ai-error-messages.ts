interface AiErrorContext {
  fallbackTitle?: string;
  fallbackDescription?: string;
}

type AiErrorPayload = {
  code?: string | number;
  errorCode?: string | number;
  status?: string | number;
  message?: string;
  description?: string;
  features?: unknown;
  error?: {
    message?: string;
  };
};

export interface AiErrorMapping {
  [key: string]: {
    title: string;
    description: string;
    userAction?: string;
  };
}

// AI-specific error mappings for user-friendly messages
const AI_ERROR_MAPPINGS: AiErrorMapping = {
  // Feature disabled errors
  'ai_assist_disabled': {
    title: 'AI жардамчысы өчүрүлгөн',
    description: 'AI жардамчысы сиздин уюм үчүн өчүрүлгөн. Администратордан бул функцияны күйгүзүүнү сурагыла.',
    userAction: 'Администраторго кайрылыңыз',
  },
  'ai_followup_drafts_disabled': {
    title: 'AI жооп сунушу өчүрүлгөн',
    description: 'AI жооп сунушу сиздин уюм үчүн өчүрүлгөн. Бул функцияны күйгүзүү үчүн администраторго кайрылыңыз.',
    userAction: 'Администраторго кайрылыңыз',
  },

  // Context not found errors
  'lead_not_found': {
    title: 'Лид табылган жок',
    description: 'Сиз жооп жазуу үчүн аракет кылган лид табылган жок. Бул лид жок кылынган же уруксатсыз өзгөртүлгөн болушу мүмкүн.',
    userAction: 'Лидди кайра жүктөңүз же башка лидге өтүңүз',
  },
  'contact_not_found': {
    title: 'Байланыш табылган жок',
    description: 'Сиз жооп жазуу үчүн аракет кылган байланыш табылган жок. Бул байланыш жок кылынган же уруксатсыз өзгөртүлгөн болушу мүмкүн.',
    userAction: 'Байланышты кайра жүктөңүз же башка байланышка өтүңүз',
  },
  'deal_not_found': {
    title: 'Келишим табылган жок',
    description: 'Сиз жооп жазуу үчүн аракет кылган келишим табылган жок. Бул келишим жок кылынган же уруксатсыз өзгөртүлгөн болушу мүмкүн.',
    userAction: 'Килишимди кайра жүктөңүз же башка килишимге өтүңүз',
  },
  'context_not_found': {
    title: 'Маалымат табылган жок',
    description: 'AI жооп сунушун даярдоо үчүн керектүү маалымат табылган жок. Бул жазуу же маалымат өчүрүлгөн болушу мүмкүн.',
    userAction: 'Баракты кайра жүктөп, кайта аракет кылыңыз',
  },

  // Provider failures
  'openai_error': {
    title: 'AI кызматы ката кетти',
    description: 'OpenAI кызматында ката кетти. Бул убактылуу көйгөй болушу мүмкүн. Кийинчиреп кайта аракет кылыңыз.',
    userAction: 'Бир нече минуттан кийин кайта аракет кылыңыз',
  },
  'provider_error': {
    title: 'AI кызматында ката',
    description: 'AI кызматында ката кетти. Бул тышкы кызматтагы убактылуу көйгөй болушу мүмкүн.',
    userAction: 'Кийинчиреп кайта аракет кылыңыз же администраторго кайрылыңыз',
  },
  'provider_timeout': {
    title: 'AI кызматы жооп бербеди',
    description: 'AI кызматына суроо жөнөтүлгөн, бирок жооп алынбай жатат. Бул кызматта көйгөй бардыгын билдирет.',
    userAction: 'Кийинчиреп кайта аракет кылыңыз',
  },
  'provider_rate_limit': {
    title: 'AI кызматы ашыкча жүктөлгөн',
    description: 'AI кызматы ашыкча суроолорго учурагандыктан убактылуу түрдө чектелди. Кээ бир убакыт өткөндөн кийин кайта аракет кылыңыз.',
    userAction: 'Бир нече минуттан кийин кайта аракет кылыңыз',
  },

  // Validation failures
  'invalid_tone': {
    title: 'Тон туура эмес',
    description: 'Тандалган тон туура эмес же колдонууга жараксыз. Башка тонду тандаңыз.',
    userAction: 'Башка тонду тандаңыз',
  },
  'instructions_too_long': {
    title: 'Кошумча нускаулар өтө узун',
    description: 'Кошумча нускаулар 2000 символдон ашпоосу керек. Кыскартып, кайта аракет кылыңыз.',
    userAction: 'Нускауларды кыскартыңыз',
  },
  'validation_failed': {
    title: 'Маалымат туура эмес',
    description: 'Жөнөтүлгөн маалыматтарда ката бар. Форманы текшерип, кайта аракет кылыңыз.',
    userAction: 'Форманы текшериңиз жана тууралап коюңуз',
  },

  // Permission errors
  'permission_denied': {
    title: 'Уруксат жок',
    description: 'AI жардамчысын колдонуу үчүн сиздин уруксатыңыз жетишсиз. Бул функцияны колдонуу үчүн жогорку деңгээлдеги уруксат талап кылынат.',
    userAction: 'Өз укуктарыңыз тууралуу администраторго кайрылыңыз',
  },
  'insufficient_role': {
    title: 'Рөл жетишсиз',
    description: 'AI жардамчысын колдонуу үчүн сиздин ролүңүз жетишсиз. Бул функция Sales, Assistant, Manager же Admin ролдору үчүн жеткиликтүү.',
    userAction: 'Өз укуктарыңыз тууралуу администраторго кайрылыңыз',
  },

  // Configuration errors
  'ai_not_configured': {
    title: 'AI конфигурацияланган эмес',
    description: 'AI жардамчысы конфигурацияланган эмес. Администратордон AI жөндөөлөрүн тууралоону сурагыла.',
    userAction: 'Администраторго кайрылыңыз',
  },
  'missing_api_key': {
    title: 'API ачкычы жок',
    description: 'AI кызматы үчүн API ачкычы конфигурацияланган эмес. Бул администратор тарабынан чечилиши керек.',
    userAction: 'Администраторго кайрылыңыз',
  },

  // Generic errors
  'internal_error': {
    title: 'Системалык ката',
    description: 'Системада күтүлбөгөн ката кетти. Биз бул көйгөй боюнча иштеп жатабыз. Кийинчиреп кайта аракет кылыңыз.',
    userAction: 'Кийинчиреп кайта аракет кылыңыз же администраторго кайрылыңыз',
  },
  'network_error': {
    title: 'Тармак катасы',
    description: 'Тармакка байланышта ката кетти. Интернет байланышыңызды текшерип, кайта аракет кылыңыз.',
    userAction: 'Интернет байланышын текшериңиз жана кайта аракет кылыңыз',
  },
  'timeout_error': {
    title: 'Убакыт өтүп кетти',
    description: 'Суроону иштетүү үчүн берилген убакыт өтүп кетти. Бул AI кызматынын жооп берүүдө кечиккенин билдирет.',
    userAction: 'Кайта аракет кылыңыз же кыскараап нускаалуулар берүңүз',
  },
};

/**
 * Get user-friendly error message for AI-related errors
 */
export function getAiErrorMessage(error: unknown, context: AiErrorContext = {}): { title: string; description: string; userAction?: string } {
  // Default fallback values
  const fallback = {
    title: context.fallbackTitle || 'AI катасы',
    description: context.fallbackDescription || 'AI кызматында ката кетти. Кийинчиреп кайта аракет кылыңыз.',
  };

  if (!error) {
    return fallback;
  }

  // Extract error information from different error formats
  let errorCode: string | null = null;
  let errorMessage: string | null = null;

  // Handle different error structures
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    const payload = error as AiErrorPayload;
    const rawCode = payload.code ?? payload.errorCode ?? payload.status;
    errorCode = rawCode == null ? null : String(rawCode);
    errorMessage = payload.message || payload.description || payload.error?.message || null;
  }

  // Explicit FEATURE_DISABLED handling to avoid broad substring matching
  if (errorCode === 'FEATURE_DISABLED' && error && typeof error === 'object' && Array.isArray((error as AiErrorPayload).features)) {
    const features = (error as { features: string[] }).features;
    if (features.includes('ai_assist_enabled')) {
      return AI_ERROR_MAPPINGS['ai_assist_disabled'];
    }
    if (features.includes('ai_followup_drafts_enabled')) {
      return AI_ERROR_MAPPINGS['ai_followup_drafts_disabled'];
    }
    // Fallback for any other disabled feature
    return {
      title: 'Функция өчүрүлгөн',
      description: 'Бул функция сиздин уюм үчүн өчүрүлгөн. Администраторго кайрылыңыз.',
      userAction: 'Администраторго кайрылыңыз',
    };
  }

  // Try to find a matching error mapping
  if (errorCode && AI_ERROR_MAPPINGS[errorCode]) {
    return AI_ERROR_MAPPINGS[errorCode];
  }

  // Try to match by error message content (narrower than before)
  if (errorMessage) {
    const messageLower = errorMessage.toLowerCase();
    for (const [code, mapping] of Object.entries(AI_ERROR_MAPPINGS)) {
      if (messageLower.includes(code.toLowerCase())) {
        return mapping;
      }
    }
  }

  // Return fallback if no specific mapping found
  return fallback;
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isAiErrorRecoverable(error: unknown): boolean {
  const { title } = getAiErrorMessage(error);

  const recoverablePatterns = [
    'timeout',
    'network',
    'rate limit',
    'кызматында ката',
    'жооп бербеди',
    'ашыкча жүктөлгөн',
  ];

  const titleLower = title.toLowerCase();
  return recoverablePatterns.some(pattern => titleLower.includes(pattern));
}

/**
 * Get suggested retry delay in milliseconds
 */
export function getAiErrorRetryDelay(error: unknown): number {
  const { title } = getAiErrorMessage(error);
  const titleLower = title.toLowerCase();

  if (titleLower.includes('rate limit') || titleLower.includes('ашыкча жүктөлгөн')) {
    return 30000; // 30 seconds for rate limits
  }

  if (titleLower.includes('timeout') || titleLower.includes('кызматында ката')) {
    return 10000; // 10 seconds for timeouts
  }

  if (titleLower.includes('network') || titleLower.includes('тармак')) {
    return 5000; // 5 seconds for network errors
  }

  return 2000; // 2 seconds default
}

/**
 * Format AI error for toast notifications
 */
export function formatAiErrorForToast(error: unknown, context: AiErrorContext = {}) {
  const errorInfo = getAiErrorMessage(error, context);

  return {
    title: errorInfo.title,
    description: errorInfo.description,
    variant: 'destructive' as const,
  };
}
