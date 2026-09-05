/**
 * expo-local-authentication은 공식 Jest mock을 전혀 제공하지 않는다(node_modules 확인 완료).
 * 네이티브 모듈이라 실제 모듈을 그냥 import하면 `hasHardwareAsync()` 등이 응답하지 않아
 * (테스트 환경에 네이티브 브리지가 없어서) 테스트가 그대로 멈춰버린다 —
 * `useBiometricAuth`를 직접 다루지 않는 화면 테스트(예: HomeScreen)에서 실측으로 확인.
 *
 * 이 화면들은 생체인증 자체를 테스트하려는 게 아니므로, 안전한 기본값(미지원)으로 응답하는
 * 목을 전역으로 둔다. `useBiometricAuth`/`SecuritySetupSheet` 같은 생체인증 로직 자체를
 * 테스트하는 파일은 필요에 따라 `jest.mock('expo-local-authentication', () => ({...}))`로
 * 이 목을 덮어써서 쓰면 된다.
 */
export const hasHardwareAsync = jest.fn(async () => false);
export const isEnrolledAsync = jest.fn(async () => false);
export const authenticateAsync = jest.fn(async () => ({
  success: false,
  error: 'not_available',
}));
