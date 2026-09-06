const { withMainActivity } = require('@expo/config-plugins');

/**
 * Android 13(API 33)부터 제공되는 Activity.setRecentsScreenshotEnabled(false)로
 * 최근 앱 전환기(스위처) 썸네일만 끈다 — FLAG_SECURE와 달리 스크린샷/화면 녹화는 그대로 허용된다.  
 *
 * 안드로이드는 PrivacyScreenCover(JS, AppState 기반)로는 스위처 스냅샷이 찍히는
 * 타이밍을 못 따라 잡아서, 네이티브에서 처리
 *
 * expo prebuild가 android/를 매번 새로 생성하므로, 이 삽입을 config plugin으로 자동화해 둔다.
 */
const withRecentsScreenshotDisabled = config => {
  return withMainActivity(config, config => {
    if (config.modResults.language !== 'kt') {
      throw new Error(
        'withRecentsScreenshotDisabled는 Kotlin으로 생성된 MainActivity만 지원합니다.',
      );
    }

    if (config.modResults.contents.includes('setRecentsScreenshotEnabled')) {
      return config;
    }

    let { contents } = config.modResults;

    if (!contents.includes('import android.os.Build')) {
      contents = contents.replace(
        /^(package .+\n)/m,
        '$1\nimport android.os.Build\n',
      );
    }

    contents = contents.replace(
      /^(\s*)(super\.onCreate\([^)]*\)\s*\n)/m,
      (_match, indent, superCallLine) =>
        `${indent}${superCallLine}` +
        `${indent}if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {\n` +
        `${indent}  setRecentsScreenshotEnabled(false)\n` +
        `${indent}}\n`,
    );

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withRecentsScreenshotDisabled;
