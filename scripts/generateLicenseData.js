#!/usr/bin/env node
/**
 * package.json의 dependencies(런타임에 실제로 번들되는 패키지만 — devDependencies 제외)를
 * 순회해서 각 패키지의 node_modules/<pkg>/package.json에서 버전/라이선스/저장소 링크를
 * 읽어와 src/features/settings/constants/licenseData.ts를 생성한다.
 *
 * 의존성이 바뀔 때마다(yarn add/remove 등) 다시 실행해서 최신화할 것:
 *   node scripts/generateLicenseData.js  (또는 yarn generate:licenses)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

function normalizeRepoUrl(repository) {
  if (!repository) return null;
  const raw = typeof repository === 'string' ? repository : repository.url;
  if (!raw) return null;
  return raw
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
    .replace(/^git@github\.com:/, 'https://github.com/');
}

const depNames = Object.keys(pkg.dependencies || {}).sort((a, b) =>
  a.localeCompare(b),
);

const entries = depNames.map(name => {
  const depPkgPath = path.join(ROOT, 'node_modules', name, 'package.json');
  let depPkg = {};
  try {
    depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
  } catch {
    console.warn(`[generateLicenseData] ${name}: package.json을 못 읽음, 건너뜀`);
  }

  return {
    packageName: name,
    version: depPkg.version || pkg.dependencies[name],
    licenseName: depPkg.license || 'UNKNOWN',
    repositoryUrl: normalizeRepoUrl(depPkg.repository),
  };
});

const header = `// 이 파일은 스크립트로 생성됩니다 — 직접 수정하지 마세요.
// 의존성이 바뀌면 다음 명령으로 다시 생성하세요: yarn generate:licenses
// (scripts/generateLicenseData.js)

export interface LicenseEntry {
  packageName: string;
  version: string;
  licenseName: string;
  repositoryUrl: string | null;
}

export const licenseData: LicenseEntry[] = ${JSON.stringify(entries, null, 2)};
`;

const outPath = path.join(
  ROOT,
  'src/features/settings/constants/licenseData.ts',
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, header);
console.log(`[generateLicenseData] ${entries.length}개 패키지 -> ${path.relative(ROOT, outPath)}`);
