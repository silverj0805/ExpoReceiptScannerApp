import { useLocalSearchParams } from 'expo-router';

import PlaceholderScreen from '@/shared/components/PlaceholderScreen';

/**
 * CLI 버전의 StackParamList.Confirm({ imageUri?, info? })과 대응.
 *
 * CLI vs Expo Router 차이: React Navigation은 `navigation.navigate('Stacks', { screen:
 * 'Confirm', params: { imageUri } })`처럼 타입이 강제된 params 객체를 넘겼지만,
 * expo-router는 실제 URL 쿼리스트링(`/confirm?imageUri=...`)으로 넘기고
 * useLocalSearchParams()로 읽는다 — 값은 항상 string(또는 string[])이라
 * 원래 타입(예: Receipt 객체 전체)을 그대로 넘기던 부분은 JSON 직렬화 등
 * 별도 처리가 필요해진다는 점을 이후 features 이식 때 감안해야 함.
 */
export default function ConfirmScreen() {
  const params = useLocalSearchParams<{ imageUri?: string }>();
  return <PlaceholderScreen name="Confirm (확인/수정)" params={params} />;
}
