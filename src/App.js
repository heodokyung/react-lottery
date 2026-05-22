import React, { useEffect, useMemo, useState } from 'react';
import BollList from './components/BollList';
import './App.css';

const DATA_URL = `${process.env.PUBLIC_URL || ''}/data/lotto-history.json`;

const FALLBACK_DRAW = {
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
};

const FALLBACK_DATA = {
  latestRound: FALLBACK_DRAW.drwNo,
  updatedAt: '2026-05-16T20:52:00+09:00',
  source: 'embedded-fallback',
  draws: [FALLBACK_DRAW],
};

const sortDraws = (draws) =>
  [...draws]
    .filter((draw) => Number(draw.drwNo) > 0)
    .sort((a, b) => Number(a.drwNo) - Number(b.drwNo));

const normalizeLottoData = (data) => {
  const fileDraws = Array.isArray(data?.draws) ? sortDraws(data.draws) : [];
  const fallbackDraws = sortDraws(FALLBACK_DATA.draws);
  const draws = fileDraws.length ? fileDraws : fallbackDraws;
  const lastDraw = draws[draws.length - 1];
  const latestRound = Number(data?.latestRound) || Number(lastDraw?.drwNo) || FALLBACK_DATA.latestRound;

  return {
    draws,
    latestRound,
    updatedAt: data?.updatedAt || FALLBACK_DATA.updatedAt,
    usedFallback: !fileDraws.length,
  };
};

const createRandomNumbers = () => {
  const numbers = Array.from({ length: 45 }, (_, index) => index + 1);

  const getRandomIndex = (max) => {
    if (window.crypto?.getRandomValues) {
      const randomArray = new Uint32Array(1);
      window.crypto.getRandomValues(randomArray);
      return randomArray[0] % max;
    }

    return Math.floor(Math.random() * max);
  };

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const randomIndex = getRandomIndex(index + 1);
    [numbers[index], numbers[randomIndex]] = [numbers[randomIndex], numbers[index]];
  }

  return numbers.slice(0, 6).sort((a, b) => a - b);
};

const formatUpdatedAt = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('ko-KR');
};

const App = () => {
  const [lottoHistory, setLottoHistory] = useState([]);
  const [latestRound, setLatestRound] = useState(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRound, setSelectedRound] = useState(null);
  const [generatedNumbers, setGeneratedNumbers] = useState(createRandomNumbers);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [usedFallback, setUsedFallback] = useState(false);

  const selectedDraw = useMemo(() => {
    if (!selectedRound) return null;
    return lottoHistory.find((draw) => Number(draw.drwNo) === Number(selectedRound));
  }, [lottoHistory, selectedRound]);

  const latestDraw = useMemo(() => {
    if (!latestRound) return null;
    return lottoHistory.find((draw) => Number(draw.drwNo) === Number(latestRound));
  }, [lottoHistory, latestRound]);

  const availableRoundText = useMemo(() => {
    if (!lottoHistory.length) return '데이터 확인 중';

    const rounds = lottoHistory.map((draw) => Number(draw.drwNo));
    const minRound = Math.min(...rounds);
    const maxRound = Math.max(...rounds);

    if (minRound === maxRound) return `${maxRound}회차 조회 가능`;
    return `${minRound}~${maxRound}회차 조회 가능`;
  }, [lottoHistory]);

  useEffect(() => {
    const loadLottoData = async () => {
      try {
        setLoading(true);

        const response = await fetch(DATA_URL, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('로또 데이터 파일을 불러오지 못했습니다.');
        }

        const data = await response.json();
        const normalizedData = normalizeLottoData(data);
        const nextLatestRound = normalizedData.latestRound;

        setLottoHistory(normalizedData.draws);
        setLatestRound(nextLatestRound);
        setSelectedRound(nextLatestRound);
        setQuery(String(nextLatestRound));
        setUpdatedAt(normalizedData.updatedAt);
        setUsedFallback(normalizedData.usedFallback);
        setMessage(
          normalizedData.usedFallback
            ? '배포 데이터가 비어 있어 내장된 최신 기준 데이터를 임시로 표시합니다. GitHub Actions에서 데이터 갱신을 다시 실행해 주세요.'
            : ''
        );
      } catch (error) {
        const normalizedData = normalizeLottoData(null);
        const nextLatestRound = normalizedData.latestRound;

        setLottoHistory(normalizedData.draws);
        setLatestRound(nextLatestRound);
        setSelectedRound(nextLatestRound);
        setQuery(String(nextLatestRound));
        setUpdatedAt(normalizedData.updatedAt);
        setUsedFallback(true);
        setMessage(
          `${error.message || '로또 데이터를 불러오는 중 문제가 발생했습니다.'} 내장된 기준 데이터로 임시 표시합니다.`
        );
      } finally {
        setLoading(false);
      }
    };

    loadLottoData();
  }, []);

  const handleSearch = () => {
    const round = Number(query);

    if (!Number.isInteger(round) || round < 1) {
      setMessage('조회할 회차를 숫자로 입력해 주세요.');
      return;
    }

    if (latestRound && round > latestRound) {
      setMessage(`아직 ${round}회차 데이터가 없습니다. 현재 조회 가능한 최신 회차는 ${latestRound}회입니다.`);
      return;
    }

    const draw = lottoHistory.find((item) => Number(item.drwNo) === round);

    if (!draw) {
      const availableRounds = lottoHistory.map((item) => Number(item.drwNo)).sort((a, b) => a - b);
      const range = availableRounds.length
        ? `${availableRounds[0]}~${availableRounds[availableRounds.length - 1]}회차`
        : '없음';

      setMessage(`${round}회차 데이터가 현재 JSON에 없습니다. 현재 저장된 조회 범위: ${range}`);
      return;
    }

    setSelectedRound(round);
    setMessage(usedFallback ? '내장된 기준 데이터로 조회했습니다. 배포 데이터 갱신 후 더 많은 회차를 조회할 수 있습니다.' : '');
  };

  const handleLatestClick = () => {
    if (!latestRound) return;

    setQuery(String(latestRound));
    setSelectedRound(latestRound);
    setMessage(usedFallback ? '내장된 기준 데이터로 조회했습니다. 배포 데이터 갱신 후 더 많은 회차를 조회할 수 있습니다.' : '');
  };

  const handleRandomClick = () => {
    setGeneratedNumbers(createRandomNumbers());
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <main className="lotto-app">
      <section className="hero-card">
        <p className="eyebrow">LOTTO 6/45</p>
        <h1>로또 당첨번호 조회</h1>
        <p className="hero-description">
          회차를 입력해 당첨번호를 확인하고, 중복 없는 번호 6개를 간단히 생성합니다.
        </p>

        <div className="hero-meta" aria-label="데이터 정보">
          <span>{availableRoundText}</span>
          {updatedAt && <span>업데이트: {formatUpdatedAt(updatedAt)}</span>}
          {usedFallback && <span>임시 데이터 사용 중</span>}
        </div>
      </section>

      <section className="content-grid">
        <article className="panel search-panel">
          <div className="section-heading">
            <p>당첨번호</p>
            <h2>회차별 조회</h2>
          </div>

          <div className="search-box">
            <label htmlFor="round-input">조회 회차</label>
            <div className="search-row">
              <input
                id="round-input"
                type="number"
                min="1"
                max={latestRound || undefined}
                value={query}
                placeholder="예: 1224"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button type="button" onClick={handleSearch}>
                조회
              </button>
            </div>
          </div>

          <button className="sub-button" type="button" onClick={handleLatestClick} disabled={!latestRound}>
            최신 회차 보기
          </button>

          {loading && <div className="notice">로또 데이터를 불러오는 중입니다.</div>}
          {message && <div className="notice warning">{message}</div>}

          {!loading && selectedDraw && <BollList lottyData={selectedDraw} />}
        </article>

        <article className="panel generator-panel">
          <div className="section-heading">
            <p>번호 생성</p>
            <h2>자동 번호 6개</h2>
          </div>

          <p className="guide-text">
            1부터 45까지의 숫자 중 중복 없이 6개를 뽑습니다. 재미용 기능이며 당첨을 보장하지 않습니다.
          </p>

          <div className="generated-card" aria-label="자동 생성 번호">
            {generatedNumbers.map((number) => (
              <span className={`lotto-ball ${number <= 10 ? 'yellow' : number <= 20 ? 'blue' : number <= 30 ? 'red' : number <= 40 ? 'gray' : 'green'}`} key={number}>
                {number}
              </span>
            ))}
          </div>

          <button className="primary-button" type="button" onClick={handleRandomClick}>
            번호 다시 만들기
          </button>

          {latestDraw && (
            <div className="latest-summary">
              <strong>최근 당첨번호</strong>
              <span>
                {latestDraw.drwNo}회차 · {latestDraw.drwNoDate}
              </span>
            </div>
          )}
        </article>
      </section>
    </main>
  );
};

export default App;
