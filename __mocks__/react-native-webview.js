/**
 * react-native-webview 수동 목(manual mock).
 *
 * Expo SDK 57가 고정하는 react-native-webview 13.16.1에는 Turbomodule 이름과 Fabric
 * HostComponent 이름이 충돌하는 알려진 버그가 있어(react-native-webview#3462에서 고쳐짐,
 * 14.x부터 반영 — 이 프로젝트는 Expo SDK 호환성 때문에 13.16.1을 그대로 써야 함),
 * Jest에서 그냥 import만 해도 `TurboModuleRegistry.getEnforcing(...): 'RNCWebViewModule'
 * could not be found`로 즉시 던진다. 실제 네이티브 WebView를 렌더링할 수 없는 Jest
 * 환경에서는 어차피 이 라이브러리가 필요 없으므로, testID/on* 콜백 prop만 그대로
 * 통과시키는 최소 목으로 대체한다(Jest는 node_modules와 이름이 같은 이 파일을
 * jest.mock() 호출 없이도 자동으로 사용함).
 */
const React = require('react');
const { View } = require('react-native');

const WebView = React.forwardRef((props, ref) =>
  React.createElement(View, { ...props, ref }),
);

module.exports = { WebView };
