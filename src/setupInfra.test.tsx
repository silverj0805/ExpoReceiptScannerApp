import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Jest/RNTL/Babel(jest-expo 프리셋) 배선 자체가 살아있는지 확인하는 인프라 테스트.
// react-native-safe-area-context는 jest.setup.js에서 목 처리했으니, SafeAreaView가
// 실제로 렌더링되는지까지 확인하면 그 목 배선도 같이 검증된다.
test('RNTL로 컴포넌트를 렌더링하고 텍스트를 조회할 수 있다', async () => {
  // @testing-library/react-native 14.x부터 render()가 비동기(Promise)라 await 필수 —
  // await 안 하면 screen이 아직 registered 안 된 상태라 "render function has not been
  // called" 에러가 남(공식 문서 예제로 실측 확인).
  await render(
    <SafeAreaView>
      <View>
        <Text>hello jest-expo</Text>
      </View>
    </SafeAreaView>,
  );

  expect(screen.getByText('hello jest-expo')).toBeTruthy();
});
