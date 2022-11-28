# React를 적용하여 Lotte 당첨 번호를 알아보는 Toy 프로젝트입니다.

## 설명
React의 기초와 React에서 State, Props 적용 등 기초지식을 학습하기 위해 진행했던 프로젝트로 가볍게 할 수 있는 프로젝트가 무엇일까 고민하다 우리 주변에서 가장 쉽게 접할 수 있는 로또(Lotte)번호 당첨 조회를 개발해보기로 정했습니다. 

## 조건
- Api 통신으로 데이터 값 가져오기(통신에 대한 방법은 자유)  
- Component 분리하기  
- Props, State 값 적용하기  
- Scss를 적용하여 스타일링 클래스 모듈화(module)하기  

### 동행복권 Api
- 당첨번호 조회 : https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=회차정보

### 느끼점
- React의 기본 구조(데이터의 흐름)를 알아보는 좋은 계기가 되었습니다. 
- 양방향의 데이터 흐름이 아닌 단반향의 데이터 흐름이기에 장,단점이 존재합니다.

### 문제점
- 동행복권 Api는 공식적인 OpenApi가 아니기 때문에 해당 정보를 localhost에서 데이터를 조회하면 CORS ERROR가 발생합니다.  


### 해결방법
위의 문제를 해결하기 위해 크롬브라우저에 속성값을 추가하는 방법으로 데이터를 조회했습니다.  
Chrome의 바로가기에서 마우스 오른쪽 단추를 누르고, 대상 경로에 명령어를 추가해주면 됩니다.  

속성값 추가 : --disable-web-security --disable-gpu --user-data-dir=~/tmp

위 방법외에도 다양한 CORS 해결방법이 있으니 다른 방법을 적용해보는것도 좋은 공부가 될 것 같습니다.  
감사합니다.
