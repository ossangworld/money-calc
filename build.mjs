// 사용법: node build.mjs  ->  public/ 폴더에 사이트 전체를 만든다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.dirname(new URL(import.meta.url).pathname);
const config = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const out = path.join(root, 'public');
const Calc = createRequire(import.meta.url)('./assets/calc.js');

// 본문에 미리 계산해 넣는 표 (검색엔진이 읽을 수 있게 정적으로 만든다)
const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
function salaryTable() {
  const rows = [];
  for (let man = 2500; man <= 10000; man += man < 6000 ? 500 : 1000) {
    const r = Calc.netSalary({ annual: man * 10000, nonTaxableMonthly: 200000, dependents: 1 });
    rows.push(`<tr><td>${man.toLocaleString('ko-KR')}만 원</td><td>${won(r.netMonthly)}</td><td>${won(r.totalDeduction)}</td></tr>`);
  }
  return rows.join('\n');
}
function weeklyTable() {
  return [15, 20, 25, 30, 35, 40].map(h => {
    const r = Calc.weeklyHolidayPay({ hourly: Calc.RATES.minimumWage, weeklyHours: h });
    return `<tr><td>${h}시간</td><td>${r.hours}시간</td><td>${won(r.weekly)}</td><td>${won(r.monthlyWithBase)}</td></tr>`;
  }).join('\n');
}
const BLOCKS = { SALARY_TABLE: salaryTable, WEEKLY_TABLE: weeklyTable };

const NAV = [
  ['/salary/', '연봉 실수령액'],
  ['/severance/', '퇴직금'],
  ['/weekly-holiday-pay/', '주휴수당'],
  ['/unemployment/', '실업급여'],
  ['/annual-leave/', '연차'],
  ['/insurance/', '4대보험'],
  ['/wage/', '시급·월급'],
  ['/parental-leave/', '육아휴직'],
];

function parsePage(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--\n([\s\S]*?)\n-->\n/);
  if (!m) throw new Error(`front matter 없음: ${file}`);
  const meta = Object.fromEntries(m[1].split('\n').map(l => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }));
  return { ...meta, body: raw.slice(m[0].length) };
}

function adsenseHead() {
  if (!config.adsenseClient) return '';
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsenseClient}" crossorigin="anonymous"></script>`;
}

function fill(text) {
  return text
    .replaceAll('{{SITE_NAME}}', config.name)
    .replaceAll('{{EMAIL}}', config.email)
    .replace(/{{(\w+)}}/g, (all, key) => BLOCKS[key] ? BLOCKS[key]() : all);
}

function layout(page) {
  page = { ...page, description: fill(page.description), body: fill(page.body) };
  const title = page.path === '/' ? `${config.name} | ${page.title}` : `${page.title} | ${config.name}`;
  const nav = NAV.map(([href, label]) =>
    `<a href="${href}"${href === page.path ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const body = page.body;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${page.description}">
<link rel="canonical" href="${config.url}${page.path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${config.name}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${config.url}${page.path}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
${adsenseHead()}
${config.googleVerification ? `<meta name="google-site-verification" content="${config.googleVerification}">` : ''}
${config.naverVerification ? `<meta name="naver-site-verification" content="${config.naverVerification}">` : ''}
</head>
<body>
<header class="site"><div class="wrap">
<a class="logo" href="/">직장인<span>계산기</span></a>
<nav class="top">${nav}</nav>
</div></header>
<main><div class="wrap">
${body}
</div></main>
<footer class="site"><div class="wrap">
<p><a href="/about/">사이트 소개</a><a href="/privacy/">개인정보처리방침</a><a href="/terms/">이용약관</a></p>
<p>계산 결과는 입력값과 공개된 기준으로 낸 추정치이며, 실제 지급액은 회사와 기관의 산정에 따라 다를 수 있습니다.</p>
<p>© ${new Date().getFullYear()} ${config.name}</p>
</div></footer>
<script src="/assets/calc.js"></script>
<script src="/assets/ui.js"></script>
${page.script ? `<script src="/assets/${page.script}"></script>` : ''}
</body>
</html>
`;
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });

const pages = fs.readdirSync(path.join(root, 'src/pages'))
  .filter(f => f.endsWith('.html'))
  .map(f => parsePage(path.join(root, 'src/pages', f)));

for (const page of pages) {
  const dir = path.join(out, page.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), layout(page));
}

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map(p => `  <url><loc>${config.url}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`);
if (config.adsenseClient) {
  fs.writeFileSync(path.join(out, 'ads.txt'),
    `google.com, ${config.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
}
console.log(`${pages.length}개 페이지를 public/에 만들었습니다.`);
