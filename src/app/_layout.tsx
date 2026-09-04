import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * 루트 레이아웃 — CLI 버전의 App.tsx + RootNavigator를 합친 역할.
 *
 * 지금은 "네비게이션 골격"만 구성하는 단계라 SafeAreaProvider만 둔다.
 * QueryClientProvider/KeyboardProvider/ErrorBoundary/PrivacyScreenCover 등은
 * shared 이식 태스크에서 해당 모듈들이 실제로 옮겨진 뒤에 여기 추가한다.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="confirm" />
        <Stack.Screen name="receipts/[id]" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/license" />
        <Stack.Screen name="settings/webview" />
      </Stack>
    </SafeAreaProvider>
  );
}
