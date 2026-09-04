import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getVersion } from 'react-native-device-info';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '@/shared/components/Icon';

import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../constants/urls';

function SettingsRow({
  testID,
  label,
  onPress,
}: {
  testID: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-[#e8e6e1] py-4"
    >
      <Text className="text-sm font-semibold text-black">{label}</Text>
      <Icon name="chevron-forward" size={18} colorClassName="accent-gray" />
    </Pressable>
  );
}

function SettingsScreen() {
  const goBack = () => router.back();

  const goToLicense = () => router.push('/settings/license');

  const goToPrivacyPolicy = () =>
    router.push({
      pathname: '/settings/webview',
      params: { url: PRIVACY_POLICY_URL, title: '개인정보처리방침' },
    });

  const goToTermsOfService = () =>
    router.push({
      pathname: '/settings/webview',
      params: { url: TERMS_OF_SERVICE_URL, title: '이용약관' },
    });

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1 }}
      className="bg-background"
    >
      <View className="flex-row items-center justify-between p-5">
        <Pressable testID="settings-back-button" onPress={goBack} hitSlop={8}>
          <Icon name="chevron-back" size={22} colorClassName="accent-black" />
        </Pressable>
        <Text className="text-[15px] font-bold text-black">설정</Text>
        <View className="w-5.5" />
      </View>

      <ScrollView contentContainerClassName="px-5">
        <SettingsRow
          testID="settings-privacy-policy-row"
          label="개인정보처리방침"
          onPress={goToPrivacyPolicy}
        />
        <SettingsRow
          testID="settings-terms-of-service-row"
          label="이용약관"
          onPress={goToTermsOfService}
        />
        <SettingsRow
          testID="settings-license-row"
          label="오픈소스 라이센스"
          onPress={goToLicense}
        />

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-sm font-semibold text-gray">앱 버전</Text>
          <Text testID="settings-app-version" className="text-sm text-gray">
            {getVersion()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;
