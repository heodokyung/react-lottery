import React, { useEffect, useMemo, useState } from 'react';
import BollList from './components/BollList';
import './App.css';

const DATA_URL = `${process.env.PUBLIC_URL || ''}/data/lotto-history.json`;

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

const App = () => {
  const [lottoHistory, setLottoHistory] = useState([]);
  const [latestRound, setLatestRound] = useState(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRound, setSelectedRound] = useState(null);
  const [generatedNumbers, setGeneratedNumbers] = useState(createRandomNumbers);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const selectedDraw = useMemo(() => {
    if (!selectedRound) return null;
    return lottoHistory.find((draw) => Number(draw.drwNo) === Number(selectedRound));
  }, [lottoHistory, selectedRound]);

  const latestDraw = useMemo(() => {
    if (!latestRound) return null;
    return lottoHistory.find((draw) => Number(draw.drwNo) === Number(latestRound));
  }, [lottoHistory, latestRound]);

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
        const draws = Array.isArray(data.draws) ? data.draws : [];

        if (!draws.length) {
          throw new Error('로또 데이터가 아직 생성되지 않았습니다.');
        }

        const nextLatestRound =
          Number(data.latestRound) || Math.max(...draws.map((draw) => Number(draw.drwNo)));

        setLottoHistory(draws);
        setLatestRound(nextLatestRound);
        setSelectedRound(nextLatestRound);
        setQuery(String(nextLatestRound));
        setUpdatedAt(data.updatedAt || '');
        setMessage('');
      } catch (error) {
        setMessage(error.message || '로또 데이터를 불러오는 중 문제가 발생했습니다.');
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
      setMessage(`${round}회차 데이터를 찾지 못했습니다.`);
      return;
    }

    setSelectedRound(round);
    setMessage('');
  };

  const handleLatestClick = () => {
    if (!latestRound) return;

    setQuery(String(latestRound));
    setSelectedRound(latestRound);
    setMessage('');
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
        <p className="eyebrow">React Lottery</p>
        <h1>로또 6/45 조회 & 자동 번호 생성기</h1>
        <p className="hero-description">
          최신 회차까지 저장된 당첨 정보를 조회하고, 버튼 한 번으로 로또 번호 6개를 자동 생성합니다.
        </p>

        <div className="hero-meta">
          <span>{latestRound ? `최신 ${latestRound}회차까지 조회 가능` : '데이터 확인 중'}</span>
          {updatedAt && <span>업데이트: {new Date(updatedAt).toLocaleString('ko-KR')}</span>}
        </div>
      </section>

      <section className="content-grid">
        <article className="panel search-panel">
          <div className="section-heading">
            <p>Winning Numbers</p>
            <h2>회차별 당첨번호 조회</h2>
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
                placeholder="예: 1100"
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
            <p>Random Pick</p>
            <h2>자동 번호 6개 생성</h2>
          </div>

          <p className="guide-text">
            1부터 45까지의 숫자 중 중복 없이 6개를 뽑습니다. 재미와 연습용 기능이며 당첨을 보장하지 않습니다.
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
