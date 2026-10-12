import { LessonGuide } from '../types/learn';

export const LEARN_GUIDES: LessonGuide[] = [
  // ==========================================
  // INVESTING BASICS (5 Guides)
  // ==========================================
  {
    id: 'how-indian-stock-market-works',
    title: 'How the Indian Stock Market Works',
    slug: 'how-indian-stock-market-works',
    category: 'Investing Basics',
    difficulty: 'Beginner',
    readingTimeMinutes: 6,
    summary: 'Discover the core pillars of Indian equity markets, including SEBI, clearing corporations, brokers, and the T+1 settlement cycle.',
    learningObjectives: [
      'Understand the roles of retail participants, institutional investors, and regulatory bodies.',
      'Learn how orders flow from your trading application to exchange order matching engines.',
      'Grasp the Indian T+1 rolling settlement cycle and depository mechanics (CDSL & NSDL).'
    ],
    sections: [
      {
        heading: 'The Architecture of the Indian Market',
        content: [
          'The Indian capital market operates under the stringent regulatory oversight of the Securities and Exchange Board of India (SEBI). SEBI ensures market transparency, investor protection, and orderly market conduct.',
          'When you place a buy or sell trade, four key entities coordinate behind the scenes: your registered stock broker, the stock exchange (NSE or BSE), the clearing corporation (NSCCL/ICCL), and the central depositories (CDSL/NSDL).'
        ],
        example: {
          title: 'Illustrative Example: Order Route to Demat Delivery',
          scenario: 'An investor places a buy order for 10 shares of Tata Motors Ltd. via their online trading terminal at ₹950 per share.',
          analysis: 'The broker verifies fund balance and routes the order to the NSE order matching engine. Once matched with a seller, the clearing corporation settles the cash and delivers the shares into the investor\'s Demat account on a T+1 basis (next working day).'
        },
        tip: 'Indian equities follow a T+1 settlement system, meaning shares bought on Monday are credited to your Demat account by Tuesday evening.'
      },
      {
        heading: 'Trading Account vs Demat Account',
        content: [
          'A Demat (Dematerialized) account acts as an electronic vault holding your securities, similar to a bank account holding cash. Demat accounts are maintained by CDSL or NSDL.',
          'A Trading account is the transaction interface through which you place buy and sell orders. Your bank account provides the liquidity needed for trades.'
        ],
        tip: 'Always ensure your Demat account nomination and KYC details are up to date to prevent temporary operational account freezes.'
      }
    ],
    keyTakeaways: [
      'SEBI regulates all market participants to preserve market fairness and systemic security.',
      'The trading account executes the order; the Demat account safely stores the digital shares.',
      'Settlement occurs on a T+1 rolling basis across major Indian exchanges.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Which regulatory authority oversees securities markets and protects retail investors in India?',
        options: ['RBI', 'SEBI', 'IRDAI', 'PFRDA'],
        correctIndex: 1,
        explanation: 'The Securities and Exchange Board of India (SEBI) is the statutory regulatory body governing equity markets in India.'
      },
      {
        id: 'q2',
        question: 'What is the standard rolling settlement timeframe for equity spot trades in India?',
        options: ['T+0', 'T+1', 'T+3', 'T+5'],
        correctIndex: 1,
        explanation: 'India operates under a T+1 rolling settlement cycle, meaning trade settlement concludes one trading day after trade execution.'
      }
    ],
    relatedLessonIds: ['nse-bse-nifty-sensex', 'market-limit-stop-loss-orders']
  },
  {
    id: 'nse-bse-nifty-sensex',
    title: 'NSE, BSE, NIFTY 50, and SENSEX',
    slug: 'nse-bse-nifty-sensex',
    category: 'Investing Basics',
    difficulty: 'Beginner',
    readingTimeMinutes: 5,
    summary: 'A clear guide to India\'s two primary exchanges and the benchmark indices used to gauge overall market economic health.',
    learningObjectives: [
      'Understand the historical and structural differences between NSE and BSE.',
      'Learn how the NIFTY 50 and SENSEX indices are calculated using free-float market capitalization.',
      'Interpret benchmark movements and sector weightages.'
    ],
    sections: [
      {
        heading: 'The Two Premier Exchanges',
        content: [
          'The National Stock Exchange (NSE) and Bombay Stock Exchange (BSE) are the premier stock exchanges of India. BSE, established in 1875, is Asia\'s oldest stock exchange. NSE was founded in 1992, pioneering electronic screen-based trading and hosting higher derivatives turnover.',
          'Most major liquid stocks in India are dual-listed on both NSE and BSE, with prices generally synchronized through arbitrage.'
        ]
      },
      {
        heading: 'Benchmark Indices and Free-Float Methodology',
        content: [
          'The NIFTY 50 represents 50 of the largest and most liquid Indian blue-chip companies listed on NSE across key economic sectors.',
          'The SENSEX tracks 30 well-established companies listed on the BSE.',
          'Both indices employ the free-float market capitalization methodology, meaning only shares available for public trading (excluding promoter lock-ins) count toward company index weighting.'
        ],
        example: {
          title: 'Illustrative Example: Index Weightage Impact',
          scenario: 'Suppose HDFC Bank and Reliance Industries make up over 20% of the NIFTY 50 combined weight.',
          analysis: 'If these two heavyweights decline by 2% while 30 smaller constituent companies rise by 0.5%, the overall NIFTY 50 index can still close in negative territory due to capitalization weighting.'
        },
        tip: 'Never assume every stock goes up when Nifty is green. The index reflects aggregate weighted movement of its 50 basket constituents.'
      }
    ],
    keyTakeaways: [
      'NSE and BSE provide the matching platforms for buying and selling Indian securities.',
      'NIFTY 50 (50 stocks) and SENSEX (30 stocks) are key market health indicators.',
      'Free-float market capitalization dictates the influence of each company on the index.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'How many constituent companies make up the BSE benchmark SENSEX index?',
        options: ['50', '100', '30', '500'],
        correctIndex: 2,
        explanation: 'SENSEX is composed of 30 large, established, and financially sound companies listed on BSE.'
      },
      {
        id: 'q2',
        question: 'What calculation methodology is used by NIFTY 50 and SENSEX?',
        options: ['Price-weighted average', 'Equal-weighted average', 'Free-float market capitalization', 'Book value weighting'],
        correctIndex: 2,
        explanation: 'Both benchmark indices use the free-float market capitalization method, excluding promoter and restricted holdings.'
      }
    ],
    relatedLessonIds: ['how-indian-stock-market-works', 'stocks-etfs-index-funds']
  },
  {
    id: 'stocks-etfs-index-funds',
    title: 'Stocks, ETFs, and Index Funds',
    slug: 'stocks-etfs-index-funds',
    category: 'Investing Basics',
    difficulty: 'Beginner',
    readingTimeMinutes: 7,
    summary: 'Compare direct equity ownership against passive index trackers like NIFTYBEES and low-cost mutual funds.',
    learningObjectives: [
      'Differentiate between direct stocks, Exchange Traded Funds (ETFs), and index mutual funds.',
      'Understand NAV vs real-time market trading prices and tracking errors in ETFs.',
      'Evaluate cost ratios (Total Expense Ratio) and diversification benefits.'
    ],
    sections: [
      {
        heading: 'Direct Stocks vs Collective Investment Vehicles',
        content: [
          'Direct stock investing involves buying shares of individual companies (e.g., Infosys, Larsen & Toubro). Direct stocks offer uncapped upside potential but expose the investor to single-company business risk.',
          'An Exchange Traded Fund (ETF) is an investment fund traded on stock exchanges like an ordinary stock. An ETF holds a basket of assets—such as all 50 stocks in NIFTY 50 or physical gold.'
        ],
        example: {
          title: 'Illustrative Example: Buying NIFTYBEES vs 50 Individual Stocks',
          scenario: 'An investor wants exposure to the top 50 Indian companies with ₹10,000 capital.',
          analysis: 'Buying all 50 shares individually would require lakhs of rupees and substantial broker commissions. Buying units of an ETF such as NIFTYBEES provides proportional exposure to all 50 stocks in a single transaction.'
        }
      },
      {
        heading: 'ETFs vs Index Mutual Funds',
        content: [
          'ETFs trade in real time throughout market hours (9:15 AM to 3:30 PM IST), allowing limit orders and intra-day execution. You need a Demat account to purchase ETFs.',
          'Index Mutual Funds are purchased directly from asset management companies (AMCs) at the end-of-day Net Asset Value (NAV). They do not require a Demat account and are ideal for automated monthly SIPs (Systematic Investment Plans).'
        ],
        tip: 'When buying ETFs, verify liquidity by checking the bid-ask spread and ensuring the market price is close to the indicative Net Asset Value (iNAV).'
      }
    ],
    keyTakeaways: [
      'Direct stocks carry higher company-specific risk and demand active research.',
      'ETFs trade live on exchanges like stocks and offer instant broad basket diversification.',
      'Index mutual funds allow disciplined, automated end-of-day SIP investing without Demat requirements.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Which instrument trades throughout market hours on exchange terminals at dynamic tick prices?',
        options: ['Direct Mutual Fund NAV', 'Exchange Traded Fund (ETF)', 'Public Provident Fund', 'Bank Fixed Deposit'],
        correctIndex: 1,
        explanation: 'ETFs trade live throughout exchange hours just like individual equities, with changing prices and bid-ask spreads.'
      }
    ],
    relatedLessonIds: ['nse-bse-nifty-sensex', 'investing-versus-trading']
  },
  {
    id: 'investing-versus-trading',
    title: 'Investing Versus Trading',
    slug: 'investing-versus-trading',
    category: 'Investing Basics',
    difficulty: 'Beginner',
    readingTimeMinutes: 5,
    summary: 'Clarify the key distinctions in mindset, holding horizons, analytical tools, and risk expectations between investing and trading.',
    learningObjectives: [
      'Compare holding horizons: Long-term compounding vs short-term price swings.',
      'Contrast fundamental valuation approaches with technical price-action setups.',
      'Recognize how capital risk and psychological stress differ in each discipline.'
    ],
    sections: [
      {
        heading: 'Two Distinct Paths to Wealth',
        content: [
          'Investing focuses on creating long-term wealth by participating in the business growth of sound enterprises over years or decades. Investors rely primarily on fundamental analysis: revenue growth, return on equity (ROE), moat, and management integrity.',
          'Trading focuses on capturing short-term market inefficiencies and price momentum across minutes, hours, days, or weeks. Traders rely primarily on technical analysis, price action, indicators, and strict stop-loss rules.'
        ],
        example: {
          title: 'Illustrative Example: Contrasting Approaches during a 10% Market Correction',
          scenario: 'A company reports temporary supply disruption, dropping share price from ₹1,000 to ₹900.',
          analysis: 'An investor views the drop as an opportunity to buy a durable franchise at a discounted valuation. A short-term swing trader cuts the position immediately because a technical support level broke, protecting short-term trading capital.'
        },
        tip: 'Never convert a failed short-term trade into a "long-term investment" just to avoid booking a loss. Clear rules prevent heavy drawdowns.'
      }
    ],
    keyTakeaways: [
      'Investors seek business compounding; traders seek price movement velocity.',
      'Investors ride through market cycles; traders preserve capital with strict stops.',
      'Combining both requires separate capital allocations and different emotional rules.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What is the primary objective of long-term equity investing?',
        options: [
          'Profiting from daily 15-minute price spikes',
          'Participating in business earnings growth and compounding over years',
          'Timing the exact market top before weekly options expiry',
          'Eliminating all forms of market drawdown'
        ],
        correctIndex: 1,
        explanation: 'Investing is focused on long-term capital compounding tied to underlying business performance and economic expansion.'
      }
    ],
    relatedLessonIds: ['how-indian-stock-market-works', 'market-limit-stop-loss-orders']
  },
  {
    id: 'market-limit-stop-loss-orders',
    title: 'Market Orders, Limit Orders, and Stop-Loss Orders',
    slug: 'market-limit-stop-loss-orders',
    category: 'Investing Basics',
    difficulty: 'Beginner',
    readingTimeMinutes: 6,
    summary: 'Master order types to control trade execution, prevent slippage, and automate defensive exits on Indian exchanges.',
    learningObjectives: [
      'Understand the mechanics of Market orders, Limit orders, and Stop-Loss (SL / SL-M) orders.',
      'Learn how slippage affects market orders in illiquid stocks.',
      'Configure trigger prices and limit prices accurately in your broker terminal.'
    ],
    sections: [
      {
        heading: 'Core Order Types Explained',
        content: [
          'A Market Order instructs the broker to buy or sell immediately at the best currently available market price. Execution is guaranteed, but the exact fill price is not guaranteed.',
          'A Limit Order sets a specific price boundary: you specify the maximum price you are willing to pay for a buy order, or the minimum price you will accept for a sell order. The fill price is guaranteed or better, but execution depends on market price reaching your limit.'
        ],
        example: {
          title: 'Illustrative Example: The Danger of Market Orders in Low Liquidity',
          scenario: 'A stock last traded at ₹500, but the nearest ask quote in the order book is ₹520.',
          analysis: 'Placing a market buy order will immediately fill at ₹520, resulting in a 4% immediate slippage loss. A limit order at ₹502 ensures you never pay above your specified threshold.'
        }
      },
      {
        heading: 'Stop-Loss (SL) and Stop-Loss Market (SL-M) Orders',
        content: [
          'A Stop-Loss order stays inactive until the stock reaches your specified "Trigger Price". Once triggered, it turns into an active order to limit downside loss.',
          'SL-Limit: Contains both a Trigger Price and a Limit Price. When the trigger is breached, a Limit order enters the exchange order book.',
          'SL-Market: When the trigger is breached, a Market order is released to sell immediately at any prevailing quote.'
        ],
        tip: 'In volatile opening sessions (9:15 to 9:30 AM), avoid plain market orders on small-cap stocks to prevent wide bid-ask slippage.'
      }
    ],
    keyTakeaways: [
      'Market orders prioritize speed; limit orders prioritize price certainty.',
      'Stop-loss orders protect capital by automating exits when the market moves against your position.',
      'Always use Limit orders on less liquid stocks to avoid unexpected fill prices.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Which order type guarantees execution price is equal to or better than your specified target, but does not guarantee execution if price is never reached?',
        options: ['Market Order', 'Limit Order', 'SL-M Order', 'Immediate-or-Cancel Order'],
        correctIndex: 1,
        explanation: 'A Limit order guarantees that your execution price will not be worse than your limit price, though the trade only fills if matched.'
      }
    ],
    relatedLessonIds: ['how-indian-stock-market-works', 'position-sizing-capital-protection']
  },

  // ==========================================
  // TECHNICAL ANALYSIS (4 Guides)
  // ==========================================
  {
    id: 'candlestick-basics',
    title: 'Candlestick Basics: Reading Price Action',
    slug: 'candlestick-basics',
    category: 'Technical Analysis',
    difficulty: 'Beginner',
    readingTimeMinutes: 7,
    summary: 'Decode OHLC candlestick charts, identify buyer vs seller dominance, and recognize essential reversal patterns.',
    learningObjectives: [
      'Interpret Open, High, Low, and Close (OHLC) values on candlestick bodies and wicks.',
      'Differentiate between bullish green candles and bearish red candles.',
      'Identify key candlestick structures: Hammer, Bullish Engulfing, Doji, and Shooting Star.'
    ],
    sections: [
      {
        heading: 'Anatomy of a Japanese Candlestick',
        content: [
          'Every candlestick represents price action over a defined timeframe (e.g., 5-minute, 1-hour, or 1-day).',
          'The real body depicts the price range between the Open and Close. In a green (bullish) candle, Close is higher than Open. In a red (bearish) candle, Close is lower than Open.',
          'The upper and lower wicks (shadows) represent the highest and lowest prices reached during that session.'
        ],
        example: {
          title: 'Illustrative Example: Reading Wick Rejection',
          scenario: 'A daily candle opens at ₹1,000, drops to ₹940 during the day, but surges to close at ₹995.',
          analysis: 'This forms a "Hammer" candle with a long lower shadow. It demonstrates that aggressive buyers entered at ₹940, completely absorbing selling pressure before market close.'
        }
      },
      {
        heading: 'Core Reversal Patterns',
        content: [
          'Hammer / Pin Bar: Long lower wick occurring after a downtrend, signaling potential upward reversal.',
          'Doji: Extremely small body with wicks on both sides, signaling buyer-seller equilibrium and indecision.',
          'Bullish Engulfing: A large green candle whose real body completely engulfs the prior red candle, indicating strong institutional demand.'
        ],
        tip: 'Never trade candlestick patterns in isolation. Always confirm them with nearby support/resistance zones and trading volume.'
      }
    ],
    keyTakeaways: [
      'Candlesticks illustrate the psychological battle between buyers and sellers in real time.',
      'Long wicks reveal price rejection; large bodies reveal directional conviction.',
      'Always look for pattern confirmation in the subsequent candle before entering.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What does a long lower shadow (wick) on a candlestick indicate?',
        options: [
          'Sellers were in absolute control until the market close',
          'Buyers pushed price back up from lows, rejecting lower price levels',
          'Trading volume was zero during the period',
          'The market was halted by circuit breakers'
        ],
        correctIndex: 1,
        explanation: 'A long lower shadow indicates that bears pushed price down, but bulls aggressively stepped in to buy, lifting the close.'
      }
    ],
    relatedLessonIds: ['trends-support-resistance', 'volume-moving-averages']
  },
  {
    id: 'trends-support-resistance',
    title: 'Trends, Support, and Resistance',
    slug: 'trends-support-resistance',
    category: 'Technical Analysis',
    difficulty: 'Intermediate',
    readingTimeMinutes: 8,
    summary: 'Identify market direction, draw meaningful horizontal levels, and trade trendline breakouts effectively.',
    learningObjectives: [
      'Define uptrends (higher highs & higher lows), downtrends, and sideways consolidation.',
      'Draw horizontal support and resistance zones based on historical price reactions.',
      'Understand role reversal: when broken support turns into new resistance.'
    ],
    sections: [
      {
        heading: 'Market Trends and Structure',
        content: [
          'Prices never move in a straight line; they advance in waves of expansion and retracement.',
          'An Uptrend is characterized by a sequence of Higher Highs (HH) and Higher Lows (HL).',
          'A Downtrend is characterized by Lower Highs (LH) and Lower Lows (LL).',
          'A Range-Bound / Sideways market oscillates between a clear ceiling and floor.'
        ]
      },
      {
        heading: 'Support and Resistance Zones',
        content: [
          'Support is a price level where buying interest is strong enough to overcome selling pressure, preventing further declines.',
          'Resistance is a price level where selling interest overcomes buying demand, capping price rallies.',
          'Concept of Polarity (Role Reversal): When price definitively breaks below a major support level, that level often becomes a formidable resistance on subsequent pullbacks.'
        ],
        example: {
          title: 'Illustrative Example: Nifty 50 Psychological Support',
          scenario: 'Nifty 50 approaches 24,000 for the third time, having rebounded there twice in the previous month.',
          analysis: 'Because institutional orders accumulated at 24,000 previously, market participants view 24,000 as a high-probability support zone, planning low-risk entries with stops just below 23,920.'
        },
        tip: 'Treat support and resistance as dynamic zones (e.g. ₹2,400 to ₹2,420) rather than exact single-rupee price lines.'
      }
    ],
    keyTakeaways: [
      'Trade with the trend: buy pullbacks in uptrends; avoid fighting established downtrends.',
      'Support and resistance are zones where historical liquidity and order imbalances concentrate.',
      'Broken support frequently acts as future resistance.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What defines a classic technical uptrend in market structure?',
        options: [
          'Lower highs and lower lows',
          'Higher highs and higher lows',
          'Flat candles with zero volume',
          'Prices staying within a 5-point range'
        ],
        correctIndex: 1,
        explanation: 'An uptrend consists of a series of higher highs and higher lows, reflecting rising demand on every retracement.'
      }
    ],
    relatedLessonIds: ['candlestick-basics', 'volume-moving-averages']
  },
  {
    id: 'volume-moving-averages',
    title: 'Volume and Moving Averages',
    slug: 'volume-moving-averages',
    category: 'Technical Analysis',
    difficulty: 'Intermediate',
    readingTimeMinutes: 7,
    summary: 'Validate price moves using institutional volume spikes and smooth trend indicators like the 20, 50, and 200 EMA.',
    learningObjectives: [
      'Use trading volume to confirm breakouts and detect false rallies.',
      'Differentiate between Simple Moving Averages (SMA) and Exponential Moving Averages (EMA).',
      'Identify key institutional levels: 50-day and 200-day moving average crossovers.'
    ],
    sections: [
      {
        heading: 'Volume as Truth in Market Action',
        content: [
          'Volume measures the total number of shares transacted over a specific period. It is the fuel of price movement.',
          'A price breakout above key resistance accompanied by 2x to 3x average daily volume confirms institutional accumulation.',
          'Conversely, a price rally with declining volume indicates weak retail participation, warning of impending exhaustion.'
        ]
      },
      {
        heading: 'Moving Averages: Dynamic Trend Filters',
        content: [
          'Moving averages smooth out erratic day-to-day noise to reveal underlying trend velocity.',
          '20 EMA: Short-term momentum guide used by active swing traders.',
          '50 EMA / SMA: Intermediate-term trend benchmark used by mutual funds and institutions.',
          '200 SMA: The defining line between long-term bull and bear regimes for major indices and stocks.'
        ],
        example: {
          title: 'Illustrative Example: The Golden Cross',
          scenario: 'A stock\'s 50-day SMA crosses above its 200-day SMA following an extended 8-month consolidation.',
          analysis: 'This technical event, known as the "Golden Cross", signals that medium-term momentum is decisively outperforming long-term trend, attracting institutional buying interest.'
        },
        tip: 'Never buy just because price touched a moving average; wait for price confirmation such as a bullish candle rejecting the average.'
      }
    ],
    keyTakeaways: [
      'High volume validates breakouts; low volume flags weak follow-through.',
      'EMAs react faster to recent price action; SMAs provide broader structural support.',
      'The 200-day moving average acts as the primary baseline for long-term equity trends.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What occurs during a "Golden Cross" technical signal?',
        options: [
          '50-day moving average crosses below 200-day moving average',
          '50-day moving average crosses above 200-day moving average',
          'Price drops below zero',
          'Volume drops to its 52-week low'
        ],
        correctIndex: 1,
        explanation: 'A Golden Cross occurs when a short/medium-term average (e.g., 50 SMA) crosses above a long-term average (200 SMA).'
      }
    ],
    relatedLessonIds: ['trends-support-resistance', 'risk-reward-ratios']
  },
  {
    id: 'risk-reward-ratios',
    title: 'Risk-Reward Ratios: The Math of Profitability',
    slug: 'risk-reward-ratios',
    category: 'Technical Analysis',
    difficulty: 'Intermediate',
    readingTimeMinutes: 6,
    summary: 'Understand why a trader with a 40% win rate can remain consistently profitable through asymmetric risk-reward planning.',
    learningObjectives: [
      'Calculate the Risk-to-Reward Ratio (RRR) on every trade setup.',
      'Relate win rate to required minimum payout expectancy.',
      'Set stop-loss and profit targets based on technical structure rather than emotional targets.'
    ],
    sections: [
      {
        heading: 'The Geometry of Trade Expectancy',
        content: [
          'The Risk-Reward Ratio compares how much capital you risk against the potential profit target on a trade.',
          'A setup where you risk ₹10 per share with a target gain of ₹25 per share has an RRR of 1:2.5.',
          'Professional traders never take trades with an RRR worse than 1:1.5 to 1:2. This ensures your gains easily cover unavoidable losing streaks.'
        ],
        example: {
          title: 'Illustrative Example: Win Rate vs RRR Over 10 Trades',
          scenario: 'A trader executes 10 trades with 1:3 RRR (risking ₹1,000 to make ₹3,000 on each trade). The trader only wins 4 out of 10 trades (40% win rate).',
          analysis: 'Losses: 6 trades × -₹1,000 = -₹6,000. Wins: 4 trades × +₹3,000 = +₹12,000. Net Profit: +₹6,000! Despite losing more than half the trades, disciplined RRR yielded robust net profitability.'
        },
        tip: 'Define both your invalidation price (stop-loss) and reasonable target BEFORE entering the trade, never after.'
      }
    ],
    keyTakeaways: [
      'You do not need an 80% win rate to be profitable; asymmetric payouts drive performance.',
      'Aim for minimum 1:2 risk-reward setups based on concrete technical levels.',
      'Consistency is a byproduct of mathematical discipline, not forecasting perfection.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'If you buy a stock at ₹200 with a stop-loss at ₹190 and target at ₹230, what is your Risk-to-Reward ratio?',
        options: ['1:1', '1:2', '1:3', '1:5'],
        correctIndex: 2,
        explanation: 'Risk = ₹200 - ₹190 = ₹10. Reward = ₹230 - ₹200 = ₹30. Ratio = 10:30 or 1:3.'
      }
    ],
    relatedLessonIds: ['position-sizing-capital-protection', 'stop-loss-planning-execution']
  },

  // ==========================================
  // FUNDAMENTAL ANALYSIS (3 Guides)
  // ==========================================
  {
    id: 'revenue-profit-eps-pe-ratio',
    title: 'Revenue, Profit, EPS, and P/E Ratio',
    slug: 'revenue-profit-eps-pe-ratio',
    category: 'Fundamental Analysis',
    difficulty: 'Beginner',
    readingTimeMinutes: 7,
    summary: 'Demystify key valuation metrics to judge whether a stock is attractively priced or trading at an expensive premium.',
    learningObjectives: [
      'Trace top-line Revenue down to Operating Profit and Net Profit (PAT).',
      'Compute Earnings Per Share (EPS) and Price-to-Earnings (P/E) ratio.',
      'Compare company P/E against historical medians and industry peer multiples.'
    ],
    sections: [
      {
        heading: 'From Revenue to Bottom-Line Profit',
        content: [
          'Top-Line Revenue: The total sales income generated by the business before any expenses.',
          'Operating Profit (EBITDA): Revenue minus direct operating costs and raw material costs, reflecting core business efficiency.',
          'Net Profit (Profit After Tax - PAT): The residual earnings belonging to shareholders after deducting depreciation, finance interest, and corporate taxes.'
        ]
      },
      {
        heading: 'EPS and the Price-to-Earnings (P/E) Multiple',
        content: [
          'Earnings Per Share (EPS) = Net Profit ÷ Total Outstanding Shares.',
          'P/E Ratio = Current Market Price ÷ EPS. It tells you how many rupees investors are willing to pay for every ₹1 of company earnings.',
          'A high P/E ratio indicates that the market expects strong future earnings expansion, or that the stock may be overvalued relative to peers.'
        ],
        example: {
          title: 'Illustrative Example: Evaluating IT Blue-Chip Valuation',
          scenario: 'Company A has a stock price of ₹1,500 and annual EPS of ₹50 (P/E = 30). Its historical 5-year average P/E is 25, while the sectoral IT index P/E is 28.',
          analysis: 'At a P/E of 30, Company A trades at a slight premium to its historical median. An investor must check whether current revenue growth justifies paying this multiple.'
        },
        tip: 'Never judge a stock solely by its share price. A ₹3,000 stock with an EPS of ₹150 has a P/E of 20, making it cheaper on earnings than a ₹50 stock with an EPS of ₹1 (P/E of 50).'
      }
    ],
    keyTakeaways: [
      'Revenue measures business scale; Net Profit measures bottom-line financial health.',
      'EPS standardizes earnings across different share capital structures.',
      'P/E provides a relative valuation yardstick when compared against sector peers.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'If a company reports Net Profit of ₹100 Crore with 1 Crore outstanding shares, and its stock trades at ₹500, what is its P/E ratio?',
        options: ['10', '25', '5', '50'],
        correctIndex: 2,
        explanation: 'EPS = ₹100 Crore / 1 Crore shares = ₹100. P/E = Market Price (₹500) / EPS (₹100) = 5.'
      }
    ],
    relatedLessonIds: ['balance-sheets-debt-cash-flow', 'understanding-company-fundamentals']
  },
  {
    id: 'balance-sheets-debt-cash-flow',
    title: 'Balance Sheets, Debt, and Cash Flow',
    slug: 'balance-sheets-debt-cash-flow',
    category: 'Fundamental Analysis',
    difficulty: 'Intermediate',
    readingTimeMinutes: 8,
    summary: 'Learn to read the corporate balance sheet, monitor debt-to-equity leverage, and analyze free cash flows.',
    learningObjectives: [
      'Understand Assets = Liabilities + Shareholders\' Equity.',
      'Assess financial leverage using the Debt-to-Equity (D/E) and Interest Coverage ratios.',
      'Differentiate accounting accounting profit from Cash Flow from Operations (CFO).'
    ],
    sections: [
      {
        heading: 'The Balance Sheet: Snapshot of Solvency',
        content: [
          'While the Profit & Loss statement shows performance over a period, the Balance Sheet presents a snapshot of assets, liabilities, and net worth at a specific date.',
          'Assets: What the company owns (factories, cash, inventory, receivables).',
          'Liabilities: What the company owes (bank loans, trade payables, statutory dues).',
          'Equity: Net book value belonging to equity shareholders.'
        ]
      },
      {
        heading: 'The Power of Free Cash Flow',
        content: [
          'Profit is an accounting construct; cash in the bank pays bills and dividends.',
          'Cash Flow from Operations (CFO): Actual cash generated by core commercial activities.',
          'Free Cash Flow (FCF) = CFO minus Capital Expenditures (CapEx). FCF is the true surplus cash available to pay dividends, reduce debt, or reinvest for organic growth.'
        ],
        example: {
          title: 'Illustrative Example: Warning Signs in Accounting Profits',
          scenario: 'A manufacturing firm reports increasing Net Profit of ₹50 Crore each year, but its Cash Flow from Operations is consistently negative (-₹20 Crore).',
          analysis: 'This divergence indicates sales are tied up in uncollected receivables or unsold inventory. Without actual cash collection, the business risks liquidity distress despite accounting profits.'
        },
        tip: 'For capital-intensive sectors, check the Interest Coverage Ratio (EBIT ÷ Interest Expense). A ratio above 3.0 indicates safe debt service ability.'
      }
    ],
    keyTakeaways: [
      'A robust balance sheet with manageable debt provides downside resilience during economic downturns.',
      'Positive Operating Cash Flow should ideally match or exceed reported Net Profit.',
      'Free Cash Flow is the ultimate metric for sustainable shareholder value creation.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What is Free Cash Flow (FCF)?',
        options: [
          'Gross Revenue minus total taxes',
          'Cash Flow from Operations minus Capital Expenditures (CapEx)',
          'Total bank loan borrowings received during the year',
          'Total market capitalization of the firm'
        ],
        correctIndex: 1,
        explanation: 'Free Cash Flow equals Cash Flow from Operations minus Capital Expenditures required to maintain or expand asset base.'
      }
    ],
    relatedLessonIds: ['revenue-profit-eps-pe-ratio', 'understanding-company-fundamentals']
  },
  {
    id: 'understanding-company-fundamentals',
    title: 'Understanding Company Fundamentals & Economic Moats',
    slug: 'understanding-company-fundamentals',
    category: 'Fundamental Analysis',
    difficulty: 'Advanced',
    readingTimeMinutes: 9,
    summary: 'Evaluate competitive advantages, pricing power, return on equity (ROE), and capital allocation efficiency.',
    learningObjectives: [
      'Identify structural economic moats: Brand, switching costs, cost advantage, and network effects.',
      'Analyze Return on Capital Employed (ROCE) and Return on Equity (ROE).',
      'Assess management capital allocation decisions and governance standards.'
    ],
    sections: [
      {
        heading: 'The Concept of an Economic Moat',
        content: [
          'An economic moat is a durable competitive advantage that enables a company to generate returns on capital above its cost of capital for years, resisting competitive pressures.',
          'Network Effects: Value increases as more participants join (e.g., exchanges, stock registries).',
          'Cost Advantage: Unmatched scale or logistics providing lowest unit production costs.',
          'High Switching Costs: Customers face financial or operational disruption if changing suppliers.',
          'Intangible Assets: Patents, regulatory licenses, or consumer brand goodwill commanding pricing power.'
        ]
      },
      {
        heading: 'Return on Capital Employed (ROCE)',
        content: [
          'ROCE measures how efficiently a company generates operating profits from all capital employed (equity plus debt).',
          'Consistently generating ROCE above 18-20% through economic cycles indicates excellent management and strong competitive positioning.'
        ],
        example: {
          title: 'Illustrative Example: Pricing Power in Consumer Brands',
          scenario: 'Inflation raises raw material input costs by 8% across the FMCG sector.',
          analysis: 'A company with a dominant brand moat raises product prices by 8% without losing sales volumes, protecting operating margins. Weak competitors must absorb costs, seeing margins collapse.'
        },
        tip: 'Look for companies with high ROCE that reinvest cash at high incremental rates of return, compounding shareholder capital over decades.'
      }
    ],
    keyTakeaways: [
      'Moats protect sustained high profitability from being competed away by industry rivals.',
      'ROCE and ROE are premier metrics for evaluating capital efficiency.',
      'Management integrity and prudent capital allocation are non-negotiable for long-term investments.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Which of the following represents a strong economic moat?',
        options: [
          'Relying solely on external debt to finance working capital',
          'High customer switching costs and protected pricing power',
          'Selling commoditized goods in an overcrowded marketplace',
          'Having declining return on equity each year'
        ],
        correctIndex: 1,
        explanation: 'High switching costs and pricing power allow businesses to defend margins and retain customers against competitors.'
      }
    ],
    relatedLessonIds: ['revenue-profit-eps-pe-ratio', 'balance-sheets-debt-cash-flow']
  },

  // ==========================================
  // RISK MANAGEMENT (5 Guides)
  // ==========================================
  {
    id: 'position-sizing-capital-protection',
    title: 'Position Sizing and Capital Protection',
    slug: 'position-sizing-capital-protection',
    category: 'Risk Management',
    difficulty: 'Beginner',
    readingTimeMinutes: 7,
    summary: 'Calculate exact share quantity based on total account risk to ensure no single trade endangers your trading portfolio.',
    learningObjectives: [
      'Apply the 1% - 2% maximum account risk rule per trade.',
      'Calculate position size using account size, entry price, and stop-loss price.',
      'Distinguish between position size (rupees invested) and risk size (rupees at risk).'
    ],
    sections: [
      {
        heading: 'The Golden Rule of Capital Survival',
        content: [
          'The first objective of every market participant is capital preservation; profit generation is secondary.',
          'Professional traders limit total risk on any single trade to no more than 1% to 2% of total trading equity.',
          'If you have ₹1,00,000 in your trading account, risking 1% means you will lose at most ₹1,000 if your stop-loss is triggered.'
        ]
      },
      {
        heading: 'The Position Sizing Formula',
        content: [
          'Position Size (Quantity) = (Account Capital × Risk %) ÷ (Entry Price - Stop Loss Price).',
          'Notice that your stop-loss determines your quantity, not your emotions or gut feeling.'
        ],
        example: {
          title: 'Illustrative Example: Calculating Position Size Step-by-Step',
          scenario: 'Total Account = ₹2,00,000. Risk parameter = 1% (₹2,000 max loss). You want to buy a stock at ₹400 with a stop-loss at ₹380.',
          analysis: 'Per-share risk = ₹400 - ₹380 = ₹20 per share. Max allowed shares = ₹2,000 ÷ ₹20 = 100 shares. Total capital allocated = 100 × ₹400 = ₹40,000. If the stock falls to ₹380, your loss is exactly ₹2,000 (1% of account).'
        },
        tip: 'Never adjust your stop-loss wider just to buy more shares. Size your shares down to fit the structural technical stop.'
      }
    ],
    keyTakeaways: [
      'Risk is defined by the distance to your stop-loss multiplied by quantity.',
      'Limit max risk on any single trade to 1-2% of total trading equity.',
      'Proper sizing eliminates the psychological anxiety of market fluctuations.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'If you have an account of ₹1,00,000 and risk 1% per trade, what is your maximum permissible rupee loss on a trade?',
        options: ['₹10,000', '₹5,000', '₹1,000', '₹100'],
        correctIndex: 2,
        explanation: '1% of ₹1,00,000 is ₹1,000. This is the maximum amount you should risk losing if stopped out.'
      }
    ],
    relatedLessonIds: ['stop-loss-planning-execution', 'risk-reward-ratios']
  },
  {
    id: 'stop-loss-planning-execution',
    title: 'Stop-Loss Planning and Execution',
    slug: 'stop-loss-planning-execution',
    category: 'Risk Management',
    difficulty: 'Intermediate',
    readingTimeMinutes: 6,
    summary: 'Place objective, technical-level stop losses and execute disciplined exits without hesitation or second-guessing.',
    learningObjectives: [
      'Place technical stop-losses below swing lows or key moving averages.',
      'Use Trailing Stop-Losses to lock in accumulated profits during extended trends.',
      'Avoid mental stops that lead to emotional paralysis when losses expand.'
    ],
    sections: [
      {
        heading: 'Why Mental Stops Fail',
        content: [
          'A "mental stop" is a pledge to manually sell when the price hits a certain level. In practice, cognitive dissonance often causes traders to freeze or hope for a rebound, turning minor 2% losses into catastrophic 20% drawdowns.',
          'System Stop Orders placed directly on the exchange remove emotional hesitation and protect you against rapid flash drops.'
        ]
      },
      {
        heading: 'Trailing Stop-Loss Strategies',
        content: [
          'A trailing stop is an exit order that ratchets upward as the market price moves in your favor, locking in unrealized gains while leaving upside open.',
          'Methods for trailing stops include: trailing below the previous day\'s low, trailing along the 20-period EMA, or using an Average True Range (ATR) multiplier.'
        ],
        example: {
          title: 'Illustrative Example: Trailing with Swing Lows',
          scenario: 'You bought a stock at ₹500 with initial stop at ₹480. The stock advances to ₹560, forms a higher low at ₹535, and resumes rallying to ₹600.',
          analysis: 'You trail your stop from ₹480 up to ₹530 (just below the new higher low). Even if a sudden reversal occurs, you lock in a guaranteed gain of at least ₹30 per share.'
        },
        tip: 'Never move your stop-loss further away from your entry price while in a trade. A wider stop increases risk and violates your trading plan.'
      }
    ],
    keyTakeaways: [
      'Stop-loss orders are non-negotiable insurance policies for your trading capital.',
      'Place stops at technical invalidation points where your trade premise is proven wrong.',
      'Trailing stops lock in profits during trending moves without capping your upside.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What is the primary danger of relying on "mental stops" instead of system stop-loss orders?',
        options: [
          'Brokers charge higher commission for mental stops',
          'Emotional hesitation and hope often prevent timely execution when losses escalate',
          'Exchange circuit breakers reject mental stops',
          'They always guarantee zero slippage'
        ],
        correctIndex: 1,
        explanation: 'Traders frequently freeze emotionally when prices drop, hoping for a bounce rather than cutting the loss as planned.'
      }
    ],
    relatedLessonIds: ['position-sizing-capital-protection', 'trading-psychology-mindset']
  },
  {
    id: 'portfolio-concentration-diversification',
    title: 'Portfolio Concentration and Diversification',
    slug: 'portfolio-concentration-diversification',
    category: 'Risk Management',
    difficulty: 'Intermediate',
    readingTimeMinutes: 7,
    summary: 'Balance risk and return by avoiding single-stock dominance and excessive sector clustering in your holdings.',
    learningObjectives: [
      'Understand the mathematical limits of diversification benefits (15-25 stock optimal basket).',
      'Identify hidden sector concentration risks across correlated industries.',
      'Use asset allocation across Equities, Debt, Gold, and Cash equivalents.'
    ],
    sections: [
      {
        heading: 'The Perils of Excessive Concentration',
        content: [
          'Holding 40% of your portfolio in a single company leaves your net worth vulnerable to corporate governance failures, earnings shocks, or regulatory headwinds.',
          'Academic research demonstrates that holding 15 to 25 diversified companies eliminates over 90% of unsystematic (company-specific) risk without diluting overall return potential.'
        ]
      },
      {
        heading: 'Beware of False Diversification',
        content: [
          'Holding six different banking stocks is not genuine diversification—it is concentrated financial sector exposure.',
          'True diversification spans uncorrelated sectors (e.g., IT, Healthcare, FMCG, Banking, Industrial Manufacturing) and multiple asset classes (Equities, Sovereign Gold Bonds, Liquid Debt).'
        ],
        example: {
          title: 'Illustrative Example: Sector Cluster Shocks',
          scenario: 'An investor holds 5 stocks: HDFC Bank, ICICI Bank, Axis Bank, Bajaj Finance, and SBI.',
          analysis: 'Although holding five distinct companies, all five belong to the Financial Services sector. A spike in non-performing assets (NPAs) or an unexpected RBI rate hike will adversely impact the entire portfolio simultaneously.'
        },
        tip: 'CapitalMind monitors your Herfindahl-Hirschman Index (HHI) to flag when single-sector or single-asset concentration exceeds healthy bounds.'
      }
    ],
    keyTakeaways: [
      'Diversification protects your wealth from catastrophic single-company events.',
      'Avoid sector clustering by spreading exposure across uncorrelated industries.',
      'Allocate across asset classes (equity, debt, gold) to cushion broader market drawdowns.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Which of the following portfolios exhibits the highest sector concentration risk?',
        options: [
          '10 stocks spread across IT, FMCG, Pharma, and Banking',
          '5 different private and public sector Indian bank stocks',
          'A balanced mix of NIFTY 50 ETF, Gold ETF, and Government Bonds',
          '15 stocks spanning 8 distinct industry classifications'
        ],
        correctIndex: 1,
        explanation: 'Holding 5 banking stocks concentrates 100% of risk within the banking and financial sector.'
      }
    ],
    relatedLessonIds: ['position-sizing-capital-protection', 'volatility-drawdowns-risk-management']
  },
  {
    id: 'volatility-drawdowns-risk-management',
    title: 'Volatility, Beta, and Portfolio Drawdowns',
    slug: 'volatility-drawdowns-risk-management',
    category: 'Risk Management',
    difficulty: 'Advanced',
    readingTimeMinutes: 8,
    summary: 'Master standard deviation, market Beta, and the mathematics of recovery from portfolio drawdowns.',
    learningObjectives: [
      'Understand Beta: how sensitive your portfolio is to NIFTY 50 benchmark moves.',
      'Learn the non-linear math of portfolio drawdown recovery.',
      'Use defensive hedges to cushion severe market corrections.'
    ],
    sections: [
      {
        heading: 'Understanding Beta and Volatility',
        content: [
          'Beta (β) measures a stock or portfolio\'s price sensitivity relative to benchmark index swings.',
          'Beta = 1.0: Moves in tandem with the benchmark.',
          'Beta > 1.3: High-beta cyclical (e.g. Midcap Realty or Metals) experiencing sharper rallies and steeper falls.',
          'Beta < 0.7: Low-beta defensive (e.g. FMCG or Healthcare) providing stability during market sell-offs.'
        ]
      },
      {
        heading: 'The Non-Linear Math of Drawdown Recovery',
        content: [
          'Drawdown measures the percentage decline from a portfolio\'s historical peak to its lowest subsequent trough.',
          'Recovering from a drawdown is mathematically asymmetric: the required gain to break even increases exponentially as losses deepen.'
        ],
        example: {
          title: 'Illustrative Example: The Asymmetry of Drawdown Recovery',
          scenario: 'A portfolio experiences varying degrees of loss from its peak value.',
          analysis: 'A 10% loss requires an 11.1% gain to recover. A 20% loss requires a 25% gain. A 50% loss requires a 100% gain! An 80% loss requires a massive 400% gain just to break even. This is why aggressive risk management is vital.'
        },
        tip: 'Keeping drawdowns below 15-20% ensures you remain in the compounding game without needing miracle returns to recover capital.'
      }
    ],
    keyTakeaways: [
      'Beta reflects systematic sensitivity to broad market benchmark volatility.',
      'Drawdown recovery is mathematically non-linear: deep losses require immense gains to breakeven.',
      'Defensive positioning during exuberance protects long-term compounding power.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'If a portfolio drops by 50% during a severe market bear cycle, what percentage gain is required to return to its original value?',
        options: ['50%', '75%', '100%', '200%'],
        correctIndex: 2,
        explanation: 'If a ₹100 portfolio drops 50% to ₹50, it must gain ₹50 on its new base of ₹50—which is a 100% gain.'
      }
    ],
    relatedLessonIds: ['portfolio-concentration-diversification', 'trading-psychology-mindset']
  },
  {
    id: 'trading-psychology-mindset',
    title: 'Trading Psychology and Common Mental Pitfalls',
    slug: 'trading-psychology-mindset',
    category: 'Risk Management',
    difficulty: 'Intermediate',
    readingTimeMinutes: 7,
    summary: 'Overcome FOMO, revenge trading, loss aversion, and cognitive biases that erode trading performance.',
    learningObjectives: [
      'Recognize the psychological cycle: Euphoria, Anxiety, Panic, and Despair.',
      'Neutralize Fear of Missing Out (FOMO) and impulsive Revenge Trading.',
      'Develop emotional detachment by executing a rule-based trading system.'
    ],
    sections: [
      {
        heading: 'The Cognitive Biases That Sabotage Traders',
        content: [
          'Confirmation Bias: Seeking only news or commentary that confirms your existing bias while ignoring warning signs.',
          'Loss Aversion: The psychological pain of losing ₹10,000 feels twice as intense as the joy of winning ₹10,000, causing traders to hold losing positions too long and exit winning positions too early.',
          'Gambler\'s Fallacy: Believing that after four losing trades, a winning trade is "due" next.'
        ]
      },
      {
        heading: 'Dealing with Revenge Trading and FOMO',
        content: [
          'Revenge Trading occurs immediately after suffering a painful loss: the trader doubles position size or forces poor setups to quickly win back lost money, often triggering account blowout.',
          'FOMO occurs when watching a stock rally without you. Buying at extended tops often results in buying at the exact point smart money is distributing.'
        ],
        example: {
          title: 'Illustrative Example: Cooling-Off Protocol',
          scenario: 'A day trader hits their maximum daily loss limit (-₹3,000) within the first 45 minutes of the trading session.',
          analysis: 'A disciplined trader immediately closes their terminal and logs off for the day. Attempting to trade back to break-even under emotional agitation almost always compounds the loss.'
        },
        tip: 'Set a hard daily loss limit. When reached, step away from the screen completely.'
      }
    ],
    keyTakeaways: [
      'Self-discipline and emotional regulation matter more than technical indicator complexity.',
      'Loss aversion leads to cutting winners too early and riding losers too long.',
      'A mandatory cooling-off rule after consecutive losses protects mental and financial capital.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What is "revenge trading"?',
        options: [
          'Buying index funds on automated monthly SIP schedules',
          'Impulsively taking aggressive trades immediately after a loss to quickly recover capital',
          'Hedging a portfolio using gold ETFs',
          'Selling a stock because its fundamentals deteriorated'
        ],
        correctIndex: 1,
        explanation: 'Revenge trading is an emotional response to losses where a trader recklessly forces trades to win back lost money.'
      }
    ],
    relatedLessonIds: ['stop-loss-planning-execution', 'building-a-disciplined-trading-plan']
  },

  // ==========================================
  // PRACTICAL TRADING (4 Guides)
  // ==========================================
  {
    id: 'how-to-use-paper-trading',
    title: 'How to Use Paper Trading Effectively',
    slug: 'how-to-use-paper-trading',
    category: 'Practical Trading',
    difficulty: 'Beginner',
    readingTimeMinutes: 6,
    summary: 'Harness CapitalMind\'s simulated trading environment to test strategies and master execution without risking real capital.',
    learningObjectives: [
      'Understand the purpose and realistic limitations of simulated paper trading.',
      'Treat simulated capital with the same psychological seriousness as real money.',
      'Test order placement, position sizing, and risk parameters risk-free.'
    ],
    sections: [
      {
        heading: 'Simulated Execution in CapitalMind',
        content: [
          'CapitalMind provides an isolated Paper Trading environment with ₹10,00,000 in simulated practice capital.',
          'It connects to live market ticks and replicates real-world order execution, order books, and positions without touching your actual bank funds or Demat holdings.',
          'Use paper trading to build muscle memory: placing limit orders, calculating quantity based on stop-loss points, and monitoring position P&L.'
        ]
      },
      {
        heading: 'How to Avoid the "Monopoly Money" Trap',
        content: [
          'The greatest risk of paper trading is taking irresponsible risks because "it\'s not real money". Doing so creates reckless habits that destroy real accounts.',
          'Always size positions in your paper account exactly as you would with your real capital budget. If your actual capital is ₹50,000, risk only ₹500 to ₹1,000 per paper trade.'
        ],
        example: {
          title: 'Illustrative Example: Strategy Validation Routine',
          scenario: 'A trader develops a 20 EMA pullback strategy for liquid NIFTY 50 stocks.',
          analysis: 'Before committing real capital, the trader executes 30 consecutive paper trades, logging win rate, average RRR, and max drawdown. Only after demonstrating a positive expectancy over 30 trades does the trader transition to small live positions.'
        },
        tip: 'Review your simulated trades in the Paper Trades ledger to measure your execution consistency.'
      }
    ],
    keyTakeaways: [
      'Paper trading builds execution familiarity without capital risk.',
      'Treat simulated capital as real capital to develop genuine emotional discipline.',
      'Validate every strategy across a sample size of at least 30 trades before deploying real money.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What is the most effective way to utilize a paper trading simulator?',
        options: [
          'Taking maximum leverage bets without stop losses because money is virtual',
          'Treating the simulated capital with real-money discipline and testing structured rules',
          'Trading illiquid penny stocks to artificially inflate paper returns',
          'Ignoring trade logs and performance metrics'
        ],
        correctIndex: 1,
        explanation: 'Treating paper trading with real discipline allows you to master rules, risk sizing, and mechanics before deploying hard-earned capital.'
      }
    ],
    relatedLessonIds: ['how-to-review-a-trade', 'building-a-disciplined-trading-plan']
  },
  {
    id: 'how-to-review-a-trade',
    title: 'How to Review a Trade: The Trading Journal',
    slug: 'how-to-review-a-trade',
    category: 'Practical Trading',
    difficulty: 'Intermediate',
    readingTimeMinutes: 7,
    summary: 'Build a rigorous post-trade review routine to identify recurring execution errors and refine your edge.',
    learningObjectives: [
      'Maintain an analytical trade log documenting entry reason, stop, target, and emotional state.',
      'Separate process quality from outcome quality (Good loss vs Bad win).',
      'Conduct weekly and monthly reviews to identify behavioral leaks.'
    ],
    sections: [
      {
        heading: 'Good Losses vs Bad Wins',
        content: [
          'A Good Loss: You followed your plan, sized appropriately, waited for the valid setup, and took a predetermined stop loss. The loss was a normal business cost of trading.',
          'A Bad Win: You violated your rules, took an oversized impulsive bet, didn\'t set a stop, and got lucky when the market reversed in your favor. This bad habit will eventually lead to major losses.'
        ]
      },
      {
        heading: 'Essential Data Points for Your Trading Journal',
        content: [
          '1. Setup catalyst: Why did you enter? (Support bounce, breakout, earnings catalyst).',
          '2. Planned RRR: What was the risk and target at entry?',
          '3. Execution fidelity: Did you follow your planned exit, or did you panic early?',
          '4. Emotional state: Were you calm, rushed, angry, or overconfident?'
        ],
        example: {
          title: 'Illustrative Example: Identifying Costly Leaks in Journal Data',
          scenario: 'After logging 40 trades, a trader notices that afternoon trades after 2:00 PM have an 80% loss rate and account for 75% of total losses.',
          analysis: 'The journal reveals that morning trades are structured, while afternoon trades are impulsive boredom trades. Banning trades after 2:00 PM instantly turns the trader profitable.'
        },
        tip: 'Take a screenshot of the chart at entry and at exit. Visual documentation is the fastest teacher.'
      }
    ],
    keyTakeaways: [
      'A trading journal is the single most reliable tool for systematic self-improvement.',
      'Evaluate trades by process quality, not solely by whether they made money.',
      'Audit your logs regularly to identify behavioral patterns and leaks.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What defines a "Good Loss" in trading methodology?',
        options: [
          'A trade where you doubled down as the price fell',
          'A trade that adhered strictly to your trading plan and risk limits, but reached your planned stop-loss',
          'A trade where you forgot to place a stop-loss and got lucky',
          'A trade with zero documentation'
        ],
        correctIndex: 1,
        explanation: 'A good loss occurs when you follow your rules and manage risk properly; losses are an unavoidable statistical cost in any trading strategy.'
      }
    ],
    relatedLessonIds: ['how-to-use-paper-trading', 'building-a-disciplined-trading-plan']
  },
  {
    id: 'building-a-disciplined-trading-plan',
    title: 'Building a Disciplined Trading Plan',
    slug: 'building-a-disciplined-trading-plan',
    category: 'Practical Trading',
    difficulty: 'Intermediate',
    readingTimeMinutes: 8,
    summary: 'Create a written operational blueprint specifying market universe, entry triggers, risk rules, and daily routines.',
    learningObjectives: [
      'Draft a comprehensive, written trading plan before entering market hours.',
      'Establish screening criteria to filter actionable stocks from 2,000+ listed equities.',
      'Define clear exit protocols for both profit-taking and defensive stops.'
    ],
    sections: [
      {
        heading: 'The Components of a Complete Plan',
        content: [
          '1. Trading Universe: Only trade stocks that meet strict liquidity criteria (e.g., NIFTY 100 or NIFTY 500 with minimum daily volume of 500,000 shares).',
          '2. Setup Definition: Precise technical or fundamental conditions required before pulling the trigger.',
          '3. Risk Parameters: Maximum 1% risk per trade; maximum 3% loss limit per trading day.',
          '4. Exit Strategy: Target levels, trailing criteria, and time-based exits if price stagnates.'
        ]
      },
      {
        heading: 'Daily Operational Routine',
        content: [
          'Pre-Market (8:30 - 9:00 AM IST): Review global cues (GIFT Nifty, Asian markets), macroeconomic events, and corporate announcements.',
          'Market Session (9:15 AM - 3:30 PM IST): Execute only setups conforming to written criteria. Refrain from chasing random social media tips.',
          'Post-Market (3:45 - 4:15 PM IST): Update trading journal, record metrics, and screen watchlists for tomorrow\'s potential setups.'
        ],
        example: {
          title: 'Illustrative Example: "No Setup, No Trade"',
          scenario: 'During a volatile day, none of the 10 stocks on your watchlist meet your written entry criteria.',
          analysis: 'A disciplined trader sits on cash with zero trades placed. Cash is a valid position that protects capital when market conditions lack edge.'
        },
        tip: 'If your trading plan is not written down, you do not have a plan—you have a wish list.'
      }
    ],
    keyTakeaways: [
      'A written plan removes ambiguity and emotional impulses during market hours.',
      'Define trade universe, entry criteria, stop rules, and maximum daily drawdown limits.',
      'Sitting in cash when setups are absent is a hallmark of professional discipline.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'What should a disciplined trader do when no stocks meet the written criteria in their trading plan?',
        options: [
          'Lower standards and take random trades out of boredom',
          'Remain in cash and wait patiently for valid setups',
          'Triple position size on speculative options',
          'Trade penny stocks'
        ],
        correctIndex: 1,
        explanation: 'Being in cash is a legitimate position; disciplined traders only deploy capital when market conditions align with their proven rules.'
      }
    ],
    relatedLessonIds: ['how-to-review-a-trade', 'common-beginner-trading-mistakes']
  },
  {
    id: 'common-beginner-trading-mistakes',
    title: 'Common Beginner Trading Mistakes and How to Avoid Them',
    slug: 'common-beginner-trading-mistakes',
    category: 'Practical Trading',
    difficulty: 'Beginner',
    readingTimeMinutes: 7,
    summary: 'Recognize the most common pitfalls that trip up novice traders in the Indian stock market and learn how to sidestep them.',
    learningObjectives: [
      'Avoid chasing unverified social media stock "tips" and Telegram pump schemes.',
      'Understand the hidden danger of over-leveraged intraday margins and naked options.',
      'Stop averaging down on falling speculative stocks.'
    ],
    sections: [
      {
        heading: 'The Social Media "Tip" Trap',
        content: [
          'Novice traders often join informal messaging groups promising guaranteed daily returns or multi-bagger breakout alerts.',
          'SEBI investigations frequently uncover pump-and-dump operators using these channels to dump shares onto unsuspecting retail buyers.',
          'Commit to conducting your own research using concrete data and CapitalMind\'s analytics before risking capital.'
        ]
      },
      {
        heading: 'Averaging Down on Falling Knives',
        content: [
          'Buying more shares as price collapses to lower average cost is dangerous in fundamentally broken companies.',
          'While averaging down can work for index ETFs over years, averaging down on weak individual companies magnifies losses when the stock continues heading lower.'
        ],
        example: {
          title: 'Illustrative Example: The Risk of Averaging Down on Distressed Stocks',
          scenario: 'An investor buys a speculative stock at ₹100. It falls to ₹70, and they buy more to average down to ₹85. It falls to ₹40, and they buy more.',
          analysis: 'Because the fundamental business was deteriorating, the stock eventually slides to ₹10. Averaging down concentrated ever-increasing amounts of capital into a failing asset.'
        },
        tip: 'If your initial buy thesis has been invalidated, cut the loss rather than throwing good money after bad.'
      }
    ],
    keyTakeaways: [
      'Never trade based on unsolicited tips or social media hype.',
      'Do not average down on speculative stocks when the underlying trend is firmly down.',
      'Avoid unhedged leverage and high-risk derivatives until you master spot equity basics.'
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Why is averaging down on a speculative, deteriorating stock dangerous for retail traders?',
        options: [
          'It guarantees automatic dividends',
          'It concentrates greater capital into a failing position as losses compound',
          'It automatically closes the Demat account',
          'Brokers ban averaging down'
        ],
        correctIndex: 1,
        explanation: 'Averaging down on a declining stock exposes larger portions of your capital to a position whose price trend is moving against you.'
      }
    ],
    relatedLessonIds: ['building-a-disciplined-trading-plan', 'trading-psychology-mindset']
  }
];

export const LEARN_CATEGORIES = [
  'All',
  'Investing Basics',
  'Technical Analysis',
  'Fundamental Analysis',
  'Risk Management',
  'Practical Trading'
] as const;

export const DIFFICULTY_LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const;
