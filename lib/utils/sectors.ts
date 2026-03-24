export const STOCK_SECTORS: Record<string, string[]> = {
  'Technology':       ['AAPL','MSFT','NVDA','AVGO','ORCL','CRM','ADBE','AMD','CSCO','QCOM','INTC','NOW','PLTR','PANW','SNPS','CDNS','MRVL','KLAC','LRCX','AMAT','MU','ADI','FTNT','WDAY','TEAM','CRWD','DDOG','ZS','HUBS','ANSS'],
  'Finance':          ['JPM','V','MA','BAC','GS','MS','BLK','SCHW','C','AXP','BRK.B','WFC','SPGI','ICE','CME','PGR','USB','MMC','CB','AON','MET','AIG','PRU','TRV','PNC','COF','PYPL','AJG','FITB','FIS'],
  'Healthcare':       ['UNH','LLY','JNJ','ABBV','MRK','TMO','ABT','PFE','AMGN','MDT','ISRG','DHR','BMY','GILD','CVS','CI','ELV','VRTX','REGN','ZTS','BDX','BSX','SYK','HCA','MCK','A','DXCM','IQV','IDXX','EW'],
  'Consumer Disc.':   ['AMZN','TSLA','HD','NKE','MCD','LOW','SBUX','TJX','BKNG','CMG','ABNB','MAR','RCL','ORLY','AZO','ROST','DHI','LEN','YUM','DPZ','LULU','ULTA','DECK','GM','F','EBAY','ETSY','CPRT','BBY','GRMN'],
  'Consumer Staples': ['PG','KO','PEP','COST','WMT','PM','MO','CL','MDLZ','KHC','GIS','STZ','MNST','KR','SYY','HSY','ADM','TAP','CAG','SJM','CLX','CHD','K','TSN','HRL','MKC','BG','LAMB','CPB','WBA'],
  'Industrial':       ['CAT','GE','HON','UPS','BA','RTX','LMT','DE','UNP','FDX','WM','ETN','ITW','EMR','GD','NOC','TDG','CSX','NSC','CARR','JCI','IR','PH','PCAR','CTAS','FAST','GWW','VRSK','ROK','SWK'],
  'Communication':    ['GOOGL','META','NFLX','DIS','CMCSA','T','VZ','TMUS','CHTR','SPOT','RBLX','EA','TTWO','WBD','PARA','LYV','MTCH','PINS','ZM','SNAP','ROKU','OMC','IPG','FOXA','NWSA'],
  'Energy':           ['XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','OXY','HAL','DVN','FANG','HES','BKR','KMI','WMB','OKE','TRGP','LNG','MRO','CTRA','EQT','APA','WFRD','FTI'],
  'Real Estate':      ['AMT','PLD','CCI','EQIX','PSA','SPG','O','WELL','DLR','AVB','EQR','VICI','IRM','ARE','KIM','ESS','MAA','REG','UDR','HST','CPT','BXP','PEAK','SUI','EXR'],
  'Materials':        ['LIN','APD','SHW','ECL','FCX','NEM','NUE','DOW','DD','VMC','MLM','PPG','IFF','CE','ALB','EMN','FMC','IP','PKG','AVY','SEE','CF','MOS','BALL','AMCR'],
  'Utilities':        ['NEE','DUK','SO','D','AEP','SRE','EXC','XEL','ED','WEC','ES','AWK','ATO','CMS','DTE','PEG','FE','PPL','EIX','ETR','CEG','EVRG','NI','LNT','AES'],
}

// Maps sector display names to the normalized sector label used in portfolio views
// (Consumer Disc. and Consumer Staples both collapse to 'Consumer')
const SECTOR_NORMALIZE: Record<string, string> = {
  'Consumer Disc.':   'Consumer',
  'Consumer Staples': 'Consumer',
}

export const TICKER_SECTOR: Record<string, string> = Object.fromEntries(
  Object.entries(STOCK_SECTORS).flatMap(([sector, tickers]) =>
    tickers.map((ticker) => [ticker, SECTOR_NORMALIZE[sector] ?? sector])
  )
)

export const SECTOR_ORDER: string[] = [
  'Technology', 'Finance', 'Healthcare', 'Consumer', 'Industrial',
  'Communication', 'Energy', 'Real Estate', 'Materials', 'Utilities',
]

export const ALL_TOP_PICKS: string[] = [
  'AAPL','MSFT','NVDA','AVGO','ORCL',          // Technology
  'JPM','V','MA','BAC','BRK.B',                 // Finance
  'UNH','LLY','JNJ','ABBV','MRK',              // Healthcare
  'AMZN','TSLA','HD','NKE','MCD',              // Consumer Disc.
  'PG','KO','PEP','COST','WMT',                // Consumer Staples
  'CAT','GE','HON','UPS','RTX',                // Industrial
  'GOOGL','META','NFLX','DIS','CMCSA',         // Communication
  'XOM','CVX','COP','SLB','EOG',               // Energy
  'AMT','PLD','EQIX','PSA','SPG',              // Real Estate
  'LIN','APD','SHW','ECL','FCX',               // Materials
  'NEE','DUK','SO','D','AEP',                  // Utilities
]
