import React from 'react';

const hasPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const formatCurrency = (value) => {
  if (!hasPositiveNumber(value)) return '-';
  return `${Number(value).toLocaleString('ko-KR')}원`;
};

const formatCount = (value) => {
  if (!hasPositiveNumber(value)) return '-';
  return `${Number(value).toLocaleString('ko-KR')}명`;
};

const getBallClassName = (number) => {
  if (number <= 10) return 'yellow';
  if (number <= 20) return 'blue';
  if (number <= 30) return 'red';
  if (number <= 40) return 'gray';
  return 'green';
};

const getWinningNumbers = (lottyData) => [
  lottyData.drwtNo1,
  lottyData.drwtNo2,
  lottyData.drwtNo3,
  lottyData.drwtNo4,
  lottyData.drwtNo5,
  lottyData.drwtNo6,
];

const BollList = ({ lottyData }) => {
  const winningNumbers = getWinningNumbers(lottyData);

  return (
    <section className="result-card" aria-label={`${lottyData.drwNo}회차 당첨 정보`}>
      <div className="result-header">
        <div>
          <p>조회 결과</p>
          <h3>{lottyData.drwNo}회차</h3>
        </div>
        <span>{lottyData.drwNoDate}</span>
      </div>

      <div className="winning-numbers">
        {winningNumbers.map((number) => (
          <span className={`lotto-ball ${getBallClassName(number)}`} key={number}>
            {number}
          </span>
        ))}

        <span className="bonus-divider">+</span>

        <span className={`lotto-ball bonus ${getBallClassName(lottyData.bnusNo)}`}>
          {lottyData.bnusNo}
        </span>
      </div>

      <dl className="result-info">
        <div>
          <dt>전체 판매금</dt>
          <dd>{formatCurrency(lottyData.totSellamnt)}</dd>
        </div>
        <div>
          <dt>1등 당첨자</dt>
          <dd>{formatCount(lottyData.firstPrzwnerCo)}</dd>
        </div>
        <div>
          <dt>1등 당첨금</dt>
          <dd>{formatCurrency(lottyData.firstWinamnt)}</dd>
        </div>
      </dl>
    </section>
  );
};

export default BollList;
