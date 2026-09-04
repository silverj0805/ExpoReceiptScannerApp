import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 네비게이션 골격 검증용 임시 화면.
 * 실제 화면 구현은 features 이식 태스크에서 진행하고, 지금은 라우팅 자체가
 * 맞게 연결됐는지(탭 전환, push/back, 파라미터 전달)만 확인하면 되므로
 * 화면 이름과 전달받은 파라미터를 그대로 노출한다.
 */
export default function PlaceholderScreen({
  name,
  params,
}: {
  name: string;
  params?: Record<string, unknown>;
}) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>{name}</Text>
        {params && Object.keys(params).length > 0 && (
          <Text style={{ fontSize: 13, color: '#666' }}>
            {JSON.stringify(params)}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
