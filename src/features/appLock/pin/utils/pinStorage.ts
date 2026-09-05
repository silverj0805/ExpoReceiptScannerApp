import * as SecureStore from 'expo-secure-store';

import { generateSalt, hashPin, verifyPin } from './pinHash';

/**
 * PIN(정확히는 salt+반복 해시)은 보안 저장소(expo-secure-store)에 저장
 */
const PIN_RECORD_KEY = 'appLock.pinRecord';

interface PinRecord {
  salt: string;
  hash: string;
}

function isPinRecord(value: unknown): value is PinRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PinRecord).salt === 'string' &&
    typeof (value as PinRecord).hash === 'string'
  );
}

async function readPinRecord(): Promise<PinRecord | null> {
  const raw = await SecureStore.getItemAsync(PIN_RECORD_KEY);
  if (!raw) return null;

  const parsed: unknown = JSON.parse(raw);
  return isPinRecord(parsed) ? parsed : null;
}

/** PIN을 salt+반복 해시로 만들어 SecureStore에 저장한다(원문은 저장하지 않음). */
export async function savePin(pin: string): Promise<void> {
  const salt = await generateSalt();
  const hash = await hashPin(pin, salt);
  const record: PinRecord = { salt, hash };
  await SecureStore.setItemAsync(PIN_RECORD_KEY, JSON.stringify(record));
}

/** PIN이 등록돼 있는지 확인한다(대체 인증 수단을 보여줄지 판단할 때 씀). */
export async function hasPinSet(): Promise<boolean> {
  const record = await readPinRecord();
  return record != null;
}

/** 입력한 PIN이 저장된 salt·해시와 일치하는지 검증한다. PIN이 없으면 항상 false. */
export async function verifyStoredPin(pin: string): Promise<boolean> {
  const record = await readPinRecord();
  if (!record) return false;

  return verifyPin(pin, record.salt, record.hash);
}

/** 등록된 PIN을 지운다. */
export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_RECORD_KEY);
}
