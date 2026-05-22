const fs = require('fs');
const https = require('https');
const path = require('path');

const FIRST_DRAW_DATE_KST = '2002-12-07T20:45:00+09:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const OUTPUT_PATH = path.resolve(__dirname, '../public/data/lotto-history.json');
const SEED_DRAWS = [
  {
    drwNo: 1224,
    drwNoDate: '2026-05-16',
    totSellamnt: 0,
    firstWinamnt: 2414855250,
    firstPrzwnerCo: 12,
    drwtNo1: 9,
    drwtNo2: 18,
    drwtNo3: 21,
    drwtNo4: 27,
    drwtNo5: 44,
    drwtNo6: 45,
    bnusNo: 28,
  },
];


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const previewText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

const mergeSeedDraws = (draws = []) => {
  const drawMap = new Map();

  [...SEED_DRAWS, ...draws].forEach((draw) => {
    const round = Number(draw && draw.drwNo);
    if (round > 0) drawMap.set(round, draw);
  });

  return [...drawMap.values()].sort((a, b) => Number(a.drwNo) - Number(b.drwNo));
};

const readExistingData = () => {
  if (!fs.existsSync(OUTPUT_PATH)) {
    return {
      latestRound: 0,
      updatedAt: '',
      source: 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round}',
      draws: mergeSeedDraws([]),
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    return {
      latestRound: Number(parsed.latestRound || 0),
      updatedAt: parsed.updatedAt || '',
      source:
        parsed.source ||
        'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round}',
      draws: mergeSeedDraws(Array.isArray(parsed.draws) ? parsed.draws : []),
    };
  } catch (error) {
    console.warn('기존 lotto-history.json을 읽지 못했습니다. 새 데이터로 다시 생성합니다.');
    return {
      latestRound: 0,
      updatedAt: '',
      source: 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round}',
      draws: mergeSeedDraws([]),
    };
  }
};

const writeData = ({ latestRound, draws, updatedAt = new Date().toISOString() }) => {
  const normalizedDraws = mergeSeedDraws(draws);

  const nextLatestRound =
    Number(latestRound) ||
    (normalizedDraws.length ? Number(normalizedDraws[normalizedDraws.length - 1].drwNo) : 0);

  const payload = {
    latestRound: nextLatestRound,
    updatedAt,
    source: 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round}',
    draws: normalizedDraws,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`로또 데이터 저장 완료: ${OUTPUT_PATH}`);
  console.log(`저장 회차 수: ${normalizedDraws.length}개 / 최신 회차: ${nextLatestRound || '없음'}`);
};

const estimateLatestRound = () => {
  const firstDrawTime = new Date(FIRST_DRAW_DATE_KST).getTime();
  const now = Date.now();

  return Math.max(1, Math.floor((now - firstDrawTime) / WEEK_MS) + 1);
};

const extractLatestRoundFromHtml = (html) => {
  const rounds = [...String(html || '').matchAll(/(\d{3,4})회/g)]
    .map((match) => Number(match[1]))
    .filter((round) => round > 0);

  return rounds.length ? Math.max(...rounds) : 0;
};

const findLatestRoundFromResultPage = async () => {
  const url = 'https://www.dhlottery.co.kr/lt645/result';
  const { ok, statusCode, body, reason } = await requestText(url);

  if (!ok) {
    console.warn(`동행복권 결과 페이지 확인 실패: ${reason || statusCode || 'unknown'}`);
    return 0;
  }

  const latestRound = extractLatestRoundFromHtml(body);
  if (latestRound > 0) {
    console.log(`동행복권 결과 페이지 기준 최신 회차: ${latestRound}회`);
  }

  return latestRound;
};

const requestText = (url, retryCount = 1) =>
  new Promise((resolve) => {
    const request = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'identity',
          Referer: 'https://www.dhlottery.co.kr/gameResult.do?method=byWin',
          'X-Requested-With': 'XMLHttpRequest',
          Connection: 'close',
        },
        timeout: 5000,
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;

        if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
          response.resume();
          const nextUrl = new URL(location, url).toString();
          resolve(requestText(nextUrl, retryCount));
          return;
        }

        let body = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });

        response.on('end', async () => {
          if (statusCode >= 500 && retryCount > 0) {
            await sleep(500);
            resolve(requestText(url, retryCount - 1));
            return;
          }

          resolve({
            ok: true,
            statusCode,
            body,
          });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy();
      resolve({
        ok: false,
        statusCode: 0,
        body: '',
        reason: 'timeout',
      });
    });

    request.on('error', async (error) => {
      if (retryCount > 0) {
        await sleep(500);
        resolve(requestText(url, retryCount - 1));
        return;
      }

      resolve({
        ok: false,
        statusCode: 0,
        body: '',
        reason: error.message || 'request-error',
      });
    });
  });

const requestLottoRound = async (round) => {
  const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`;
  const { ok, statusCode, body, reason } = await requestText(url);
  const trimmedBody = String(body || '').trim();

  if (!ok) {
    return {
      returnValue: 'fail',
      drwNo: round,
      reason: reason || 'request-failed',
      statusCode,
      preview: '',
    };
  }

  if (!trimmedBody.startsWith('{')) {
    return {
      returnValue: 'fail',
      drwNo: round,
      reason: 'non-json',
      statusCode,
      preview: previewText(trimmedBody),
    };
  }

  try {
    return JSON.parse(trimmedBody);
  } catch (error) {
    return {
      returnValue: 'fail',
      drwNo: round,
      reason: 'json-parse-error',
      statusCode,
      preview: previewText(trimmedBody),
    };
  }
};

const findLatestRound = async (fallbackLatestRound) => {
  const estimatedRound = estimateLatestRound();
  let round = estimatedRound + 2;

  while (round > Math.max(0, estimatedRound - 4)) {
    const data = await requestLottoRound(round);

    if (data.returnValue === 'success') {
      return Number(data.drwNo || round);
    }

    console.warn(
      `${round}회차 확인 실패: ${data.reason || data.returnValue || 'unknown'}${
        data.preview ? ` / ${data.preview}` : ''
      }`
    );

    round -= 1;
    await sleep(180);
  }

  const pageLatestRound = await findLatestRoundFromResultPage();
  if (pageLatestRound > 0) {
    return pageLatestRound;
  }

  if (fallbackLatestRound > 0) {
    console.warn(
      `최신 회차 자동 확인에 실패했습니다. 기존 데이터의 ${fallbackLatestRound}회차를 유지합니다.`
    );
    return fallbackLatestRound;
  }

  const seedLatestRound = Math.max(...SEED_DRAWS.map((draw) => Number(draw.drwNo)));
  console.warn(`최신 회차 자동 확인에 실패했습니다. 내장 기준 데이터의 ${seedLatestRound}회차를 사용합니다.`);
  return seedLatestRound;
};

const normalizeDraw = (data) => ({
  drwNo: Number(data.drwNo),
  drwNoDate: data.drwNoDate,
  totSellamnt: Number(data.totSellamnt || 0),
  firstWinamnt: Number(data.firstWinamnt || 0),
  firstPrzwnerCo: Number(data.firstPrzwnerCo || 0),
  drwtNo1: Number(data.drwtNo1),
  drwtNo2: Number(data.drwtNo2),
  drwtNo3: Number(data.drwtNo3),
  drwtNo4: Number(data.drwtNo4),
  drwtNo5: Number(data.drwtNo5),
  drwtNo6: Number(data.drwtNo6),
  bnusNo: Number(data.bnusNo),
});

const fetchMissingDraws = async ({ latestRound, existingDraws }) => {
  const drawMap = new Map(existingDraws.map((draw) => [Number(draw.drwNo), draw]));
  const existingRounds = [...drawMap.keys()];
  const maxExistingRound = existingRounds.length ? Math.max(...existingRounds) : 0;
  const hasOnlySeedData = existingRounds.length <= SEED_DRAWS.length;
  const startRound = hasOnlySeedData ? 1 : maxExistingRound + 1;

  if (!latestRound || startRound > latestRound) {
    return [...drawMap.values()];
  }

  let consecutiveFailCount = 0;

  for (let round = startRound; round <= latestRound; round += 1) {
    const data = await requestLottoRound(round);

    if (data.returnValue !== 'success') {
      consecutiveFailCount += 1;

      console.warn(
        `${round}회차 데이터 건너뜀: ${data.reason || data.returnValue || 'unknown'}${
          data.preview ? ` / ${data.preview}` : ''
        }`
      );

      // GitHub Actions 환경에서 동행복권 응답이 HTML/timeout으로 계속 막힐 수 있습니다.
      // 연속 실패가 많아지면 배포를 실패시키지 않고 기존 데이터로 마무리합니다.
      if (consecutiveFailCount >= 5) {
        console.warn('연속 실패가 5회 발생해 데이터 갱신을 중단하고 기존 데이터로 배포를 계속합니다.');
        break;
      }

      await sleep(250);
      continue;
    }

    consecutiveFailCount = 0;
    drawMap.set(Number(data.drwNo), normalizeDraw(data));

    if (round % 50 === 0 || round === latestRound) {
      console.log(`${round}/${latestRound}회차 수집 완료`);
    }

    await sleep(120);
  }

  return [...drawMap.values()];
};

const main = async () => {
  console.log('로또 데이터를 확인합니다.');

  const existingData = readExistingData();
  const fallbackLatestRound =
    Number(existingData.latestRound) ||
    (existingData.draws.length
      ? Math.max(...existingData.draws.map((draw) => Number(draw.drwNo)))
      : 0);

  console.log(`기존 데이터 최신 회차: ${fallbackLatestRound || '없음'}`);

  const latestRound = await findLatestRound(fallbackLatestRound);
  const draws = await fetchMissingDraws({
    latestRound,
    existingDraws: existingData.draws,
  });

  if (!draws.length) {
    console.warn('수집된 로또 데이터가 없습니다. 빈 데이터 파일로 앱 빌드를 계속합니다.');
  }

  writeData({
    latestRound,
    draws,
    updatedAt: draws.length ? new Date().toISOString() : existingData.updatedAt,
  });
};

main().catch((error) => {
  console.warn('로또 데이터 갱신 중 예외가 발생했습니다. 배포를 중단하지 않습니다.');
  console.warn(error);
  const existingData = readExistingData();
  writeData(existingData);
  process.exit(0);
});
