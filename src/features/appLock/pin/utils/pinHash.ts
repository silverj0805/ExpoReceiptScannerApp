import * as Crypto from 'expo-crypto';

/**
 * 4~6자리 숫자 PIN은 경우의 수가 최대 100만 개뿐이라 SHA-256을 한 번만 걸면
 * 훔친 해시값에 대해 전수조사를 밀리초~초 단위로 끝낼 수 있다.
 *
 * `expo-crypto`는 PBKDF2/bcrypt 같은 반복 전용 KDF를 제공하지 않아서(실측 확인),
 * SHA-256을 이 횟수만큼 직접 반복하는 차선택을 선택.
 * (보안 저장소 자체의 OS 레벨 암호화, PIN 입력 시도 횟수 제한과 함께 쓰는 2차 방어 목적)
 */
const HASH_ITERATIONS = 10_000;

/** 기기별 랜덤 salt. 비밀값은 아니라서 PIN 해시와 나란히 저장해도 된다. */
export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** `SHA256(salt + PIN)`을 HASH_ITERATIONS번 반복한 최종 다이제스트(64자리 16진수)를 반환한다. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  let digest = `${salt}:${pin}`;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      digest,
    );
  }
  return digest;
}

/** 입력한 PIN이 저장된 salt·해시와 일치하는지 검증한다. */
export async function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const candidate = await hashPin(pin, salt);
  return candidate === expectedHash;
}
