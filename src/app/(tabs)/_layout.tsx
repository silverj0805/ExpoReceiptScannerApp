import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/shared/components/Icon';
import ScanTabButton from '@/shared/components/tabBars/ScanTabButton';
import SettingsTabButton from '@/shared/components/tabBars/SettingsTabButton';
import WriteTabButton from '@/shared/components/tabBars/WriteTabButton';

type TabIconName =
  'home-outline' | 'receipt-outline' | 'create-outline' | 'settings-outline';

function TabBarIcon({
  name,
  focused,
}: {
  name: TabIconName;
  focused: boolean;
}) {
  return (
    <Icon
      name={name}
      size={22}
      className={focused ? 'text-primary' : 'text-gray'}
    />
  );
}

function TabBarLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      className={
        focused
          ? 'text-[12px] font-bold text-primary'
          : 'text-[12px] font-semibold text-gray'
      }
    >
      {label}
    </Text>
  );
}

/**
 * 하단 탭 골격.
 *
 * CLI 버전(BottomTabNavigator.tsx)과의 핵심 차이:
 * - createBottomTabNavigator()로 직접 만드는 대신, expo-router의 <Tabs>가
 *   이 폴더(app/(tabs)/) 밑의 파일들을 스캔해서 자동으로 탭을 구성한다.
 * - "기록"/"설정"은 실제 탭 콘텐츠가 없고 탭을 누르면 곧장 다른 화면으로
 *   이동시키는 용도(CLI와 동일한 패턴) — 이동 수단만 `navigation.navigate()`
 *   대신 expo-router의 `router.push()`로 바뀐다.
 * - 탭 바 버튼 헬퍼 컴포넌트(ScanTabButton 등)는 app/ 밑에 두면 안 됨 —
 *   Expo Router는 app/ 아래 모든 파일을 라우트 후보로 스캔하기 때문에
 *   (Next.js의 `_` 접두사 제외 규칙이 없음) src/shared/components/로 뺐다.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="home-outline" focused={focused} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabBarLabel label="홈" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: '기록',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="create-outline" focused={focused} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabBarLabel label="기록" focused={focused} />
          ),
          tabBarButton: WriteTabButton,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '스캔',
          tabBarButton: ScanTabButton,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: '내역',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="receipt-outline" focused={focused} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabBarLabel label="내역" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings-shortcut"
        options={{
          title: '설정',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="settings-outline" focused={focused} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabBarLabel label="설정" focused={focused} />
          ),
          tabBarButton: SettingsTabButton,
        }}
      />
    </Tabs>
  );
}
