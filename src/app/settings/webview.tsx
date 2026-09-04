import { useLocalSearchParams } from 'expo-router';

import PlaceholderScreen from '@/shared/components/PlaceholderScreen';

/**
 * CLI 버전의 StackParamList.WebView({ url, title })과 대응.
 */
export default function WebViewScreen() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  return <PlaceholderScreen name="WebView (약관/정책)" params={params} />;
}
