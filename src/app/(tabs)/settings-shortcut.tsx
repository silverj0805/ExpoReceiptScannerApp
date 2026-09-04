import { View } from 'react-native';

/**
 * CLI 버전의 SettingsRedirectScreen과 동일한 역할 — write.tsx 참고.
 * 파일명이 "settings"가 아니라 "settings-shortcut"인 이유:
 * expo-router는 라우트 그룹 (tabs)를 URL 경로에서 제외하므로, 이 파일을 그냥
 * "settings.tsx"로 두면 실제 설정 화면(app/settings/index.tsx, 경로 "/settings")과
 * 똑같이 "/settings" 경로가 되어 충돌한다. CLI의 React Navigation은 BottomTabParamList와
 * StackParamList가 서로 다른 네비게이터라 이름이 겹쳐도 문제없었지만, expo-router는
 * 파일 경로가 곧 URL이라 이런 충돌이 새로 생길 수 있다는 걸 보여주는 지점.
 */
export default function SettingsRedirectScreen() {
  return <View />;
}
