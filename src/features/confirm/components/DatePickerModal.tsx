import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  maximumDate: Date;
  onDismiss: () => void;
  onConfirm: () => void;
  onValueChange: (date: Date) => void;
}

const DatePickerModal = ({
  visible,
  value,
  maximumDate,
  onDismiss,
  onConfirm,
  onValueChange,
}: DatePickerModalProps) => (
  <Modal
    testID="date-picker-modal"
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onDismiss}
  >
    <View className="flex-1 justify-end">
      <Pressable
        testID="date-picker-backdrop"
        style={StyleSheet.absoluteFill}
        className="bg-black/40"
        onPress={onDismiss}
      />
      <View className="rounded-t-3xl bg-white px-5 pb-8 pt-3">
        <View className="mb-2 items-center">
          <View className="h-1 w-9 rounded-full bg-[#e8e6e1]" />
        </View>
        <DateTimePicker
          testID="date-picker-native"
          value={value}
          mode="date"
          display="spinner"
          maximumDate={maximumDate}
          onValueChange={(_event, selectedDate) => {
            if (selectedDate) {
              onValueChange(selectedDate);
            }
          }}
        />
        <TouchableOpacity
          onPress={onConfirm}
          className="mt-3 items-center rounded-2xl bg-primary py-3.5"
        >
          <Text className="text-base font-bold text-white">확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default DatePickerModal;
