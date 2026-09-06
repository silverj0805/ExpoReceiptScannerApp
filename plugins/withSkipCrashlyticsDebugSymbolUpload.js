const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

// 이미 패치돼 있는지 판별하는 마커 — 중복 삽입 방지용.
const GUARD_MARKER = '# withSkipCrashlyticsDebugSymbolUpload';

const GUARD_BLOCK = `${GUARD_MARKER} 플러그인이 추가함 — 로컬 Debug 빌드에서 upload-symbols(Firebase
# Crashlytics 심볼 업로드 도구)가 macOS의 DebugSymbols 프레임워크와 호환성 문제로
# 데드락에 걸리는 걸 실측으로 확인함(sample로 콜스택 확인 —
# NSOperationQueue의 addOperations:waitUntilFinished:에서 영원히 대기, 하루 4번
# 재현). Debug 빌드는 로컬 개발용이라 크래시 심볼릭케이션이 필요 없으므로 이
# 스텝 전체를 건너뛴다. Release(TestFlight/배포) 빌드는 원본 스크립트가 그대로
# 실행돼 dSYM 업로드가 유지된다.
if [ "\${CONFIGURATION}" = "Debug" ]; then
  echo "info: Skipping Crashlytics dSYM upload for Debug build (withSkipCrashlyticsDebugSymbolUpload plugin)"
  exit 0
fi
`;

/**
 * @react-native-firebase/crashlytics의 iOS 빌드 phase("[CP-User] [RNFB]
 * Crashlytics Configuration")는 Expo config plugin이 만드는 게 아니라, React
 * Native 오토링킹이 `pod install` 도중 이 패키지의 `react-native.config.js`
 * (`ios.scriptPhases`)를 보고 `ios_config.sh` 파일 내용을 그대로 읽어 Xcode
 * 프로젝트에 인라인으로 박아 넣는다(node_modules로 실측 확인 — pbxproj에 박힌
 * 스크립트 내용이 이 파일과 100% 일치).
 *
 * `expo prebuild`는 `configureProjectAsync`(config plugin 전부 적용)를 끝낸
 * 뒤에야 `pod install`을 별도로 실행한다(node_modules/@expo/cli 소스로 확인)
 * — 그래서 `withXcodeProject`로 pbxproj를 직접 고치는 방식은 이 시점에 해당
 * 빌드 phase 자체가 아직 없어서 통하지 않는다. 대신 pod install이 나중에 읽어갈
 * 원본 파일(`node_modules/@react-native-firebase/crashlytics/ios_config.sh`)을
 * prebuild 시점에 먼저 고쳐두면, 그 직후 실행되는 pod install이 고쳐진 내용을
 * 그대로 읽어가 인라인해준다.
 *
 * `upload-symbols`(Firebase가 배포하는 심볼 업로드 바이너리, v3.21)가 macOS
 * 26.5.2에서 dSYM 분석 중 데드락에 걸려 빌드가 무한정 멈추는 문제를 실측으로
 * 확인했다(`ps`/`sample`로 콜스택 확인: NSOperationQueue의
 * addOperations:waitUntilFinished:에서 절대 안 끝나는 작업을 기다리며 멈춤 —
 * 네트워크 소켓도 안 열려 있어 네트워크 문제는 아님, 하루 4번 재현). Debug
 * 빌드(로컬 시뮬레이터/기기 개발 반복)는 심볼 업로드 결과물 자체가 쓸모없으므로
 * (크래시 심볼릭케이션은 실제 배포된 빌드에만 의미가 있음), Debug 설정에서는
 * 스크립트 맨 앞에서 바로 종료하도록 가드를 삽입한다. Release 빌드는 원본
 * 스크립트가 그대로 실행돼 dSYM 업로드가 유지된다.
 *
 * `node_modules/`는 `yarn install` 때마다 새로 깔리므로(patch-package 없이),
 * `ios/`가 매 prebuild마다 재생성되는 이유와 마찬가지로 이 패치도 매번 다시
 * 걸어야 한다 — 여기서는 매 prebuild(= 매 pod install 직전)마다 다시 걸어서
 * 해결한다(withGoogleServicePlistAtProjectRoot와 동일한 config plugin 패턴).
 */
const withSkipCrashlyticsDebugSymbolUpload = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const scriptPath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        '@react-native-firebase',
        'crashlytics',
        'ios_config.sh',
      );

      if (!fs.existsSync(scriptPath)) {
        // 조용히 넘어가면 @react-native-firebase/crashlytics의 패키지 구조가
        // 바뀌었을 때 이 플러그인이 아무 효과 없이 무력화된 걸 못 알아차리게
        // 된다 — prebuild 자체를 실패시켜서 바로 드러나게 한다.
        throw new Error(
          `withSkipCrashlyticsDebugSymbolUpload: ${scriptPath}를 찾지 못했습니다 — @react-native-firebase/crashlytics 패키지 구조가 바뀌었을 수 있습니다.`,
        );
      }

      const script = fs.readFileSync(scriptPath, 'utf8');
      if (script.includes(GUARD_MARKER)) {
        return config;
      }

      const shebangLine = '#!/usr/bin/env bash\n';
      const insertAt = script.indexOf(shebangLine);
      const patched =
        insertAt === -1
          ? GUARD_BLOCK + script
          : script.slice(0, insertAt + shebangLine.length) +
            GUARD_BLOCK +
            script.slice(insertAt + shebangLine.length);

      fs.writeFileSync(scriptPath, patched);

      return config;
    },
  ]);
};

module.exports = withSkipCrashlyticsDebugSymbolUpload;
