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

// MSW: 모든 테스트가 시작되기 전에 서버(요청 가로채기)를 켜고, 각 테스트 사이에
// 핸들러를 초기화(한 테스트에서 server.use()로 추가한 핸들러가 다음 테스트로 새지 않게)하고,
// 전체 테스트가 끝나면 끈다.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
