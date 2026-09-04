/**
 * `tabBarButton`이 받는 props 타입.
 *
 * expo-router는 @react-navigation/bottom-tabs를 자체 포크해서 쓰고 있어서
 * (node_modules에 @react-navigation/bottom-tabs가 아예 없음) `BottomTabBarButtonProps`를
 * `expo-router` 최상위 공개 API에서는 재노출하지 않는다. `Tabs.Screen`의 `options` 타입에서
 * 유틸리티 타입으로 역추출을 시도해봤지만 타입이 좁혀지지 않아서(공개 타입이 이 프로퍼티를
 * 노출 안 함), expo-router 내부 경로에서 직접 가져오는 것으로 타협했다.
 * expo-router 내부 구조가 바뀌면 이 import가 깨질 수 있음 — 알려진 리스크로 남겨둠.
 */
export type { BottomTabBarButtonProps as TabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
