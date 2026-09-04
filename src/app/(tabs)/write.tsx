import { View } from 'react-native';

/**
 * CLI 버전의 WriteRedirectScreen과 동일 — 실제로 화면이 보이는 일은 없다.
 * (tabs)/_layout.tsx의 tabBarButton이 press 시점에 router.push('/confirm')으로
 * 가로채기 때문에, 이 컴포넌트가 렌더링되기 전에 이미 다른 화면으로 이동한다.
 * 그래도 파일 자체는 있어야 "write"라는 탭 라우트가 성립한다.
 */
export default function WriteRedirectScreen() {
  return <View />;
}
