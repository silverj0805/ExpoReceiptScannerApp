import * as SecureStore from 'expo-secure-store';

/** PIN 등록·검증 화면(PinDots/PinKeypad/pinRegisterModal/pinVerify)이 공통으로 참조하는 자리수. */
export const PIN_LENGTH = 4;

/**
 * PIN은 민감값이라 useAppLockStore(AsyncStorage 기반)가 아니라 보안 저장소
 * (expo-secure-store)에 별도로 저장한다.
 *
 * 지금은 평문 그대로 저장한다 — 해싱(salt+반복 해시)은 추후 별도 태스크로 미룬다
 * 저장 위치(SecureStore)만 먼저 올바르게 잡아두고, 값의 형태(평문→해시)는 나중에
 * 이 파일 내부 구현만 바꾸면 되도록 아래 함수 시그니처는 해싱 도입 후에도
 * 그대로 유지될 수 있게 설계했다.
 */
const PIN_STORAGE_KEY = 'appLock.pin';

/** PIN을 저장한다(이미 있으면 덮어씀). */
export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_STORAGE_KEY, pin);
}

/** PIN이 등록돼 있는지 확인한다(대체 인증 수단을 보여줄지 판단할 때 씀). */
export async function hasPinSet(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
  return stored != null;
}

/** 입력한 PIN이 저장된 값과 일치하는지 검증한다. PIN이 없으면 항상 false. */
export async function verifyStoredPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
  return stored != null && stored === pin;
}

/** 등록된 PIN을 지운다. */
export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_STORAGE_KEY);
}
