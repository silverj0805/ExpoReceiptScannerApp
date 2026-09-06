import * as Crypto from 'expo-crypto';

/**
 * 4~6자리 숫자 PIN은 경우의 수가 최대 100만 개뿐이라 SHA-256을 한 번만 걸면
 * 훔친 해시값에 대해 전수조사를 밀리초~초 단위로 끝낼 수 있다.
 * (진짜 1차 방어는 PIN 입력 시도 횟수 제한 + SecureStore의 OS 레벨 Keychain 암호화이고,
 * 아래 반복은 그 위에 얹는 2차 방어.)
 *
 * `expo-crypto`는 PBKDF2/bcrypt 같은 반복 전용 KDF가 없어서(실측 확인) SHA-256을
 * 10,000번 JS에서 직접 반복 호출한다(매 반복이 네이티브 브릿지를 한 번씩 왕복).
 *
 * **한때 이 반복 횟수를 "브릿지 왕복 비용 때문에 실사용 불가 수준으로 느리다"고 오판해서
 * 10으로 낮췄다가 다시 10,000으로 되돌린 적이 있다 — 그 경위를 기록해둔다(다시 낮추고
 * 싶어질 때 이 코멘트부터 읽을 것)**:
 * 1. Task 11(잠금 게이트) 구현 중, PIN 인증에 성공해도 잠금 화면이 안 사라지는 버그를
 *    발견했다. 화면이 그대로 멈춰 있는 걸 보고 "해시 계산이 안 끝나서 멈췄다"고 추정해서,
 *    반복 횟수를 10,000 → 10으로 낮췄다.
 * 2. 그런데 알고 보니 진짜 원인은 이 파일과 전혀 무관했다 — `LockScreen`이 `useAppLock()`을
 *    자체적으로 또 호출해서 게이트(`_layout.tsx`)와 서로 다른 `isLocked` state 인스턴스를
 *    갖고 있었을 뿐이다(자세한 경위는 `LockScreen.tsx`의 docstring 참고). PIN 검증 자체는
 *    항상 빠르게 성공하고 있었는데, 그 성공을 게이트가 전혀 몰라서 화면만 안 넘어간 것.
 * 3. 이 버그를 찾기 전, 반복 횟수 문제라고 오판한 채로 `react-native-aes-crypto`의
 *    네이티브 `pbkdf2`(반복을 전부 네이티브 코드 안에서 돌림)로 교체도 시도했었는데,
 *    이번엔 검증 시점에 간헐적으로 promise가 영구히 안 풀리는 별개의 문제를 만나서
 *    (New Architecture + 레거시 네이티브 모듈 호환 이슈로 추정, 원인은 못 좁힘) 되돌렸다.
 *    패키지 설치는 남아있지만 이 파일에서는 더 이상 쓰지 않는다.
 * 4. `useAppLock()` 버그를 고친 뒤 반복 횟수 자체를 CPU 사용률로 직접 재보니(시뮬레이터
 *    실측: `ps`로 프로세스 CPU를 0.3초 간격 폴링), **10,000회 전체가 실제로는 약 1.5~2초
 *    (짧게 CPU 사용률이 70~95%로 튀었다가 바로 유휴로 복귀)만에 끝난다** — 애초에
 *    "반복당 ~100~150ms"라던 처음 추정 자체가, 화면이 멈춰 있던 걸 계산이 안 끝난 거라고
 *    잘못 짚은 데서 나온 틀린 숫자였다. 그래서 10,000으로 되돌렸다.
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
