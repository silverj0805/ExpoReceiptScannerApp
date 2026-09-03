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

import NativeReceiptScannerModule from "../../modules/native-receipt-scanner/src/NativeReceiptScannerModule";

/**
 * 스파이크 검증용 최소 화면.
 * 목적: 촬영/갤러리 선택 → scanText 호출까지 엔드투엔드 1회 성공 확인.
 * 정식 UI가 아니라 검증용이라, 결과는 화면에 그대로 노출한다(가정하지 않고 실측하기 위함).
 */
export default function ScanSpikeScreen() {
  const [status, setStatus] = useState("대기 중");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);

  const runScan = async (uri: string) => {
    setImageUri(uri);
    // uri에 스킴(file://)이 포함돼 있는지 실측 — 원본 프로젝트(vision-camera)와 달리
    // expo-image-picker가 어떤 형태로 주는지 가정하지 않고 화면에 그대로 노출한다.
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
