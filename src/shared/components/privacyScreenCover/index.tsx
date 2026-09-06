import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import Icon from '@/shared/components/Icon';

/**
 * 앱이 백그라운드로 전환되는 순간(OS가 최근 앱 목록/스위처용 스냅샷을 찍는 바로 그
 * 타이밍) 화면 위에 커버를 덮어서 영수증 목록/금액이 그대로 캡처되지 않게 한다.
 * CLI 버전(ReceiptScannerApp)의 PrivacyScreenCover를 그대로 이식.
 *
 * iOS: AppState가 'active'가 아닌 순간(inactive/background) JS 커버를 덮는다.
 * Android 13(API 33)+: 이 컴포넌트는 관여하지 않는다 — MainActivity에서
 * setRecentsScreenshotEnabled(false)로 스위처 썸네일만 끈다(스크린샷/녹화는 허용)
 */
function PrivacyScreenCover({ children }: PropsWithChildren) {
  const [isCovered, setIsCovered] = useState(
    AppState.currentState !== 'active',
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    const subscription = AppState.addEventListener('change', nextState => {
      setIsCovered(nextState !== 'active');
    });
    return () => subscription.remove();
  }, []);

  if (Platform.OS !== 'ios') {
    return children;
  }

  return (
    <>
      {children}
      {isCovered && (
        <View
          testID="privacy-screen-cover"
          style={StyleSheet.absoluteFill}
          className="items-center justify-center bg-[#CCE8CD]"
        >
          <Icon
            name="lock-closed-outline"
            size={40}
            colorClassName="accent-primary"
          />
        </View>
      )}
    </>
  );
}

export default PrivacyScreenCover;
