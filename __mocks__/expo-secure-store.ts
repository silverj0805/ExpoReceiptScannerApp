// expo-secure-store는 공식 Jest mock을 제공하지 않는다(node_modules 확인 완료).
// 네이티브 Keychain/Keystore 대신 인메모리 Map으로 흉내낸 mock.
const store = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return store.has(key) ? store.get(key)! : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export function canUseBiometricAuthentication(): boolean {
  return true;
}
