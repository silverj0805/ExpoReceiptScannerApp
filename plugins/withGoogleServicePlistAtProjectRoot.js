const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

/**
 * RNFB Crashlytics의 dSYM 업로드 스크립트(ios_config.sh)는 GoogleService-Info.plist를
 * ${PROJECT_DIR}(= ios/ 최상위)에서 찾는다. 하지만 Expo의 googleServicesFile 설정은
 * 이 파일을 앱 타겟 서브폴더(ios/<앱이름>/GoogleService-Info.plist)에만 복사해서,
 * 빌드 시 "Unable to read Google Service plist at path .../ios/GoogleService-Info.plist"
 * 에러로 빌드 자체가 실패한다(실측으로 확인).
 *
 * expo prebuild 때마다 ios/ 폴더가 통째로 재생성되므로, 이 복사를 매번 자동으로
 * 해주는 config plugin으로 만들어 둔다.
 */
const withGoogleServicePlistAtProjectRoot = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const source = path.join(config.modRequest.projectRoot, 'GoogleService-Info.plist');
      const destination = path.join(
        config.modRequest.platformProjectRoot,
        'GoogleService-Info.plist',
      );
      fs.copyFileSync(source, destination);
      return config;
    },
  ]);
};

module.exports = withGoogleServicePlistAtProjectRoot;
