// react-native-safe-area-context 공식 테스팅 가이드: 실제 네이티브 레이아웃 측정이 없는
// Jest 환경에서는 SafeAreaProvider가 insets/frame을 못 받아 자식을 렌더링하지 못한다.
// 라이브러리가 직접 제공하는 목(mock)으로 대체해야 함.
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

import { server } from './src/mocks/server';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

// react-native-device-info 공식 가이드: 네이티브 모듈을 라이브러리가 제공하는 목으로 대체.
// (shared/api/client.ts의 getUniqueId() 호출을 Jest 환경에서 쓰기 위함)
jest.mock('react-native-device-info', () =>
  require('react-native-device-info/jest/react-native-device-info-mock'),
);

// shared/api/client.ts가 항상 crashlyticsRecorder를 import하는데, 그 안에서 실제
// @react-native-firebase/{app,crashlytics}를 로드하면 네이티브 바이너리가 없는 Jest
// 환경에서 "Native module NativeRNFBTurboApp is not registered"로 즉시 던진다
// (client.ts를 쓰는 화면 테스트를 처음 작성하며 실측으로 발견 — client.test.ts는
// crashlyticsRecorder를 테스트별로 직접 목 처리해서 이 문제를 안 겪었을 뿐).
// RNFB는 공식 jest mock을 제공하지 않아 이 프로젝트 파일(crashlyticsRecorder) 자체를
// 전역으로 목 처리 — 어차피 Crashlytics 실호출 자체는 Task 4에서 시뮬레이터로 검증 완료.
jest.mock('@/shared/firebase/crashlyticsRecorder', () => ({
  setScreenForTracking: jest.fn(),
  recordErrorWithContext: jest.fn().mockResolvedValue(undefined),
  recordApiError: jest.fn(),
}));

// MSW: 모든 테스트가 시작되기 전에 서버(요청 가로채기)를 켜고, 각 테스트 사이에
// 핸들러를 초기화(한 테스트에서 server.use()로 추가한 핸들러가 다음 테스트로 새지 않게)하고,
// 전체 테스트가 끝나면 끈다.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
