import React from 'react';

function AmountCommas(val) {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const BollList = ({ lottyData }) => {
  return (
    <ul>
      <li>회차정보: {lottyData.drwNo}</li>
      <li>당첨날짜: {lottyData.drwNoDate}</li>
      <li>전체 판매금: {AmountCommas(lottyData.totSellamnt)}</li>
      <li>1등 당첨자 수: {lottyData.firstPrzwnerCo}명</li>
      <li>1등 당첨금: {AmountCommas(lottyData.firstWinamnt)}</li>
      <li>
        당첨번호: {lottyData.drwtNo1}, {lottyData.drwtNo2}, {lottyData.drwtNo3},{' '}
        {lottyData.drwtNo4}, {lottyData.drwtNo5}, {lottyData.drwtNo6} + 보너스
        볼 :{lottyData.bnusNo}
      </li>
    </ul>
  );
};

export default BollList;
