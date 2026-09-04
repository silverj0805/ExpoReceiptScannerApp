import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import NativeReceiptScannerModule from "../../../modules/native-receipt-scanner/src/NativeReceiptScannerModule";

/**
 * Scan 탭 — Step 6/7 스파이크에서 검증한 촬영/갤러리 → OCR 파이프라인 그대로.
 * 네비게이션 골격 태스크 범위상 UI는 아직 스파이크 형태 그대로 두고,
 * 이후 features 이식 태스크에서 실제 ScanScreen 디자인으로 교체한다.
 */
export default function ScanScreen() {
  const [status, setStatus] = useState("대기 중");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);

  const runScan = async (uri: string) => {
    setImageUri(uri);
    setStatus(`scanText 호출 중... (uri: ${uri})`);
    setRecognizedText(null);

    try {
      const text = await NativeReceiptScannerModule.scanText(uri);
      setRecognizedText(text);
      setStatus("성공");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`실패: ${message}`);
    }
  };

  const captureFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("카메라 권한이 필요합니다");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
    });
    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (uri == null) return;
    await runScan(uri);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("사진 보관함 권한이 필요합니다");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
    });
    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (uri == null) return;
    await runScan(uri);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>OCR 파이프라인 스파이크</Text>

        <View style={styles.buttonRow}>
          <Button title="촬영" onPress={captureFromCamera} />
          <Button title="갤러리" onPress={pickFromGallery} />
        </View>

        <Text style={styles.label}>상태</Text>
        <Text style={styles.value}>{status}</Text>

        <Text style={styles.label}>이미지 URI (실측용)</Text>
        <Text style={styles.value}>{imageUri ?? "-"}</Text>

        <Text style={styles.label}>인식된 텍스트</Text>
        <Text style={styles.value}>{recognizedText ?? "-"}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    marginTop: 12,
    fontWeight: "600",
    color: "#666",
  },
  value: {
    fontSize: 14,
  },
});
