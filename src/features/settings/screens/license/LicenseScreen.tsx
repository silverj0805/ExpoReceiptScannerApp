import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '@/shared/components/Icon';

import { licenseData } from '../../constants/licenseData';

function LicenseScreen() {
  const goBack = () => router.back();

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1 }}
      className="bg-background"
    >
      <View className="flex-row items-center justify-between p-5">
        <Pressable testID="license-back-button" onPress={goBack} hitSlop={8}>
          <Icon name="chevron-back" size={22} colorClassName="accent-black" />
        </Pressable>
        <Text className="text-[15px] font-bold text-black">
          오픈소스 라이센스
        </Text>
        <View className="w-5.5" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-5"
      >
        {licenseData.map(item => (
          <View
            key={item.packageName}
            className="gap-1 border-b border-[#e8e6e1] py-4"
          >
            <Pressable
              testID={`license-item-${item.packageName}`}
              disabled={!item.repositoryUrl}
              onPress={() => {
                if (item.repositoryUrl) {
                  Linking.openURL(item.repositoryUrl).catch(() => {});
                }
              }}
              className="flex-row flex-wrap items-center gap-1"
            >
              <Text className="text-sm font-bold text-primary">
                {item.packageName} ({item.version})
              </Text>
              {item.repositoryUrl && (
                <Icon
                  name="open-outline"
                  size={13}
                  colorClassName="accent-gray"
                />
              )}
            </Pressable>
            <Text className="text-xs font-semibold text-gray">
              {item.licenseName}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default LicenseScreen;
