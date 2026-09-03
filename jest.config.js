/**
 * jest-expo 프리셋을 그대로 쓰되, msw(ESM으로 배포되고 CJS 빌드가 없음)와 그 의존성들만
 * transformIgnorePatterns에 추가로 허용한다.
 *
 * jest.config.js에서 `preset: 'jest-expo'`와 함께 최상위 키(transformIgnorePatterns 등)를
 * 직접 지정하면 preset의 값이 완전히 덮어써진다(병합 안 됨) — 그러면 jest-expo가 기본으로
 * 커버하던 expo/react-navigation 등 패키지들이 다시 트랜스파일 대상에서 빠지게 된다.
 * 그래서 preset을 require해서 spread하는 방식으로 우회한다.
 */
const jestExpoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...jestExpoPreset,
  // jest-expo 기본 패턴(react-native/expo/react-navigation 등)에 msw ESM 의존성 추가.
  // (rettime, @mswjs/*, @open-draft/*, @bundled-es-modules/*, headers-polyfill,
  //  strict-event-emitter, outvariant, until-async — 전부 msw 자체 또는 msw의 하위 의존성)
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|msw|rettime|@mswjs|@open-draft|@bundled-es-modules|headers-polyfill|strict-event-emitter|outvariant|until-async))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  moduleNameMapper: {
    ...jestExpoPreset.moduleNameMapper,
    // Jest는 Metro의 CSS 파이프라인(uniwind)을 거치지 않으므로, .css import는 빈 모듈로 목 처리.
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  transform: {
    ...jestExpoPreset.transform,
    // rettime(msw의 의존성)이 .mjs 확장자로 배포되는데, jest-expo 기본 transform 패턴
    // (`\.[jt]sx?$`)은 js/ts/tsx만 잡고 mjs를 빼먹어서 transformIgnorePatterns를 뚫어놔도
    // 애초에 변환 대상에서 제외됨 — mjs 전용 규칙 추가.
    //
    // 실측으로 확인된 함정: 그냥 `'babel-jest'` 문자열만 쓰면(옵션 없이) babel-jest가 적용할
    // preset/plugin을 못 찾아 사실상 no-op으로 끝나버려서(이 프로젝트엔 babel.config.js가
    // 없음) import 문이 트랜스파일 안 된 채로 남는다. jest-expo가 `.[jt]sx?$` 규칙에 쓰는
    // 것과 동일한 babel 옵션(expo 프리셋 + root/caller)을 그대로 재사용해야 실제로 변환됨.
    '\\.mjs$': jestExpoPreset.transform['\\.[jt]sx?$'],
  },
  // MSW 서버 라이프사이클 등록 — jest.mock() 호출이 섞여 있어서 setupFiles가 아니라
  // setupFilesAfterEnv(jest 전역이 준비된 시점)에서 실행돼야 한다.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // msw의 package.json exports는 "node" 조건에서만 msw/node를 정상 제공한다.
  // 'msw'는 msw 자체가 Jest 환경을 식별하기 위해 쓰는 전용 조건.
  testEnvironmentOptions: {
    ...jestExpoPreset.testEnvironmentOptions,
    customExportConditions: ['require', 'node', 'react-native', 'msw'],
  },
};
