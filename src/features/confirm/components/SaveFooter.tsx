import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface SaveFooterProps {
  isEditMode: boolean;
  isValid: boolean;
  isLoading: boolean;
  submitError: string | null;
  onSave: () => void;
}

const SaveFooter = ({
  isEditMode,
  isValid,
  isLoading,
  submitError,
  onSave,
}: SaveFooterProps) => (
  <View className="border-t border-[#e8e6e1] bg-background px-5 pb-7 pt-4">
    {submitError && (
      <Text className="mb-2 text-center text-xs text-[#B3261E]">
        {submitError}
      </Text>
    )}
    <TouchableOpacity
      testID="save-button"
      disabled={!isValid || isLoading}
      onPress={onSave}
      className={`items-center rounded-2xl bg-primary py-4 ${
        isValid ? '' : 'opacity-40'
      }`}
    >
      {isLoading ? (
        <View className="py-0.5">
          <ActivityIndicator testID="save-loading" color="#ffffff" />
        </View>
      ) : (
        <Text className="text-base font-bold text-white">
          {isEditMode ? '수정하기' : '저장하기'}
        </Text>
      )}
    </TouchableOpacity>
  </View>
);

export default SaveFooter;
