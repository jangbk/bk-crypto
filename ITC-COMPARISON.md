# ITC vs BK Investment 종합 비교 분석

## 1. 네비게이션 구조 비교

### ITC 메뉴 구조
| 메뉴 | 하위 항목 | URL |
|------|----------|-----|
| Dashboard | - | /dashboard |
| Charts | - | /charts |
| **Crypto** | Screener | /crypto |
| | Indicators Risk Dashboard | /tools/indicator-dashboard |
| | Charts | /charts?universe=crypto |
| | Heatmap | /charts/heatmap |
| **Macro** | Calendar and Indicators | /macro/indicators |
| | Recession Risk Dashboard | /tools/macro-recession-risk-dashboard |
| | Liquidity Risk Dashboard | /tools/macro-liquidity-risk-dashboard |
| | Charts | /charts?universe=macro |
| **TradFi** | Charts | /charts?universe=tradfi |
| | Indexes | /tradfi/indexes |
| | Stocks | /tradfi/stocks |
| | Metals | /tradfi/metals |
| | Crypto Treasuries | /crypto-treasuries |
| **Tools** | DCA Strategies | /tools/dca/bitcoin |
| | Exit Strategies | /tools/exit-strategies |
| | Modern Portfolio Theory | /tools/mpt-simulation |
| | Portfolios Weighted by Market Cap | /charts/portfolios-weighted-by-market-cap |
| | Portfolio Weighted Risk | /tools/weighted-risk |
| | Workbench | /workbench |
| | Metric Analyzer | /tools/metric-analyzer |
| **Content** | Studies | /studies |
| | Premium Videos | /videos |
| | Premium Reports | /reports |
| | Release Notes | /release-notes |

### BK Investment 메뉴 구조 (현재)
동일한 구조를 이미 가지고 있으나, 일부 차이점 존재

## 2. 페이지별 상세 비교

### 2.1 Dashboard
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| Favorite Assets 테이블 | ✅ 18개 자산 (crypto + tradfi) | ✅ 30개 crypto만 | BK에 TradFi 자산 추가 필요 |
| Asset → Risk 링크 | ✅ /assets/{id}/risk | ❌ 없음 | **새로 구현 필요** |
| Fiat Risk 컬럼 | ✅ 색상 코딩 + 프로그레스바 | ✅ 이미 구현 | 동일 |
| Crypto Risk Gauge | ✅ Summary/Price/On-Chain | ✅ 있음 | 유사 |
| Macro Recession Risk Gauge | ✅ Employment/National Income/Production | ✅ 있음 | 유사 |
| Market Cap 차트 (Total/BTC/ETH 탭) | ✅ | ✅ | 유사 |
| Dominance 차트 (BTC.D/ETH.D 탭) | ✅ | ✅ | 유사 |
| Risk 차트 (29개 자산 탭) | ✅ TOTAL~RENDER 29탭 | ✅ 있으나 탭 수 적을 수 있음 | 탭 수 확인 필요 |
| Macro 차트 (Unemployment/Inflation/RGDP/Fed Funds) | ✅ 4탭 | ✅ 유사 | 유사 |
| Latest Premium Video (YouTube 임베드) | ✅ 실제 YouTube player | ✅ 썸네일만? | YouTube embed 확인 |
| Macro Calendar | ✅ 링크가 관련 차트로 연결 | ✅ 있음 | 유사 |
| Quick Links | ✅ Telegram/NFT/Merch/Email | ❌ 없음 | 선택적 |
| 우측 사이드바 레이아웃 | ✅ 2컬럼 (메인 + 사이드바) | ✅ 유사 | 유사 |

### 2.2 Crypto Screener (/crypto)
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| 상단 시장 요약 카드 | ✅ TOTAL, TOTAL6, OTHERS, TOTAL2, TOTALDEFI | ✅ 유사 | 카드 구성 확인 |
| All Coins / Watchlist 탭 | ✅ | ❓ | 확인 필요 |
| Ecosystems 필터 | ✅ | ❌ | **새로 구현** |
| 테이블 컬럼 | #, Name, In Watchlist, Price, 24h, 7d, 30d, MCap, Fiat Risk, BTC Risk, ETH Risk, Conf., Category, Volume, Supply | ✅ 일부 | **BTC Risk, ETH Risk, Conf., Category 컬럼 추가** |
| 100+ 자산 | ✅ | ✅ | 유사 |

### 2.3 Charts 페이지 (/charts)
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| 좌측 사이드바 | ✅ Crypto/Macro/TradFi 탭, 검색, 카테고리 트리 | ✅ 유사 | 유사 |
| 차트 프리뷰 이미지 | ✅ **실제 차트 스크린샷 이미지** | ❌ SVG 랜덤 라인 | **가장 큰 차이 - 실제 이미지 필요** |
| 즐겨찾기 (★) | ✅ | ✅ | 유사 |
| Quick Filter 드롭다운 | ✅ | ❌ | 추가 고려 |
| Crypto Asset Filter | ✅ | ❌ | 추가 고려 |
| 3열 그리드 | ✅ | ✅ | 유사 |
| FAVORITED CHARTS 섹션 | ✅ 접이식 | ❌ | **추가 필요** |

### 2.4 Chart Detail 페이지
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| 인터랙티브 차트 | ✅ SVG/Canvas 차트 | ✅ TradingView | BK가 더 나을 수 있음 |
| 차트 컨트롤 (Log Lines Extension, Risk Overlay, Moving Average, Price Scale) | ✅ | ❌ | **추가 필요** |
| Watch Video 링크 | ✅ | ❌ | 선택적 |
| Description & Usage 텍스트 | ✅ | ❌ | **추가 고려** |
| 좌측 사이드바 네비게이션 | ✅ | ✅ | 유사 |

### 2.5 Asset Risk 페이지 (/assets/{id}/risk)
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| 페이지 자체 | ✅ | ❌ **완전히 없음** | **핵심 새 기능 - 구현 필수** |
| 좌측 자산 목록 사이드바 | ✅ 22+ 자산 | - | |
| Risk/Supply/Metrics/Fundamentals 탭 | ✅ 4탭 | - | |
| Key Risks 테이블 (리스크→가격) | ✅ | - | |
| Fiat Risks 테이블 (가격→리스크) | ✅ | - | |
| Historical Risk Metric 차트 | ✅ | - | |
| Color Coded Risk Metric 차트 | ✅ | - | |
| Time In Risk Bands 히스토그램 | ✅ | - | |
| Current Risk Levels 차트 | ✅ | - | |

### 2.6 Indicator Dashboard (/tools/indicator-dashboard)
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| Summary 게이지 | ✅ 0.106 | ✅ 유사 | 유사 |
| Price Metrics 게이지 | ✅ | ❓ | 확인 |
| On-Chain Metrics 게이지 | ✅ | ❓ | 확인 |
| **Social Metrics 게이지** | ✅ YouTube Subscribers/Views, Twitter Followers | ❌ | **새로 추가** |
| Price Metrics 상세 테이블 | ✅ Total Market Cap Risk, Bitcoin Risk 등 7항목 | ❓ | 확인 |
| On-Chain Metrics 상세 테이블 | ✅ Puell Multiple, MVRV 등 10+항목 | ❓ | 확인 |
| Weightless Indicators 섹션 | ✅ | ❌ | 추가 |

### 2.7 Macro Liquidity Risk Dashboard (ITC에만 있음)
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| Liquidity Risk Score 게이지 | ✅ 0.799 | ❌ **없음** | **새로 구현 필요** |
| Contributions 테이블 | ✅ 2Y Yield, Policy Rate, Dollar Index, Money Supply, Balance Sheet | ❌ | |

### 2.8 TradFi 페이지들
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| Indexes 테이블 | ✅ DXY, S&P500, Nasdaq, Dow Jones | ❓ | 확인 |
| Stocks 테이블 | ✅ | ❓ | 확인 |
| Metals 테이블 | ✅ | ❓ | 확인 |
| Crypto Treasuries | ✅ Holdings/Flows/Distribution 차트, ETF/Company/Gov 테이블 | ✅ 기본 구현 | **대폭 개선 필요** |

### 2.9 Tools
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| DCA (3탭: Equal/Lump Sum/Dynamic) | ✅ | ✅ | ITC에 Dynamic DCA In 탭 추가됨 |
| Exit Strategies | ✅ Risk Band별 매도 전략 | ✅ | 유사 |
| MPT | ✅ | ✅ | 유사 |
| Portfolios Weighted by Market Cap | ✅ | ❌ | 차트 안에 포함 |
| Portfolio Weighted Risk | ✅ | ✅ | 유사 |
| Workbench (수식 빌더) | ✅ 매우 강력 | ✅ 기본 | **수식 기능 강화** |
| Metric Analyzer | ✅ | ✅ | 유사 |

### 2.10 Content
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| Studies | ✅ Get Started/Random Study 버튼, 4개 스터디 카드 | ✅ 유사 | 유사 |
| Premium Videos | ✅ YouTube 임베드 + 우측 목록 | ✅ | 유사 |
| **Premium Reports** | ✅ PDF 뷰어 + 우측 목록 | ❌ Newsletter로 대체 | **Reports 페이지 추가** |
| Release Notes | ✅ | ✅ | 유사 |

### 2.11 Macro Calendar (/macro/indicators)
| 기능 | ITC | BK Investment | 차이 |
|------|-----|--------------|------|
| 날짜별 이벤트 리스트 | ✅ 매우 상세 (Act/Prev/Forecast/Δ) | ❓ | 확인 필요 |
| 이벤트 → 차트 링크 | ✅ | ❌ | 추가 |
| 중요도 표시 (아이콘 색상) | ✅ | ❌ | 추가 |

## 3. 디자인 차이점

| 항목 | ITC | BK Investment | 개선 방향 |
|------|-----|--------------|----------|
| 배경 색상 | #000000 (순수 검정) | ✅ 이미 적용 | 유지 |
| 카드 색상 | #0d1117 (다크 카드) | ✅ 이미 적용 | 유지 |
| 차트 프리뷰 | **실제 차트 스크린샷** | SVG 랜덤 라인 | **핵심 개선점** |
| 테이블 디자인 | 깔끔한 행 구분, 호버 효과 | 유사 | 유사 |
| 게이지 차트 | SVG 반원 (빨/노/초 그라데이션) | ✅ 유사 | 유사 |
| Fiat Risk 색상 코딩 | 초록→노랑→주황→빨강 | ✅ 이미 구현 | 유지 |

## 4. 우선순위별 구현 계획

### P0 (핵심 - 반드시 구현)
1. **Asset Risk 페이지** (/assets/{id}/risk) - ITC의 가장 독특한 기능
2. **Macro Liquidity Risk Dashboard** - ITC에만 있는 대시보드
3. **Crypto Screener 강화** - BTC Risk, ETH Risk, Conf., Category, 30d 컬럼 추가
4. **Chart 프리뷰 이미지** - SVG 랜덤라인 → 실제 차트 프리뷰 이미지

### P1 (중요)
5. **Indicator Dashboard** - Social Metrics 게이지 + 상세 테이블 추가
6. **Premium Reports 페이지** 추가
7. **Crypto Treasuries 강화** - Holdings/Flows/Distribution 차트
8. **Chart Detail 컨트롤** - Risk Overlay, Moving Average, Log Lines Extension

### P2 (보완)
9. **Macro Calendar 강화** - 이벤트→차트 링크, 중요도 표시
10. **DCA Dynamic DCA In 탭** 추가
11. **Workbench 수식 기능 강화**
12. **FAVORITED CHARTS 섹션** (차트 목록 상단)
13. **Ecosystems 필터** (Screener)

## 5. BK Investment 차별화 기능 (유지 & 개선)
- Portfolio Strategy Tester (ITC에 없음) - 유지
- Newsletter (ITC는 Reports) - Reports로 전환 고려
- 한국어 UI - 유지
- Notion Integration - 유지
- YouTube Transcript 분석 - 유지 및 개선
