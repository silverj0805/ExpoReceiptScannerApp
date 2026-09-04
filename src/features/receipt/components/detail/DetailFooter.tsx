import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface DetailFooterProps {
  deleteError: string | null;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const DetailFooter = ({
  deleteError,
  isDeleting,
  onEdit,
  onDelete,
}: DetailFooterProps) => (
  <View className="border-t border-[#e8e6e1] bg-background px-5 pb-7 pt-4">
    {deleteError ? (
      <Text className="mb-2 text-center text-xs text-[#B3261E]">
        {deleteError}
      </Text>
    ) : null}
    <View className="flex-row gap-2.5">
      <TouchableOpacity
        testID="detail-edit-button"
        onPress={onEdit}
        className="flex-1 items-center rounded-2xl border border-[#e8e6e1] bg-white py-3.5"
      >
        <Text className="text-sm font-bold text-black">수정</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="detail-delete-button"
        disabled={isDeleting}
        onPress={onDelete}
        className={`flex-1 items-center rounded-2xl border border-[#e7c8c5] bg-white py-3.5 ${
          isDeleting ? 'opacity-40' : ''
        }`}
      >
        {isDeleting ? (
          <ActivityIndicator testID="detail-delete-loading" color="#B3261E" />
        ) : (
          <Text className="text-sm font-bold text-[#B3261E]">삭제</Text>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

export default DetailFooter;
