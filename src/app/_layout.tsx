import '@/global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import ErrorBoundary from 'react-native-error-boundary';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppLockGate from '@/features/appLock/AppLockGate';
import PrivacyScreenCover from '@/shared/components/privacyScreenCover';
import {
  recordErrorWithContext,
  setScreenForTracking,
} from '@/shared/firebase/crashlyticsRecorder';
import { useCurrentScreenStore } from '@/shared/store/currentScreen';

/**
 * 루트 레이아웃 — CLI 버전의 App.tsx + RootNavigator를 합친 역할.
 */

const queryClient = new QueryClient();

function handleError(error: Error, stackTrace: string) {
  if (__DEV__) {
    console.error('⚠️ ErrorBoundary caught an error:', error, stackTrace);
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
  const currentScreen = useCurrentScreenStore(state => state.currentScreen);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ErrorBoundary onError={handleError}>
              <StatusBar
                style={currentScreen?.includes('scan') ? 'light' : 'dark'}
              />
              <ScreenTracker />
              <PrivacyScreenCover>
                <AppLockGate>
                  <BottomSheetModalProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="confirm" />
                      <Stack.Screen name="receipts/[id]" />
                      <Stack.Screen name="settings/index" />
                      <Stack.Screen name="settings/license" />
                      <Stack.Screen name="settings/webview" />
                    </Stack>
                  </BottomSheetModalProvider>
                </AppLockGate>
              </PrivacyScreenCover>
            </ErrorBoundary>
          </SafeAreaProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
