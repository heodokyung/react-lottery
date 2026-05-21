import React from 'react';

const formatAmount = (value) => {
  if (value === undefined || value === null) return '-';
  return Number(value).toLocaleString('ko-KR');
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
          <dd>{formatAmount(lottyData.totSellamnt)}원</dd>
        </div>
        <div>
          <dt>1등 당첨자</dt>
          <dd>{formatAmount(lottyData.firstPrzwnerCo)}명</dd>
        </div>
        <div>
          <dt>1등 당첨금</dt>
          <dd>{formatAmount(lottyData.firstWinamnt)}원</dd>
        </div>
      </dl>
    </section>
  );
};

export default BollList;
