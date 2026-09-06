import '@/global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Modal, View } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import useAppLock from '@/features/appLock/hooks/useAppLock';
import LockScreen from '@/features/appLock/screens/LockScreen';
import useSecuritySetupStatus from '@/features/appLock/settings/hooks/useSecuritySetupStatus';
import {
  recordErrorWithContext,
  setScreenForTracking,
} from '@/shared/firebase/crashlyticsRecorder';

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

function AppStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="receipts/[id]" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/license" />
      <Stack.Screen name="settings/webview" />
    </Stack>
  );
}

/**
 * 앱 잠금 게이트 — 콜드스타트/재잠금 둘 다 LockScreen 하나를 재사용한다(Task 11 계획 참고).
 *
 * isSecuritySetUp === false(무잠금, 정책 확정)면 콜드스타트든 재잠금이든 잠금 UI 자체를
 * 아예 렌더하지 않는다 — 등록된 인증 수단이 없는데 인증을 요구하면 안 되기 때문.
 * isLoading 중엔(SecureStore에서 PIN 등록 여부 조회 중) 보호된 화면이 잠깐이라도 노출되지
 * 않도록, Stack도 LockScreen도 아닌 빈 배경만 보여준다.
 */
function AppLockGate() {
  const { isSecuritySetUp, isLoading } = useSecuritySetupStatus();
  const {
    isLocked,
    hasUnlockedOnce,
    isSupported,
    isEnrolled,
    isPinLockedOut,
    remainingPinAttempts,
    pinLockoutRemainingMs,
    authenticateWithBiometrics,
    authenticateWithPin,
  } = useAppLock();

  if (isLoading) {
    return <View style={{ flex: 1 }} className="bg-background" />;
  }

  if (!isSecuritySetUp) {
    return <AppStack />;
  }

  // useAppLock()은 여기서만 부른다 — LockScreen이 자체적으로 또 불러버리면 서로 다른
  // isLocked/hasUnlockedOnce state 인스턴스가 생겨서, LockScreen 안에서 인증에 성공해도
  // 이 게이트는 그 사실을 전혀 모르는 채로 남는다(실기기 재현으로 확인한 실제 버그 —
  // LockScreen.tsx의 컴포넌트 docstring 참고). 그래서 인증 관련 값은 전부 props로 내려준다.
  const lockScreenProps = {
    isSupported,
    isEnrolled,
    isPinLockedOut,
    remainingPinAttempts,
    pinLockoutRemainingMs,
    authenticateWithBiometrics,
    authenticateWithPin,
  };

  if (isLocked && !hasUnlockedOnce) {
    // 콜드스타트: 트리 자체를 안 그린다(뒤에 보호된 화면이 마운트조차 안 됨).
    return <LockScreen isRelock={false} {...lockScreenProps} />;
  }

  return (
    <>
      <AppStack />
      {isLocked && hasUnlockedOnce && (
        // 재잠금 오버레이는 AppStack과 나란한 flex 자식(Fragment sibling)으로 두면 안 된다 —
        // 1차 시도(절대 위치 View로 감싸기)로도 실패했다: 실기기 재현 결과, 백그라운드 복귀
        // 시점에 AppStack을 구성하는 expo-router Stack(react-native-screens)의 네이티브
        // 화면이 RN의 JS 사이드 sibling 순서와 무관하게 네이티브 쪽에서 다시 최상단으로
        // 올라오면서, 절대 위치 오버레이가 화면을 덮긴 하지만 불투명하게 "가리지"는 못하고
        // 그 아래 AppStack 콘텐츠가 그대로 비쳐 보였다(홈 화면 텍스트와 PIN 키패드가 서로
        // 겹쳐 보이는 형태로 확인). react-native-screens와 상관없이 항상 최상단에 그려지는
        // 네이티브 Modal(별도 UIWindow)로 렌더링해서 이 문제를 근본적으로 피한다.
        //
        // react-native-safe-area-context는 Modal이 만드는 새 네이티브 창을 메인 창과 별개로
        // 취급하므로, 그 안에 SafeAreaProvider를 새로 하나 더 둬야 안전 영역 insets을
        // 제대로 계산한다(공식 가이드 권장 패턴).
        <Modal
          visible
          animationType="none"
          onRequestClose={() => {}} // Android 하드웨어 뒤로가기로 잠금 화면이 닫히면 안 됨.
        >
          <SafeAreaProvider>
            <LockScreen isRelock={true} {...lockScreenProps} />
          </SafeAreaProvider>
        </Modal>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ErrorBoundary onError={handleError}>
              <ScreenTracker />
              <AppLockGate />
            </ErrorBoundary>
          </SafeAreaProvider>
        </QueryClientProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
