import { File } from 'expo-file-system';

export function deleteTempImage(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // 이미 지워졌거나 접근 불가한 경로여도 조용히 무시(원본 react-native-fs 버전과 동일한 정책)
  }
}
