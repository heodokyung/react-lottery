# React Lottery

최신 로또 회차를 조회하고, 자동으로 로또 번호 6개를 생성하는 React 학습 프로젝트입니다.
처음에는 특정 회차를 직접 입력해 당첨번호를 조회하는 간단한 예제였고, 이번 정리에서는 아래 기능을 추가했습니다.

- 저장된 로또 당첨 정보 기준 회차 조회
- 회차 입력 후 당첨번호, 보너스 번호, 1등 당첨 정보 확인
- 데이터 파일이 비어 있을 때 최신 기준 내장 데이터로 임시 표시
- 중복 없는 로또 번호 6개 자동 생성
- GitHub Pages 배포용 자동 데이터 수집 스크립트
- GitHub Actions 기반 자동 빌드/배포

---

## 바로 보기
[`react-lottery`](https://heodokyung.github.io/react-lottery/)

---

## 주요 기능

### 회차별 당첨번호 조회

`public/data/lotto-history.json`에 저장된 데이터를 기준으로 회차별 당첨번호를 조회합니다.

브라우저에서 동행복권 API를 직접 호출하면 CORS 문제가 생길 수 있기 때문에, 배포 과정에서 미리 데이터를 수집하고 정적 JSON 파일로 저장하는 구조입니다. 데이터 파일이 비어 있거나 로드에 실패하면 화면이 완전히 죽지 않도록 최신 기준 내장 데이터를 임시로 표시합니다.

### 최신 회차 자동 반영

`scripts/fetch-lotto-data.js`가 현재 날짜를 기준으로 최신 회차를 추정한 뒤, 실제 응답이 있는 마지막 회차를 찾아 데이터를 생성합니다. API 응답이 일시적으로 막히더라도 기존 데이터 또는 내장 기준 데이터를 유지해 빈 JSON으로 배포되지 않게 처리했습니다.

```bash
yarn update:lotto
```

생성 위치:

```txt
public/data/lotto-history.json
```

### 자동 번호 생성

1부터 45까지의 숫자 중 중복 없이 6개를 뽑아 오름차순으로 보여줍니다.

이 기능은 학습과 재미를 위한 기능이며, 당첨을 보장하지 않습니다.

---

## 실행 방법

의존성을 설치합니다.

```bash
yarn install
```

로또 데이터를 생성합니다.

```bash
yarn update:lotto
```

개발 서버를 실행합니다.

```bash
yarn start
```

---

## 빌드

```bash
yarn build
```

GitHub Pages 하위 경로 배포를 위해 `package.json`에 아래 값을 사용합니다.

```json
"homepage": "/react-lottery/"
```

---

## GitHub Pages 배포

이 저장소는 GitHub Actions로 배포합니다.

```txt
Settings
→ Pages
→ Build and deployment
→ Source: GitHub Actions
```

워크플로우 파일:

```txt
.github/workflows/deploy-pages.yml
```

배포 과정은 아래 순서로 진행됩니다.

```txt
yarn install
→ yarn update:lotto
→ yarn build
→ build 폴더를 GitHub Pages로 배포
```

워크플로우는 수동 실행도 가능하고, 매주 일요일 새벽에 자동 실행되도록 설정했습니다.

---

## 프로젝트 구조

```txt
react-lottery/
├─ public/
│  ├─ data/
│  │  └─ lotto-history.json
│  └─ index.html
├─ scripts/
│  └─ fetch-lotto-data.js
├─ src/
│  ├─ components/
│  │  └─ BollList.js
│  ├─ App.js
│  ├─ App.css
│  └─ index.css
├─ .github/
│  └─ workflows/
│     └─ deploy-pages.yml
└─ package.json
```

---

## 참고

로또 당첨번호 데이터는 동행복권의 회차별 JSON 응답을 기준으로 생성합니다.

```txt
https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=회차번호
```

이 엔드포인트는 브라우저에서 직접 호출할 때 CORS 문제가 발생할 수 있어, 정적 배포에서는 GitHub Actions에서 데이터를 미리 생성하는 방식이 더 안정적입니다.
