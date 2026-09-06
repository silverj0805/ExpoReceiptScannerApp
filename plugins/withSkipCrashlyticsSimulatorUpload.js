const { withXcodeProject } = require('@expo/config-plugins');

const CRASHLYTICS_PHASE_NAME = '[CP-User] [RNFB] Crashlytics Configuration';
const GUARD_MARKER = 'skipping Crashlytics dSYM upload for simulator build';

/**
 * `@react-native-firebase/crashlytics`가 심는 dSYM 업로드 빌드 스크립트
 * ("[CP-User] [RNFB] Crashlytics Configuration")가 시뮬레이터 빌드에서 실측으로
 * 확인된 무한 행(hang)을 일으킨다 — 그 스크립트가 실제 실행하는
 * `FirebaseCrashlytics/run`(또는 SPM의 `upload-symbols`)이 Firebase 서버로 심볼을
 * 업로드하는 네트워크 호출인데, 로컬 개발용 시뮬레이터 빌드에서는 그 업로드 자체가
 * 불필요하다(크래시 심볼화는 실기기/배포 빌드에서만 의미가 있음).
 *
 * Firebase 공식 문서도 이 스크립트를 시뮬레이터 빌드에서 건너뛰도록 권장한다
 * (`EFFECTIVE_PLATFORM_NAME`이 `-iphonesimulator`면 즉시 종료).
 *
 * `expo prebuild`가 `ios/`를 통째로 재생성할 때마다 이 스크립트도 새로 심어지므로,
 * 매번 자동으로 가드를 추가해주는 config plugin으로 만들어 둔다.
 */
const withSkipCrashlyticsSimulatorUpload = config => {
  return withXcodeProject(config, config => {
    const project = config.modResults;
    const shellScriptPhases =
      project.hash.project.objects.PBXShellScriptBuildPhase || {};

    let found = false;
    for (const key of Object.keys(shellScriptPhases)) {
      const phase = shellScriptPhases[key];
      // `xcode` 라이브러리는 `<uuid>`와 `<uuid>_comment` 두 키로 같은 항목을 중복 보관한다.
      if (!phase || typeof phase !== 'object' || !phase.shellScript) continue;
      if (phase.name !== `"${CRASHLYTICS_PHASE_NAME}"`) continue;
      found = true;
      if (phase.shellScript.includes(GUARD_MARKER)) continue; // 이미 패치됨(idempotent)

      const guard =
        `if [ \\"\${EFFECTIVE_PLATFORM_NAME}\\" = \\"-iphonesimulator\\" ]; then\\n` +
        `  echo \\"info: ${GUARD_MARKER}\\"\\n` +
        `  exit 0\\n` +
        `fi\\n`;

      // shellScript는 큰따옴표로 감싼 하나의 문자열 리터럴("#!/usr/bin/env bash\n...")이다.
      // 맨 앞 셔뱅 줄 바로 뒤에 가드를 끼워 넣는다.
      phase.shellScript = phase.shellScript.replace(
        /^"(#!\/[^\\]*\\n)/,
        `"$1${guard}`,
      );
    }

    // found=false일 때만 진짜 "못 찾았다" 경고 — found=true인데 patched=false인 건
    // 이미 패치돼 있어서 건너뛴(idempotent) 정상 상태라 경고감이 아니다.
    if (!found) {
      console.warn(
        `[withSkipCrashlyticsSimulatorUpload] "${CRASHLYTICS_PHASE_NAME}" 빌드 스크립트를 못 찾았다 — ` +
          '@react-native-firebase/crashlytics 버전이 바뀌어 스크립트 이름/내용이 달라졌을 수 있다.',
      );
    }

    return config;
  });
};

module.exports = withSkipCrashlyticsSimulatorUpload;
