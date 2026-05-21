const fs = require('fs');
const https = require('https');
const path = require('path');

const FIRST_DRAW_DATE_KST = '2002-12-07T20:45:00+09:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const OUTPUT_PATH = path.resolve(__dirname, '../public/data/lotto-history.json');

const requestLottoRound = (round) =>
  new Promise((resolve, reject) => {
    const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`;

    const request = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; react-lottery-study/1.0)',
          Accept: 'application/json,text/plain,*/*',
        },
        timeout: 10000,
      },
      (response) => {
        let body = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });

        response.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (error) {
            reject(new Error(`${round}회차 응답을 JSON으로 해석하지 못했습니다.`));
          }
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error(`${round}회차 요청 시간이 초과되었습니다.`));
    });

    request.on('error', reject);
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const estimateLatestRound = () => {
  const firstDrawTime = new Date(FIRST_DRAW_DATE_KST).getTime();
  const now = Date.now();

  return Math.max(1, Math.floor((now - firstDrawTime) / WEEK_MS) + 1);
};

const findLatestRound = async () => {
  let round = estimateLatestRound() + 2;

  while (round > 0) {
    const data = await requestLottoRound(round);

    if (data.returnValue === 'success') {
      return Number(data.drwNo || round);
    }

    round -= 1;
    await sleep(120);
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
      console.warn(`${round}회차 데이터가 없어 건너뜁니다.`);
      continue;
    }

    draws.push(normalizeDraw(data));

    if (round % 50 === 0 || round === latestRound) {
      console.log(`${round}/${latestRound}회차 수집 완료`);
    }

    await sleep(60);
  }

  return draws;
};

const main = async () => {
  console.log('최신 로또 회차를 확인합니다.');

  const latestRound = await findLatestRound();
  console.log(`최신 회차: ${latestRound}`);

  const draws = await fetchAllDraws(latestRound);

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
