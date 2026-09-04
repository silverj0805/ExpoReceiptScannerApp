import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import { useEffect } from "react";
import ErrorBoundary from "react-native-error-boundary";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  recordErrorWithContext,
  setScreenForTracking,
} from "@/shared/firebase/crashlyticsRecorder";

/**
 * 루트 레이아웃 — CLI 버전의 App.tsx + RootNavigator를 합친 역할.
 *
 * KeyboardProvider/PrivacyScreenCover는 confirm 이식 때 이어서 추가 예정.
 * Firebase(ErrorBoundary + 화면 추적)는 Task 4에서, QueryClientProvider는
 * receipt 이식(이번 태스크)에서 연결.
 */

const queryClient = new QueryClient();

function handleError(error: Error, stackTrace: string) {
  if (__DEV__) {
    console.error("⚠️ ErrorBoundary caught an error:", error, stackTrace);
  }
  recordErrorWithContext(error, {
    extra: { stackTrace: stackTrace.slice(0, 500) },
  }).catch(() => {});
}

/**
 * 화면 전환 시 Crashlytics에 현재 화면을 기록.
 *
 * CLI 버전과의 차이: React Navigation은 NavigationContainer.onStateChange +
 * getActiveRouteName()(중첩 네비게이터를 재귀적으로 타고 내려가는 커스텀 유틸)이 필요했지만,
 * Expo Router는 usePathname()이 현재 URL 경로를 이미 알려주므로 그 값을 그대로 넘기면 된다.
 */
function ScreenTracker() {
  const pathname = usePathname();

  useEffect(() => {
    setScreenForTracking(pathname);
  }, [pathname]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ErrorBoundary onError={handleError}>
          <ScreenTracker />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="confirm" />
            <Stack.Screen name="receipts/[id]" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="settings/license" />
            <Stack.Screen name="settings/webview" />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
