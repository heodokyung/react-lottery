import React, { useState } from 'react';
import axios from 'axios';
import BollList from './components/BollList';
import { Button } from 'antd';
import 'antd/dist/antd.css';
import './index.css';

const App = () => {
  const [lottyData, setLottyData] = useState(null);
  const [query, setQuery] = useState(957);
  const [lastNum, setLastNum] = useState(957);

  const onLotteryClick = () => {
    axios
      .get(
        `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${query}`,
      )
      .then((response) => {
        setLottyData(response.data);
      });
  };

  const onLotterySeacrh = (e) => {
    const searchNum = e.target.value;
    if (searchNum > lastNum) {
      return alert(
        `마지막 회차정보보다 입력값이 큽니다.\n마지막 회차는 ${lastNum}회 입니다.`,
      );
    }
    setQuery(searchNum);
  };

  return (
    <div>
      <div>
        <div>
          <p>마지막 회차 : {lastNum}회</p>
          <input
            type="number"
            className="serarch-bar"
            placeholder="회차를 입력하세요"
            onChange={onLotterySeacrh}
          />
          <Button onClick={onLotteryClick}>검색</Button>
        </div>

        {lottyData && <BollList lottyData={lottyData} />}
      </div>
    </div>
  );
};

export default App;
