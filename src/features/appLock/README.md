# 앱 잠금 (appLock)

생체인증(Face ID/지문) 우선, 실패·미지원 시 PIN으로 대체하는 앱 잠금 기능. 보안 정책과 실제 동작 흐름을 정리한다.

## 보안 정책

1. **생체인증 게이트**: 앱 최초 진입 시, 그리고 세션 정책에 따라 재인증이 필요할 때 Face ID/지문 인증을 요구한다.
2. **세션(비활성 타임아웃) 정책**: 앱이 백그라운드로 전환된 시각을 기록해두고, 포그라운드로 복귀했을 때 그 시각으로부터 **5분 이상 경과했으면 재인증을 다시 트리거**한다. 5분 미만이면 그냥 통과시킨다(매번 무조건 잠그지 않음).
3. **생체인증 대체 수단(PIN)**: 생체인증이 미지원·미등록이거나 실패했을 때 PIN으로 대체 인증할 수 있게 한다.
4. **보안 저장소(`expo-secure-store`) 사용 대상은 PIN(솔트+반복 해시)뿐이다.** "유출되면 실제로 뚫리는 값"만 SecureStore에 넣는다는 원칙.
5. **PIN은 원문이 아니라 솔트(기기별 랜덤값) + 반복 해시로 저장한다.** `expo-crypto`는 SHA-256 같은 단발 해시만 제공하고 PBKDF2/bcrypt 같은 반복 전용 KDF는 없어서, `SHA256(salt + PIN)`을 1만 번 직접 반복하는 차선책을 쓴다. 4~6자리 PIN은 경우의 수가 최대 100만 개뿐이라 이 반복 해시만으로 브루트포스를 막을 순 없다 — 그래서 방어는 아래처럼 3중 구조다.

### PIN 인증 3중 방어 구조

| 순서 | 방어                                   | 역할                                                          |
| ---- | -------------------------------------- | ------------------------------------------------------------- |
| 1차  | PIN 시도 횟수 제한(`usePinLock`)       | 온라인 대입 공격 자체를 차단                                  |
| 2차  | `expo-secure-store`(Keychain/Keystore) | OS 레벨 암호화 — 기기 탈취 방어                               |
| 3차  | 솔트 + 반복 해시(`pinHash`)            | Keychain/Keystore가 뚫렸을 때의 오프라인 브루트포스 비용 증가 |

## 아키텍처

```
src/features/appLock/
├── biometric/
│   └── hooks/useBiometricAuth.ts   # 하드웨어 감지(isSupported/isEnrolled) + authenticate()
├── pin/
│   ├── utils/
│   │   ├── pinHash.ts              # 솔트 생성 + SHA-256 반복 해시 + 검증
│   │   └── pinStorage.ts           # PIN(salt+해시)을 SecureStore에 저장/조회/삭제
│   └── hooks/usePinLock.ts         # PIN 검증 + 시도 횟수 제한(rate limiting)
└── hooks/useAppLock.ts             # isLocked + 세션(5분) 타임아웃 + 위 두 훅을 조합
```

- **`useBiometricAuth`**: `expo-local-authentication`만 의존. 하드웨어 지원·등록 여부와 `authenticate()`(성공/실패만 반환)를 제공. 잠금 상태는 모른다.
- **`usePinLock`**: `pinStorage`만 의존. PIN 검증, PIN 5회 실패 시 5분 잠금, 남은 시도 횟수·잠금 해제까지 남은 시간을 제공. 잠금 상태는 모른다.
- **`useAppLock`**: 위 두 훅을 조합하는 오케스트레이터. "지금 잠겨 있는지"와 "언제 다시 잠글지(백그라운드 5분)"만 책임지고, 실제 인증 로직은 전혀 모른다.

## 동작 흐름

### 1) 앱 진입 / 잠금 해제 흐름

```mermaid
flowchart TD
    A[앱 실행 또는 5분 이상 후 포그라운드 복귀] --> B{isLocked}
    B -- true --> C[잠금 화면]
    C --> D{생체인증 지원 + 등록?}
    D -- 예 --> E[생체인증 시도]
    E -- 성공 --> F[isLocked = false\nPIN 실패 기록 초기화]
    E -- 실패 --> G[PIN 입력 화면으로 전환]
    D -- 아니오 --> G
    G --> H{PIN 시도 제한 걸림?}
    H -- 예 --> I[검증 자체를 안 하고 대기 안내]
    H -- 아니오 --> J[PIN 검증]
    J -- 맞음 --> F
    J -- 틀림 --> K[남은 시도 횟수 -1]
    K --> L{5회 연속 실패?}
    L -- 예 --> M[5분간 잠금 시작]
    L -- 아니오 --> G
    B -- false --> N[정상 사용]
```

### 2) 세션 타임아웃 (백그라운드 5분)

```mermaid
sequenceDiagram
    participant OS as AppState (OS)
    participant Hook as useAppLock

    OS->>Hook: 'background' (앱이 백그라운드로 전환)
    Hook->>Hook: backgroundedAt = now 기록

    OS->>Hook: 'active' (포그라운드로 복귀)
    Hook->>Hook: now - backgroundedAt 계산
    alt 5분 이상 경과
        Hook->>Hook: isLocked = true (재인증 요구)
    else 5분 미만
        Hook->>Hook: isLocked 유지 (그냥 통과)
    end
```

### 3) PIN 시도 횟수 제한 (rate limiting)

```mermaid
sequenceDiagram
    participant U as 사용자
    participant Pin as usePinLock
    participant Store as pinStorage (SecureStore)

    U->>Pin: authenticate(pin)
    alt 이미 잠금 중
        Pin-->>U: false (검증 자체를 안 함)
    else 잠금 아님
        Pin->>Store: verifyStoredPin(pin)
        Store-->>Pin: true/false
        alt 맞음
            Pin->>Pin: 실패 횟수·잠금 초기화
            Pin-->>U: true
        else 틀림
            Pin->>Pin: 실패 횟수 +1
            opt 5회째 실패
                Pin->>Pin: pinLockedUntil = now + 5분
            end
            Pin-->>U: false
        end
    end
```
