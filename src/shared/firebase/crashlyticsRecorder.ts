/**
 * Crashlytics 에러 기록 유틸.
 * - 어느 화면에서, 어떤 API 호출에서, 어떤 값으로 에러가 났는지 함께 기록해서
 *   Firebase Crashlytics 대시보드에서 원인을 바로 알아볼 수 있게 함.
 * - React 트리 밖(axios interceptor 등)에서도 그대로 호출 가능.
 */
import {
  getCrashlytics,
  log as crashlyticsLog,
  recordError as recordCrashlyticsError,
  setAttributes,
} from '@react-native-firebase/crashlytics';

import { useCurrentScreenStore } from '@/shared/store/currentScreen';

export interface ErrorContext {
  /** 발생 화면 (미지정 시 currentScreen 스토어 값 사용) */
  screen?: string | null;
  /** API 엔드포인트 (API 에러인 경우) */
  endpoint?: string;
  /** HTTP 상태 코드 */
  status?: number;
  /** API 에러 응답 본문 (민감정보 제외하고 넘길 것) */
  apiErrorData?: unknown;
  /** 그 외 추가 컨텍스트 */
  extra?: Record<string, string>;
}

const MAX_ATTRIBUTE_VALUE_LENGTH = 100; // Crashlytics custom key 값 길이 제한

function truncate(value: string, max = MAX_ATTRIBUTE_VALUE_LENGTH): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function safeStringify(value: unknown): string {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return truncate(str, 500); // 에러 메시지 자체는 500자까지 허용
  } catch {
    return '[Unable to stringify]';
  }
}

/**
 * 화면 전환 시 호출
 * currentScreen 스토어 갱신 + Crashlytics current_screen 속성/브레드크럼 로그 기록
 *
 * CLI 버전과의 차이: React Navigation의 NavigationContainer.onStateChange +
 * getActiveRouteName()(중첩 네비게이터를 재귀적으로 타고 내려가는 유틸)으로 호출하던 걸,
 * Expo Router에서는 expo-router의 usePathname() 훅이 현재 경로를 직접 알려주므로
 * 그 값을 그대로 넘기면 된다 — 루트 레이아웃의 useEffect에서 연결(shared 이식 완료 후 연결).
 */
export function setScreenForTracking(screenName: string): void {
  useCurrentScreenStore.getState().setCurrentScreen(screenName);
  const instance = getCrashlytics();
  setAttributes(instance, { current_screen: truncate(screenName) }).catch(
    () => {},
  );
  crashlyticsLog(instance, `Navigated to screen: ${screenName}`);
}

/**
 * 에러를 화면/API 컨텍스트와 함께 Crashlytics에 기록.
 * try/catch, ErrorBoundary, interceptor 등 어디서든 호출 가능.
 */
export async function recordErrorWithContext(
  err: unknown,
  context?: ErrorContext,
): Promise<void> {
  const instance = getCrashlytics();
  const errorObj = err instanceof Error ? err : new Error(String(err));

  const screen =
    context?.screen ?? useCurrentScreenStore.getState().currentScreen;

  const attributes: Record<string, string> = {
    screen: screen || 'unknown',
    ...context?.extra,
  };
  if (context?.endpoint) {
    attributes.endpoint = truncate(context.endpoint);
  }
  if (context?.status != null) {
    attributes.status = String(context.status);
  }
  if (context?.apiErrorData !== undefined) {
    attributes.apiErrorData = safeStringify(context.apiErrorData);
  }

  try {
    await setAttributes(instance, attributes);
  } catch (e) {
    if (__DEV__) {
      console.warn('Crashlytics setAttributes failed', e);
    }
  }

  // 에러 메시지에도 컨텍스트를 남겨서, 스택과 함께 그대로 전송되게 함.
  const contextMessage = [
    screen && `screen=${screen}`,
    context?.endpoint && `endpoint=${context.endpoint}`,
    context?.status != null && `status=${context.status}`,
    context?.apiErrorData !== undefined &&
      `apiErrorData=${safeStringify(context.apiErrorData)}`,
  ]
    .filter(Boolean)
    .join(' | ');

  if (contextMessage) {
    crashlyticsLog(instance, `[ErrorContext] ${contextMessage}`);
  }

  recordCrashlyticsError(instance, errorObj);
}

/**
 * API 에러 전용 기록(AxiosError 등)
 * API 클라이언트를 붙이는 태스크에서 response interceptor 하나로 바로 연결
 */
export function recordApiError(
  err: unknown,
  config?: { url?: string; baseURL?: string; method?: string } | null,
  response?: { status?: number; data?: unknown } | null,
): void {
  const method = (config?.method ?? 'get').toUpperCase();
  const url = config?.url
    ? `${config.baseURL ?? ''}${config.url}`.trim()
    : undefined;
  const endpoint = url ? `${method} ${url}` : undefined;

  recordErrorWithContext(err, {
    endpoint,
    status: response?.status,
    apiErrorData: response?.data,
  }).catch(() => {});
}
