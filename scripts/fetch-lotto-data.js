const fs = require('fs');
const https = require('https');
const path = require('path');

const FIRST_DRAW_DATE_KST = '2002-12-07T20:45:00+09:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const OUTPUT_PATH = path.resolve(__dirname, '../public/data/lotto-history.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const previewText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

const estimateLatestRound = () => {
  const firstDrawTime = new Date(FIRST_DRAW_DATE_KST).getTime();
  const now = Date.now();

  return Math.max(1, Math.floor((now - firstDrawTime) / WEEK_MS) + 1);
};

const requestText = (url, retryCount = 2) =>
  new Promise((resolve, reject) => {
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
        timeout: 12000,
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
            statusCode,
            body,
          });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('요청 시간이 초과되었습니다.'));
    });

    request.on('error', async (error) => {
      if (retryCount > 0) {
        await sleep(500);
        resolve(requestText(url, retryCount - 1));
        return;
      }

      reject(error);
    });
  });

const requestLottoRound = async (round) => {
  const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`;
  const { statusCode, body } = await requestText(url);
  const trimmedBody = String(body || '').trim();

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

const findLatestRound = async () => {
  // 날짜 계산은 추정치이므로 아직 공개되지 않은 회차를 포함할 수 있습니다.
  // 그래서 예상 회차보다 조금 앞에서 시작한 뒤, 실제 success 응답이 나올 때까지 내려옵니다.
  let round = estimateLatestRound() + 2;

  while (round > 0) {
    const data = await requestLottoRound(round);

    if (data.returnValue === 'success') {
      return Number(data.drwNo || round);
    }

    if (round >= estimateLatestRound() - 6) {
      console.warn(
        `${round}회차 확인 실패: ${data.reason || data.returnValue || 'unknown'}${
          data.preview ? ` / ${data.preview}` : ''
        }`
      );
    }

    round -= 1;
    await sleep(150);
  }

  throw new Error('최신 로또 회차를 찾지 못했습니다.');
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

const fetchAllDraws = async (latestRound) => {
  const draws = [];

  for (let round = 1; round <= latestRound; round += 1) {
    const data = await requestLottoRound(round);

    if (data.returnValue !== 'success') {
      console.warn(
        `${round}회차 데이터 건너뜀: ${data.reason || data.returnValue || 'unknown'}${
          data.preview ? ` / ${data.preview}` : ''
        }`
      );
      continue;
    }

    draws.push(normalizeDraw(data));

    if (round % 50 === 0 || round === latestRound) {
      console.log(`${round}/${latestRound}회차 수집 완료`);
    }

    await sleep(80);
  }

  return draws;
};

const main = async () => {
  console.log('최신 로또 회차를 확인합니다.');

  const latestRound = await findLatestRound();
  console.log(`최신 회차: ${latestRound}`);

  const draws = await fetchAllDraws(latestRound);

  if (!draws.length) {
    throw new Error('수집된 로또 데이터가 없습니다.');
  }

  const payload = {
    latestRound,
    updatedAt: new Date().toISOString(),
    source: 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={round}',
    draws,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`로또 데이터 저장 완료: ${OUTPUT_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
