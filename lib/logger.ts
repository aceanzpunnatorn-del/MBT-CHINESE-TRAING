export type ErrorContext = Record<string, unknown>;

function normalizeError(error: unknown) {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error('Unknown error');
  }
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  const normalized = normalizeError(error);
  return normalized.message || fallback;
}

export function logError(scope: string, error: unknown, context?: ErrorContext) {
  const normalized = normalizeError(error);

  console.error(`[${scope}]`, {
    message: normalized.message,
    stack: normalized.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}
