import { Pressable, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

interface RawTextSectionProps {
  rawText: string;
  showRaw: boolean;
  onToggle: () => void;
}

const RawTextSection = ({
  rawText,
  showRaw,
  onToggle,
}: RawTextSectionProps) => (
  <View className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-white">
    <Pressable
      onPress={onToggle}
      className="flex-row items-center justify-between px-3.5 py-3"
    >
      <Text className="text-[13px] font-bold text-black">인식된 원문</Text>
      <Icon
        name={showRaw ? 'chevron-up' : 'chevron-down'}
        size={16}
        colorClassName="accent-gray"
      />
    </Pressable>
    {showRaw && (
      <View className="mx-3.5 mb-3.5 rounded-[10px] bg-[#f1f0ec] px-3 py-2.5">
        <Text className="text-[11px] leading-[1.7] text-gray">{rawText}</Text>
      </View>
    )}
  </View>
);

export default RawTextSection;
