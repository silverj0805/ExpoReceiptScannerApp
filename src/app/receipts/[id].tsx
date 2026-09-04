import { useLocalSearchParams } from 'expo-router';

import PlaceholderScreen from '@/shared/components/PlaceholderScreen';

/**
 * CLI 버전의 StackParamList.Detail({ receiptId })과 대응.
 *
 * CLI vs Expo Router 차이: React Navigation에서는 파라미터 이름이 자유(`receiptId`)였지만,
 * expo-router는 파일명 `[id].tsx`가 곧 동적 세그먼트 이름을 결정한다 — URL이
 * `/receipts/abc123`이 되고, `useLocalSearchParams()`가 반환하는 키도 `id`로 고정된다.
 * "typedRoutes" 실험 옵션 덕분에 이 파라미터 타입도 라우트 트리 기준으로 자동 추론된다
 * (CLI처럼 RootStackParamList를 손으로 정의할 필요가 없음).
 */
export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaceholderScreen name="Detail (영수증 상세)" params={{ receiptId: id }} />;
}
