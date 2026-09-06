# 앱 잠금 — PIN UI · 설정 온보딩 · 콜드스타트 게이트 Implementation Plan

> **실행 방식 안내(이 프로젝트 전용 조정)**: 이 프로젝트의 CLAUDE.md는 "TODO 하나당 정지점을 두고, 사용자가 명시적으로 지시할 때만 다음 태스크로 진행"을 강제한다. 그래서 이 플랜은 `superpowers:subagent-driven-development`(서브에이전트 자동 디스패치)가 아니라, **이 세션에서 태스크를 하나씩 순서대로 진행하고 매 태스크 끝에 결과를 보고 후 정지**하는 방식으로 실행한다. 각 태스크의 테스트 코드도 이 문서에 전부 미리 써두지 않고(이 프로젝트의 실제 작업 방식대로) 그 태스크를 시작할 때 라이브로 TDD RED→GREEN을 진행한다 — 이 문서는 "무엇을, 어떤 순서로, 어떤 파일에" 하는지의 청사진이다.

**Goal**: PIN 등록/검증 UI, 생체인증 우선 + PIN 필수 등록 온보딩 플로우(Bottom Sheet 공통화), 콜드스타트/재잠금을 구분하는 앱 잠금 게이트를 실제 화면에 연결한다.

**Architecture**: 기존 `useAppLock`/`useBiometricAuth`/`usePinLock`(로직) 위에 UI 레이어(등록·검증 폼, 온보딩 Bottom Sheet, 설정 토글)를 얹고, 마지막에 루트 레이아웃에서 콜드스타트만 트리 자체를 막고 재잠금은 오버레이로 처리하도록 연결한다.

**Tech Stack**: React Native(Expo SDK 57), Zustand(+persist 신규 도입), `@react-native-async-storage/async-storage`(신규), `@gorhom/bottom-sheet`(신규), TanStack Query, Jest + React Native Testing Library, TDD.

**Spec**: 이 대화에서 확정된 보안 정책 — Notion "플랜3-A) 생체인증 앱 잠금" 페이지의 "모으곰 보안 정책" + 이번 세션에서 구체화된 7개 유스케이스(온보딩 모달, 설정 토글, Bottom Sheet 공통화, 콜드스타트/재잠금 분리, 생체 5회 실패 시 자동 PIN 전환, PIN 필수 등록, PIN 2단계 확인).

## Global Constraints

- TDD 필수: 테스트 먼저 작성 → RED 확인 → 구현 → GREEN (CLAUDE.md)
- 태스크 하나 끝나면 결과 보고 후 정지, 사용자의 명시적 지시가 있어야 다음 태스크 진행 (CLAUDE.md + 사용자 표준 지시)
- 커밋은 메시지만 추천, 실제 `git commit`/`push`는 사용자가 직접 실행 (CLAUDE.md)
- 라이브러리는 실제 설치 버전의 공식 문서/`node_modules` 소스로 확인 후 사용 (CLAUDE.md) — 이 플랜에 적어둔 API도 실제 설치 시 재확인 필요
- 생체인증 토글은 일반 저장소, PIN(솔트+반복 해시)만 SecureStore — 기존 확정 정책 4번 그대로 유지
- "최초 설정 여부"는 별도 온보딩 플래그가 아니라 `hasPinSet() || biometricEnabled` 같은 **실제 보안 상태에서 파생**시킨다(온보딩 "오늘 거절함" 쿨다운만 별도 persist)
- 생체인증을 선택해도 PIN 등록은 항상 필수로 강제한다(대체 수단 공백 방지)
- 인증 설정 화면은 전용 Stack 페이지 없이 **Bottom Sheet 하나**로 통일하고, 온보딩 모달과 설정 화면 토글 ON 트리거 두 곳에서 재사용한다
- 설정 화면에는 별도 보안 Stack 페이지 대신 `SettingsScreen`의 "앱 버전" 행 위에 행을 추가한다 — 미설정 상태면 "보안 잠금 설정하기" CTA 한 줄, 설정 완료 상태면 "보안 잠금 방법: 생체인식|PIN 번호" 표시 + "변경하기" 버튼 + "인증 초기화" 행(토글은 쓰지 않는다)
- 콜드스타트(이번 세션에 한 번도 인증 안 됨)는 화면 트리 자체를 안 그리고, 재잠금(백그라운드 5분 후)은 오버레이만 씌운다(상태·쿼리 캐시 보존)

---

## File Structure

```
src/features/appLock/
├── settings/                                          [신규]
│   ├── store/
│   │   ├── useSecuritySettingsStore.ts                # zustand+persist: biometricEnabled, onboardingDeclinedAt
│   │   └── useSecuritySettingsStore.test.ts
│   ├── hooks/
│   │   ├── useSecuritySetupStatus.ts                  # hasPinSet()+biometricEnabled → isSecuritySetUp 파생
│   │   └── useSecuritySetupStatus.test.ts
│   └── components/
│       ├── SecuritySetupSheet.tsx                     # 공통 Bottom Sheet(온보딩 + 설정 토글 ON 트리거 겸용)
│       ├── SecuritySetupSheet.test.tsx
│       ├── HomeSecurityOnboarding.tsx                 # 홈 랜딩 시 조건부로 SecuritySetupSheet를 여는 wrapper
│       └── HomeSecurityOnboarding.test.tsx
├── pin/shared/                                         [신규] # PinRegisterForm/PinVerifyForm 공통 UI
│   ├── pinConstants.ts                                # PIN_LENGTH
│   ├── PinDots.tsx                                    # 입력 자리수 점 표시
│   └── PinKeypad.tsx                                  # 온스크린 숫자 키패드(0~9+지우기), disabled 지원
├── pin/components/                                     [신규]
│   ├── PinRegisterForm.tsx                            # 1차 입력 → 2차 재확인 → savePin
│   ├── PinRegisterForm.test.tsx
│   ├── PinVerifyForm.tsx                              # 잠금 화면용 PIN 입력 + 시도 제한 안내(props로 인증 로직 주입받음)
│   └── PinVerifyForm.test.tsx
├── biometric/hooks/useBiometricAuth.ts                 [수정] # OS lockout 에러 노출
├── biometric/hooks/useBiometricAuth.test.ts            [수정]
├── hooks/useAppLock.ts                                 [수정] # hasUnlockedOnce 추가
├── hooks/useAppLock.test.ts                            [수정]
├── screens/                                             [신규] # Task 11
│   └── LockScreen.tsx                                  # 콜드스타트/재잠금 공용(isRelock prop으로 문구만 분기)
└── README.md                                           [수정] # 새 컴포넌트/플로우 반영

src/features/settings/screens/settings/
├── SettingsScreen.tsx                                  [수정] # 보안 잠금 방법 표시+변경 버튼, 인증 초기화, 미설정 시 CTA
└── SettingsScreen.test.tsx                             [수정]

src/features/receipt/screens/home/index.tsx             [수정] # HomeSecurityOnboarding 렌더

src/app/_layout.tsx                                     [수정] # isSecuritySetUp 게이트 + 콜드스타트/재잠금 분기
```

---

## Task 1: 보안 설정 Zustand 스토어 (persist 최초 도입)

**Files**

- Install: `@react-native-async-storage/async-storage` (zustand persist의 RN 스토리지 어댑터 — 이 프로젝트에 아직 미설치, 실측 확인함)
- Create: `src/features/appLock/settings/store/useSecuritySettingsStore.ts`
- Test: `src/features/appLock/settings/store/useSecuritySettingsStore.test.ts`

**Interfaces**

```ts
interface SecuritySettingsState {
  biometricEnabled: boolean;
  onboardingDeclinedAt: number | null;
  setBiometricEnabled: (enabled: boolean) => void;
  declineOnboardingToday: () => void; // onboardingDeclinedAt = Date.now()
}
```

- Produces: `useSecuritySettingsStore` (zustand 훅), Task 2/7/8/9가 `biometricEnabled`·`declineOnboardingToday`를 그대로 가져다 씀.

**다룰 테스트 케이스**

- 초기값: `biometricEnabled=false`, `onboardingDeclinedAt=null`
- `setBiometricEnabled(true)` 후 값 반영
- `declineOnboardingToday()` 호출 시 `onboardingDeclinedAt`이 현재 시각으로 설정됨
- persist 미들웨어가 실제로 AsyncStorage에 쓰는지(mock AsyncStorage로 확인 — 공식 mock이 `@react-native-async-storage/async-storage/jest/async-storage-mock`으로 제공되는지 설치 후 실측 확인 필요)

**주의**: `Date.now()`를 직접 액션 안에서 호출하는 건 렌더가 아니라 이벤트/액션 컨텍스트라 `react-hooks/purity`에 안 걸림(이전에 설명한 것과 같은 이유).

---

## Task 2: 보안 설정 완료 여부 파생 훅

**Files**

- Create: `src/features/appLock/settings/hooks/useSecuritySetupStatus.ts`
- Test: `src/features/appLock/settings/hooks/useSecuritySetupStatus.test.ts`

**Interfaces**

- Consumes: `hasPinSet()`(`pin/utils/pinStorage.ts`, 비동기), `useSecuritySettingsStore().biometricEnabled`
- Produces: `{ isSecuritySetUp: boolean; isLoading: boolean }` — Task 7(Sheet), Task 8(온보딩), Task 9(설정 토글)가 공통으로 참조

**다룰 테스트 케이스**

- PIN 미등록 + 생체 토글 off → `isSecuritySetUp = false`
- PIN 등록됨 → `isSecuritySetUp = true` (생체 토글 무관)
- 생체 토글 on만 되어 있어도 → `isSecuritySetUp = true`
- `hasPinSet()` 비동기 조회 중엔 `isLoading = true`

---

## Task 3: PIN 등록 폼 (2단계 확인)

**Files**

- Create: `src/features/appLock/pin/components/PinRegisterForm.tsx`
- Test: `src/features/appLock/pin/components/PinRegisterForm.test.tsx`

**Interfaces**

- Consumes: `savePin(pin)`(`pin/utils/pinStorage.ts`)
- Props: `{ biometricAlreadyEnabled: boolean; onComplete: () => void }`
- `biometricAlreadyEnabled`가 true면 "생체인증을 켜셨지만, 생체인증이 실패했을 때를 대비해 PIN도 함께 등록해요" 같은 안내 문구를 보여준다(정책 2.2 대응).

**다룰 테스트 케이스**

- 1차 입력 후 2차 재확인 단계로 전환
- 2차 입력이 1차와 일치하면 `savePin` 호출 후 `onComplete` 콜백
- 불일치하면 에러 메시지 표시, 1차부터 다시(또는 2차만 재입력 — 설계 시 결정)
- `biometricAlreadyEnabled=true`일 때 안내 문구 렌더 확인, false일 때 미노출

---

## Task 4: PIN 검증 폼 + 시도 제한 안내

**Files**

- Create: `src/features/appLock/pin/components/PinVerifyForm.tsx`
- Test: `src/features/appLock/pin/components/PinVerifyForm.test.tsx`

**Interfaces**

- Props: `{ isPinLockedOut: boolean; remainingPinAttempts: number; pinLockoutRemainingMs: number | null; onSubmitPin: (pin: string) => Promise<boolean>; onSuccess: () => void }`
- **결정(계획 수정)**: 애초 "`usePinLock()`을 폼 안에서 직접 호출"로 적어뒀었는데, 실제 작성하면서 문제를 발견해 props로 주입받는 방식으로 바꿨다 — 잠금 화면(Task 11)은 `useAppLock()`(내부적으로 `usePinLock`을 이미 갖고 있음)을 쓰는데, 폼이 별도로 `usePinLock()`을 또 호출하면 서로 다른 React state 인스턴스가 생겨서 시도 횟수·잠금 상태가 두 군데서 따로 논다. 그래서 이 폼은 순수 프레젠테이션 컴포넌트로 두고, 실제 인증 훅(어떤 걸 쓰든)은 부모가 들고 있다가 `onSubmitPin`으로 넘겨준다.
- `PinDots`/`PinKeypad`(`pin/shared/`)를 `PinRegisterForm`과 공통으로 사용

**다룰 테스트 케이스**

- PIN 4자리 입력 완료 시 `onSubmitPin` 호출, 성공(`true`)이면 `onSuccess` 호출
- 실패(`false`)면 에러 메시지 표시 + 입력 초기화, `onSuccess` 미호출
- `remainingPinAttempts`를 "남은 시도 횟수 N회"로 표시
- `isPinLockedOut=true`일 때 키패드 비활성화(눌러도 `onSubmitPin` 호출 안 됨) + `pinLockoutRemainingMs`를 "mm:ss"로 카운트다운 표시

> ✅ Task 1~4까지 끝나면 Notion TODO "1) PIN 완성"을 체크 처리한다.

---

## Task 5: `useBiometricAuth` — OS 레벨 lockout 노출 (생체 5회 실패 자동 PIN 전환용)

**Files**

- Modify: `src/features/appLock/biometric/hooks/useBiometricAuth.ts`
- Modify: `src/features/appLock/biometric/hooks/useBiometricAuth.test.ts`
- Modify: `src/features/appLock/hooks/useAppLock.ts` (반환 타입 변경 전파)
- Modify: `src/features/appLock/hooks/useAppLock.test.ts` (특성화 테스트로 기존 9개 케이스 안 깨지는지 확인)

**Interfaces (변경 후)**

```ts
interface UseBiometricAuthResult {
  isSupported: boolean;
  isEnrolled: boolean;
  authenticate: () => Promise<{ success: boolean; isLockedOut: boolean }>;
}
```

`expo-local-authentication`의 `LocalAuthenticationResult`가 실패 시 `error: LocalAuthenticationError`를 주고, 그 값 중 `'lockout'`이 OS 레벨 잠금을 뜻한다(실측 확인: `node_modules/expo-local-authentication/build/LocalAuthentication.types.d.ts`). `authenticate()`가 `result.error === 'lockout'`이면 `isLockedOut: true`를 함께 반환하도록 확장.

**다룰 테스트 케이스**

- 성공 시 `{ success: true, isLockedOut: false }`
- 일반 실패(`user_cancel` 등) 시 `{ success: false, isLockedOut: false }`
- `error: 'lockout'` 시 `{ success: false, isLockedOut: true }`
- `useAppLock.test.ts`: 기존 mock 반환값이 `boolean`에서 객체로 바뀌므로 전체 mock 갱신 + `isLockedOut: true`일 때 `useAppLock`이 그대로 위로 전파하는지(자동 PIN 전환 자체는 UI 레이어인 Task 11에서 처리 — 이 훅은 신호만 올려준다)

---

## Task 6: `useAppLock` — 콜드스타트/재잠금 구분

**Files**

- Modify: `src/features/appLock/hooks/useAppLock.ts`
- Modify: `src/features/appLock/hooks/useAppLock.test.ts`

**Interfaces**

```ts
interface UseAppLockResult {
  // ...기존 필드
  hasUnlockedOnce: boolean; // 이번 세션에 한 번이라도 인증에 성공한 적 있는지(false로 되돌아가지 않음)
}
```

**다룰 테스트 케이스**

- 마운트 직후 `hasUnlockedOnce = false`
- 생체인증 또는 PIN으로 최초 성공 시 `hasUnlockedOnce = true`
- 그 후 5분 이상 백그라운드로 재잠금(`isLocked = true`)되어도 `hasUnlockedOnce`는 `true`로 유지(콜드스타트가 아님을 구분하는 목적)

---

## Task 7: 인증 설정 Bottom Sheet (공통 컴포넌트)

**Files**

- Install: `@gorhom/bottom-sheet` (설치 후 네이티브 재빌드 필요 여부 실측 확인 — `reanimated`/`gesture-handler` 이미 설치돼 있어 추가 네이티브 코드 없을 가능성이 높지만 가정하지 말고 확인)
- Create: `src/features/appLock/settings/components/SecuritySetupSheet.tsx`
- Test: `src/features/appLock/settings/components/SecuritySetupSheet.test.tsx`

**Interfaces**

- Consumes: `useBiometricAuth()`(`isSupported`, `isEnrolled`), `useSecuritySettingsStore().setBiometricEnabled`, `PinRegisterForm`(Task 3)
- Props: `{ visible: boolean; onClose: () => void; onComplete: () => void }`

**동작**

1. `isSupported && isEnrolled`면 "생체인증으로 설정" 버튼을 1차로 보여주고, 그 아래 "PIN 번호로 할래요" 버튼을 둔다.
2. "생체인증으로 설정" 선택 → `setBiometricEnabled(true)` → 이어서 **항상** `PinRegisterForm`(안내 문구 포함) 노출 → PIN 등록 완료돼야 `onComplete`.
3. "PIN 번호로 할래요" 선택(또는 애초에 미지원/미등록) → 바로 `PinRegisterForm`(안내 문구 없이) → 완료 시 `onComplete`.

**다룰 테스트 케이스**

- 생체 지원+등록 시 "생체인증으로 설정" 버튼 노출
- 미지원/미등록 시 그 버튼 없이 바로 PIN 등록 폼
- 생체인증 선택 후에도 PIN 등록 폼이 강제로 뜨는지(대체 수단 필수 검증)
- PIN 등록 완료 시 `onComplete` 호출

---

## Task 8: 홈 화면 최초 랜딩 온보딩 트리거

**Files**

- Create: `src/features/appLock/settings/components/HomeSecurityOnboarding.tsx`
- Test: `src/features/appLock/settings/components/HomeSecurityOnboarding.test.tsx`
- Modify: `src/features/receipt/screens/home/index.tsx` (이 컴포넌트를 렌더에 추가)

**Interfaces**

- Consumes: `useSecuritySetupStatus()`, `useSecuritySettingsStore()`(`onboardingDeclinedAt`, `declineOnboardingToday`), `SecuritySetupSheet`(Task 7)

**동작**: 마운트 시(useEffect) `isSecuritySetUp === false && (오늘 declinedAt 없음 OR 24시간 경과)`면 안내 모달을 띄운다. 버튼 "네" → `SecuritySetupSheet` 오픈. "다음에 할게요" → `declineOnboardingToday()`.

**참고(정책 확정)**: "다음에 할게요"를 고르는 동안은 PIN도 생체인증도 없는 실제 무잠금 상태다 — 이건 의도된 것이다. **애초에 "한 번 설정하면 완전 무잠금으로 못 돌아간다"는 원칙 자체를 폐기했다** — 인증 초기화(Task 10) 후 재등록을 안 하면 어차피 똑같은 무잠금 상태가 되므로, "설정 전만 예외"라고 우기는 게 실익이 없고 오히려 화면 상태를 더 복잡하게 만들었다. 그래서 지금은 "PIN/생체인증이 등록돼 있으면 잠기고, 없으면 안 잠긴다"는 단순한 규칙 하나로 통일한다(초기 상태든 초기화 이후든 동일하게 적용).

**다룰 테스트 케이스**

- 미설정 + 오늘 거절 기록 없음 → 안내 모달 노출
- 이미 설정됨 → 노출 안 함
- 오늘 이미 거절함(24시간 이내) → 노출 안 함
- 거절한 지 24시간 지남 → 다시 노출
- "다음에 할게요" 클릭 시 `declineOnboardingToday` 호출(시간 판단은 렌더가 아니라 effect 안에서 — purity 규칙 재확인)

---

## Task 9: 설정 화면 보안 토글

**Files**

- Modify: `src/features/settings/screens/settings/SettingsScreen.tsx`
- Modify: `src/features/settings/screens/settings/SettingsScreen.test.tsx`

**Interfaces**

- Consumes: `useSecuritySetupStatus()`, `useSecuritySettingsStore()`, `SecuritySetupSheet`(Task 7)

**동작**: "앱 버전" 행 바로 위에 **"보안 잠금 방법: 생체인식 | PIN 번호"** 표시 행 + **"변경하기"** 버튼 추가(토글이 아니라 현재 방법 표시 + 재선택 버튼 — 라벨을 "보안 잠금"이 아니라 이렇게 정한 이유는 아래 참고). "변경하기"를 누르면 `SecuritySetupSheet`(Task 7과 동일한 "어떤 방법으로 잠글까요?" 모달)가 다시 열려서 방법을 재선택한다. 방법만 바꾸는 이 경로에서는 기존 PIN이 그대로 유지된다(등록 자체를 지우는 건 Task 10의 "인증 초기화"뿐).

**주의 — 화면은 두 상태로 나뉜다**: 이 행은 `isSecuritySetUp === true`(PIN이 등록돼 있거나 생체인증이 켜져 있음)일 때만 보인다. `isSecuritySetUp === false`(Task 8에서 "다음에 할게요"를 고른 상태, 또는 Task 10에서 초기화한 뒤 아직 재등록 안 한 상태 — 실제로 완전 무잠금)일 때는 같은 자리에 **"보안 잠금 설정하기" CTA 한 줄**(탭하면 `SecuritySetupSheet` 오픈)만 보여준다. 두 상태 다 "지금 등록된 인증 수단이 있는가"라는 같은 기준으로 자연스럽게 갈리는 것뿐이라, 별도의 정책 예외가 필요 없다.

**다룰 테스트 케이스**

- `isSecuritySetUp === false` → "보안 잠금 설정하기" CTA 행 렌더, 탭 시 Sheet 오픈
- `isSecuritySetUp === true` → 현재 방법("생체인식"/"PIN 번호") 표시, "변경하기" 탭 시 Sheet 오픈
- Sheet에서 방법을 바꾼 뒤에도 PIN은 유지(재등록 강제 안 됨 — Task 7의 "PIN 등록은 항상 강제"는 최초 등록 시에만 해당, 이미 등록된 PIN을 방법만 바꿀 땐 재등록 불필요)

---

## Task 10: 인증 초기화

**Files**

- Modify: `src/features/settings/screens/settings/SettingsScreen.tsx` (Task 9와 같은 파일 — "인증 초기화" 행 추가)
- Modify: `src/features/settings/screens/settings/SettingsScreen.test.tsx`

**Interfaces**

- Consumes: `clearPin()`(`pin/utils/pinStorage.ts`), `useSecuritySettingsStore().setBiometricEnabled`

**정책(확정)**: "인증 초기화"는 말 그대로 **초기화만** 한다 — 초기화 후 자동으로 재등록 화면을 띄우는 것 같은 부가 동작은 없다. 초기화하면 `isSecuritySetUp`이 `false`가 되어 화면이 Task 9의 미설정 상태("보안 잠금 설정하기" CTA)로 자연스럽게 돌아갈 뿐이고, 사용자가 원할 때 그 CTA를 눌러 최초 설정과 똑같은 플로우(`SecuritySetupSheet`, Task 7)를 다시 밟는다. **재등록 전용 플로우("기존 PIN 검증 후 새 PIN 입력" 같은)는 따로 만들지 않는다** — 초기화 + 최초 등록 플로우 재사용으로 충분하다. 재등록을 안 하면 그대로 무잠금 상태로 남는데, 이건 허용된 상태다(위 정책 확정 참고).

**동작**: "보안 잠금 방법" 표시 행(Task 9) 아래에 "인증 초기화"(경고색) 행을 추가한다. 탭하면 확인 다이얼로그(`Alert.alert` — 네이티브 컴포넌트라 별도 UI 컴포넌트 불필요) → 확인 시 `clearPin()` + `setBiometricEnabled(false)`만 호출하고 끝낸다.

**다룰 테스트 케이스**

- "인증 초기화" 탭 → 확인 다이얼로그 표시
- 확인 시 `clearPin` 호출됨
- 확인 시 `setBiometricEnabled(false)` 호출됨
- 취소 시 아무것도 호출 안 됨

---

## Task 11: 루트 레이아웃 게이트 연결 (콜드스타트 vs 재잠금) + 네이티브 재빌드 + 스모크 테스트

**Files**

- Modify: `src/app/_layout.tsx`
- Create: `src/features/appLock/screens/LockScreen.tsx`(전체 화면) — 생체인증 자동 시도 + `PinVerifyForm` 폴백 + lockout 자동 전환. **콜드스타트/재잠금 둘 다 이 화면 하나를 재사용한다** — 별도 Bottom Sheet(`LockOverlay`)를 만들지 않기로 결정(아래 참고). 재잠금일 때만 "5분 이상 자리를 비우셨어요" 같은 컨텍스트 문구를 추가로 보여준다(목업의 `Main`/`PinVerify`에 이미 반영됨).
- 파일 경로는 이 태스크 시작 시 실제 디렉토리 구조에 맞춰 재확인
- 네이티브 재빌드: `expo prebuild` + `pod install` + `expo run:ios`(`expo-local-authentication`/`expo-secure-store`가 처음으로 실기기·시뮬레이터에서 실행되는 지점)

**결정(계획 수정)**: 재잠금 UI를 콜드스타트와 다른 Bottom Sheet 컴포넌트(`LockOverlay`)로 따로 만드는 방안을 한 번 검토했었지만, 화면 두 벌을 유지보수하는 비용이 컸다. **`LockScreen` 하나를 콜드스타트/재잠금 공용으로 재사용하고, 재잠금인 경우에만 컨텍스트 문구를 얹는 쪽으로 확정했다.**

**Interfaces**

- Consumes: `useAppLock()`(`isLocked`, `hasUnlockedOnce`, `isSupported`, `isEnrolled`, `authenticateWithBiometrics`, `isPinLockedOut` 등), `useSecuritySettingsStore().biometricEnabled`, `useSecuritySetupStatus()`(`isSecuritySetUp`)

**동작**

```
if (!isSecuritySetUp) {
  // 무잠금(정책 확정) — 잠금 관련 UI 자체를 아예 안 그림
  return <Stack>...(기존 그대로)</Stack>;
}
if (isLocked && !hasUnlockedOnce) {
  // 콜드스타트: 트리 자체를 안 그림
  return <LockScreen isRelock={false} />;
}
return (
  <>
    <Stack>...(기존 그대로)</Stack>
    {isLocked && hasUnlockedOnce && <LockScreen isRelock={true} />}
  </>
);
```

- **`isSecuritySetUp === false`(무잠금)면 콜드스타트든 재잠금이든 잠금 UI를 아예 렌더하지 않는다** — 등록된 인증 수단이 없는데 인증을 요구하면 안 되기 때문(정책 확정 사항, Task 8 참고).
- `LockScreen`은 **`isSupported && isEnrolled && biometricEnabled`일 때만** 마운트 즉시 `authenticateWithBiometrics()`를 자동 시도한다 — `isSupported`/`isEnrolled`는 "기기가 생체인증을 할 수 있는가"(OS가 실시간으로 알려주는 사실)이고 `biometricEnabled`는 "사용자가 우리 앱에서 생체인증을 쓰기로 골랐는가"(Task 9의 설정)라서, 셋 다 참이어야 자동 시도가 맞다. 사용자가 온보딩/설정에서 "PIN 번호로 할래요"를 선택했으면(`biometricEnabled: false`) 기기에 Face ID가 등록돼 있어도 자동으로 프롬프트를 띄우지 않고 바로 `PinVerifyForm`(Task 4)을 보여준다.
- `biometricEnabled: true`인 경우 → `isLockedOut`(Task 5)이면 자동으로 `PinVerifyForm`으로 전환, 아니면 재시도 버튼 + "PIN 번호로 할래요" 수동 전환 버튼 병행.
- `isRelock` prop이 `true`면(재잠금) 생체/PIN 화면 문구 아래에 "5분 이상 자리를 비우셨어요" 같은 컨텍스트 텍스트를 추가로 보여준다. 그 외 레이아웃·동작은 콜드스타트와 완전히 동일 — **별도의 Bottom Sheet 오버레이 컴포넌트는 만들지 않는다**(한 번 검토했다가 유지보수 비용 때문에 폐기, 위 참고).

**다룰 테스트 케이스(추가)**

- `isSecuritySetUp: false`면 `isLocked`와 무관하게 `LockScreen`을 렌더 안 하고 바로 `<Stack>`을 보여주는지
- `biometricEnabled: false`면 `isSupported && isEnrolled`가 참이어도 `authenticateWithBiometrics()`를 자동 호출하지 않고 바로 PIN 입력을 보여주는지
- `isRelock={true}`일 때만 "5분 이상 자리를 비우셨어요" 컨텍스트 문구가 보이는지

**검증**

- iOS 시뮬레이터 `Features > Face ID > Enrolled` + `Matching/Non-matching Face`로 성공/실패 실측
- Android 에뮬레이터 Extended Controls Fingerprint로 동일 검증
- 5분 타임아웃은 단위 테스트로 이미 커버되어 있으니 시뮬레이터에선 온디맨드 게이트 노출 여부만 육안 확인
- 가능하면 실기기 1회 확인

> ✅ Task 11까지 끝나면 Notion TODO "2) 앱 잠금 세션" + "3) 생체인증"이 사실상 함께 마무리된다(PIN-only 게이트만으로도 `expo-secure-store` 네이티브 링크가 필요해서, 이 시점에 두 단계를 한 번에 실기기 검증하는 게 재빌드 비용을 아낀다).

**버그(구현 중 발견 — LockScreen이 잠금 해제를 못 알아채던 문제, 진짜 원인)**: `LockScreen`이 `useAppLock()`을 자체적으로 또 호출하고 있었는데, 이 훅은 Zustand 같은 공유 스토어가 아니라 일반 커스텀 훅이라 **호출하는 컴포넌트마다 서로 다른 `isLocked`/`hasUnlockedOnce` state 인스턴스가 생긴다.** 그 결과 `LockScreen` 안에서 PIN 인증에 성공해도 `LockScreen` 자신의 state만 풀리고, 실제로 화면을 그릴지 결정하는 `_layout.tsx`의 `AppLockGate`가 들고 있는 **별도의** `useAppLock()` 인스턴스는 전혀 모른 채로 남아 화면 전환이 영원히 안 되는 버그였다(실기기 재현으로 확인 — PIN 검증 자체는 매번 정상적으로, 빠르게 성공했지만 잠금 화면이 안 사라졌음). **고친 방법**: `useAppLock()`은 `AppLockGate`에서 딱 한 번만 호출하고, 그 결과(`isSupported`/`isEnrolled`/`isPinLockedOut`/`remainingPinAttempts`/`pinLockoutRemainingMs`/`authenticateWithBiometrics`/`authenticateWithPin`)를 `LockScreen`에 props로 내려준다 — `LockScreen`은 이 훅을 직접 호출하지 않는다.

**오진 기록(구현 중 발견 — PIN 해시 반복 횟수는 범인이 아니었다)**: 위 버그를 찾기 전, 인증 성공 후 화면이 멈춘 걸 보고 "`hashPin`의 SHA-256 10,000회 반복(매 반복이 네이티브 브릿지 왕복)이 너무 느려서 안 끝나는 거다"라고 오판했다. 이 오판을 근거로 (1) 반복 횟수를 10,000 → 10으로 낮췄다가, (2) `react-native-aes-crypto`의 네이티브 `pbkdf2`(반복을 전부 네이티브 코드 안에서 처리)로 교체까지 시도했다 — 그런데 이번엔 검증 시점에 간헐적으로 promise가 영구히 안 풀리는 별개의 문제를 만났다(CPU 사용률이 3분 내내 ~~2%로 유휴 상태. New Architecture(`android/gradle.properties`의 `newArchEnabled=true`)와 TurboModule이 아닌 이 라이브러리의 호환 레이어 문제로 추정, 원인은 못 좁힘). 되돌렸다. 그 뒤 위의 진짜 원인(`useAppLock` 중복 호출)을 찾아 고치고 나서, 정말로 반복 횟수 자체가 느린지 `ps`로 프로세스 CPU 사용률을 0.3초 간격으로 직접 재봤다 — **10,000회 SHA-256 반복이 실제로는 약 1.5~2초 만에 끝난다**(CPU가 짧게 70~~95%로 튀었다가 바로 유휴 복귀). "반복당 ~~100~~150ms"라던 처음 추정 자체가, 화면이 멈춰 있던 걸 계산이 안 끝난 거라고 잘못 짚은 데서 나온 틀린 숫자였다. **최종 결정**: `HASH_ITERATIONS`은 10,000으로 그대로 둔다. `react-native-aes-crypto` 패키지는 재빌드 비용 때문에 설치만 남겨두고 코드에서는 안 쓴다. (`src/features/appLock/pin/utils/pinHash.ts` 상단 주석에도 동일 내용 기록.)

**버그(사용자 리포트 — 재잠금 오버레이가 화면을 전부 안 덮던 문제, 2차례 수정)**: 위 버그들을 고친 뒤 실사용 중 발견된 별개의 문제. "5분 이상 백그라운드 후 복귀"(재잠금) 시나리오에서 `LockScreen`이 화면 전체를 덮지 못했다.

- **1차 증상 + 1차 시도**: `<Stack>`과 `<LockScreen isRelock={true}>`를 `<>...</>` Fragment의 나란한 자식으로 두고 있었는데, 절대 위치가 아니면 부모의 기본 flex-column 레이아웃이 이 둘을 세로로 나눠 배치한다 — 홈 화면이 위쪽 절반만 보이고 그 아래에 잠금 화면이 위쪽만 잘려 보이는(하단 탭 밑으로 밀려난) 형태로 나타났다. `<View style={StyleSheet.absoluteFill}>`로 `LockScreen`을 감싸서 flex 레이아웃에서 빼내는 방식으로 1차 수정.
- **2차 증상**: 1차 수정 후 다시 실기기(시뮬레이터)로 재현했더니, 여전히 홈 화면 콘텐츠(최근 영수증 리스트, 하단 탭 등)와 `LockScreen`의 PIN 키패드·문구가 **같은 위치에 서로 겹쳐 투명하게** 비쳐 보였다(레이아웃 분할이 아니라 완전한 시각적 겹침 — 탭 확인 결과 `LockScreen`이 터치는 정상적으로 받고 있어서 z-order/터치 우선순위 자체는 맞았음). 원인으로 추정한 것: `expo-router`의 `<Stack>`(`react-native-screens` 기반)이 백그라운드 복귀 시점에 JS 쪽 형제 순서와 무관하게 네이티브 레벨에서 다시 최상단으로 올라오는 동작 — 그래서 절대 위치 오버레이로는 근본적으로 이 native stack 위에 "불투명하게" 덮이질 않았다(정확한 근본 원인은 react-native-screens 내부까지 좁혀보진 못함, 가설 수준).
- **2차 수정(최종)**: 절대 위치 `View` 대신 RN 내장 `Modal`(별도 `UIWindow`로 렌더돼 다른 native view의 z-order와 무관하게 항상 최상단)로 `LockScreen`을 감쌌다. `react-native-safe-area-context`는 `Modal`이 만드는 새 네이티브 창의 안전영역을 메인 창과 별개로 계산하므로, `Modal` 안에 `SafeAreaProvider`를 하나 더 둬서 insets을 보장했다. 실기기(시뮬레이터) 재현으로 검증: 재잠금 시 홈 화면이 완전히 가려지고(겹침 없음), PIN 입력 후 정상적으로 홈 화면으로 복귀함을 확인.
- **검증 방법**: `useAppLock.ts`의 `SESSION_TIMEOUT_MS`를 일시적으로 3초로 낮춰(커밋 전 5분으로 원복) 실제 5분을 기다리지 않고 반복 재현. 코드 자체는 타임아웃 값과 무관하므로(오버레이 렌더링 로직은 `isLocked && hasUnlockedOnce` 조건만 봄) 3초로 낮춘 상태에서의 검증 결과가 5분 조건에서도 그대로 유효하다고 판단.

---

## Self-Review

- **Spec coverage**: 사용자가 확정한 항목 — 1(파생 상태, Task 2) / 2(PIN 필수+안내문구+lockout 자동전환+Stack 없이 방법 표시 한 줄, Task 3·5·7·9) / 3(온보딩 모달+쿨다운, Task 1·8) / 4(Bottom Sheet 공통화, Task 7) / 5(콜드스타트/재잠금 분리, Task 6·11) / 6(생체 우선+PIN 전환 버튼, Task 7) / 7(PIN 2단계 확인, Task 3) / 8(방법 변경해도 PIN 유지, Task 9) / 9(인증 초기화는 초기화 후 최초 등록 재사용, Task 10) / 10(**정책 뒤집힘**: "완전 무잠금 없음" 원칙 폐기 — 초기화 후 재등록 안 하면 무잠금 그대로 허용, Task 8·9·10) / 11(재잠금 UI 부재 발견 → 처음엔 `LockOverlay`를 Bottom Sheet로 신설했다가, 유지보수 비용 때문에 폐기하고 `LockScreen`을 `isRelock` prop으로 재사용하는 쪽으로 최종 확정 + `isSecuritySetUp` 게이트 추가, Task 11) — 전부 태스크로 매핑됨.
- **해결된 결정 사항**: Task 9는 애초 "토글 ON/OFF" 설계였다가 "현재 방법 표시 + 변경하기 버튼"(Sheet 재오픈)으로 바뀌면서 "OFF 시 PIN을 지울지" 질문 자체가 사라짐 — 방법을 바꿔도 PIN은 항상 유지.
- **의존성 확인 필요 항목**: `@react-native-async-storage/async-storage`(Task 1), `@gorhom/bottom-sheet`(Task 7) 둘 다 설치 후 실측 확인 완료 — 네이티브 코드도 Expo config plugin도 없어서 재빌드 불필요.
