export interface VillaModel {
  id: string;
  name: string;
  subtitle: string;
  heightGroup: '90' | '120' | '150' | '180';
  heightGroupLabel: string;
  dimensions: {
    height: number;
    depth: number;
    length: number;
    dimensionCode: string; // e.g. "90-60-60"
  };
  price: number;
  installFee: number;
  image: string;
  styleVariant?: string;
  includedAccessories: string[];
  recommendedCats: string;
  suitableSpace: string;
  highlights: string[];
  description: string;
  badge?: string;
}

export interface MenuItemPrice {
  dimensionCode: string;
  height: number;
  depth: number;
  length: number;
  price: number;
  installFee: number;
  bundledNote?: string;
}

export interface MenuCategory {
  length: number;
  title: string;
  originalImage: string;
  items: MenuItemPrice[];
}

export interface AccessoryOption {
  id: string;
  name: string;
  price: number;
  description: string;
  iconName: string;
}

export interface ShowcasePhoto {
  id: string;
  title: string;
  sizeCategory: '60' | '90' | '120' | '150' | '180' | 'custom';
  dimensionsText: string;
  imageUrl: string;
  customerNote: string;
  date: string;
  tags: string[];
  isCustomUpload?: boolean;
}

export interface TravelFeeRegion {
  id: string;
  name: string;
  group: '中部 (門店周邊)' | '北部地區' | '南部地區' | '東部/偏遠專案';
  distanceKm: number;
  highwayKm: number;
  rawTotalFee: number;
  recommendedFee: number;
  badge?: string;
  note?: string;
}

export const STORE_INFO = {
  name: '花花招財貓',
  logoImage: '/assets/aistudio/logo_6994c231.jpg',
  englishName: 'Hua Hua Lucky Cat Custom Wooden Cat Villas',
  tagline: '天然松木無甲醛 · 實木厚度足1.5cm · 手工全套客製 · 新竹物流直送',
  address: '臺中市豐原區圓環西路97號',
  phone: '0966129569',
  phoneDisplay: '0966-129-569',
  lineId: 'hhcat.cc',
  lineUrl: 'https://line.me/ti/p/~hhcat.cc',
  lineQrCode: '/assets/aistudio/0de9e862303e70fdda9f035697e8148_6fe2aca5.jpg',
  storefrontImage: '/assets/aistudio/e269d794a175cea7aa119b02589895a_32dbfebe.jpg',
  travelFeeSheetImage: '/assets/aistudio/image_1f5360da.png',
  googleMapsUrl: 'https://maps.google.com/?q=' + encodeURIComponent('臺中市豐原區圓環西路97號 花花招財貓'),
  facebookName: '花花招財貓｜客製化實木貓別墅/貓櫃/貓籠',
  facebookUrl: 'https://www.facebook.com/search/top?q=' + encodeURIComponent('花花招財貓'),
  instagramHandle: 'hhcat.1226',
  instagramUrl: 'https://www.instagram.com/hhcat.1226',
  threadsUrl: 'https://www.threads.net/@hhcat.1226',
  storeNotice: '門店來訪須提前預約！店長有時外出到府組裝不在店內，提前預約避免跑空。',
  boardThickness: '全純實木板厚度皆為 1.5cm，真材實料耐用多年，杜絕市面劣質碎木膠合板。',
  customPhotoNotice: '支援 1:1 依圖客製：您可以將在網路上看到的照片或喜歡的款式發給我，依照照片為您量身打造！',
  customSizeNotice: '客製化高度、深度、長度皆可隨意修改；若現場無電梯需爬樓梯搬運，需額外報備並收取樓層費，具體請加 LINE 諮詢。',
  productionDays: '手工客製完成後工廠直寄台灣，約 14-21 天宅配到府（免運費不包含偏遠地區還有離島）',
  shippingPolicy: '新竹物流配送至一樓（免運不包含偏遠地區還有離島）。',
  warrantyText: '享 1 年保固（憑到貨拆箱全程錄影非人為損壞免費補發更換零件）。',
  assemblyVideoNote: '提供店長本人親自拍攝入鏡示範的組裝教學影片，步驟清楚易懂！',
  hours: '週一至週日 10:00 - 21:00（門店展示倉儲中心，店長常外出到府組裝，來店請務必提前預約）'
};

export const GUARANTEES = [
  {
    id: 'g1',
    title: '100% 手工全套客製化',
    description: '隔層跳台、自由門、太空艙、通天柱均可隨心自由配置。',
    icon: 'Hammer'
  },
  {
    id: 'g2',
    title: '天然松木無甲醛＋微防水漆',
    description: '堅持嚴選天然無甲醛松木，表面上些許環保防水漆保護木質。',
    icon: 'ShieldCheck'
  },
  {
    id: 'g3',
    title: '高透耐磨安全壓克力',
    description: '高清透亮、防撞耐刮輕盈安全，隨時欣賞愛貓萌態。',
    icon: 'Sparkles'
  },
  {
    id: 'g4',
    title: '新竹物流免運直送＋預組裝拍照',
    description: '工廠在大陸製作完後直寄台灣免運（不含偏遠），出貨前預組裝拍照確認。',
    icon: 'Truck'
  }
];

export const TRAVEL_FEE_REGIONS: TravelFeeRegion[] = [
  {
    id: 'tf-taichung',
    name: '臺中市區 / 豐原門店周邊',
    group: '中部 (門店周邊)',
    distanceKm: 20,
    highwayKm: 0,
    rawTotalFee: 200,
    recommendedFee: 200,
    badge: '門店在地特惠',
    note: '豐原在地出發超快速，20km親民特惠價'
  },
  {
    id: 'tf-miaoli-changhua-nantou',
    name: '彰化縣 / 苗栗縣 / 南投縣',
    group: '中部 (門店周邊)',
    distanceKm: 50,
    highwayKm: 40,
    rawTotalFee: 596,
    recommendedFee: 500,
    badge: '鄰近補貼價',
    note: '鄰近中彰投苗親民優惠，店長吸收零頭'
  },
  {
    id: 'tf-yunlin',
    name: '雲林縣',
    group: '南部地區',
    distanceKm: 80,
    highwayKm: 70,
    rawTotalFee: 944,
    recommendedFee: 900,
    note: '預估單趟 80km，店長吸收國道與耗損'
  },
  {
    id: 'tf-hsinchu',
    name: '新竹縣市',
    group: '北部地區',
    distanceKm: 80,
    highwayKm: 70,
    rawTotalFee: 944,
    recommendedFee: 900,
    badge: '店長吸收零頭',
    note: '原試算 944 元，店長吸收零頭收 900 元'
  },
  {
    id: 'tf-taoyuan',
    name: '桃園市區',
    group: '北部地區',
    distanceKm: 110,
    highwayKm: 100,
    rawTotalFee: 1316,
    recommendedFee: 1200,
    note: '預估單趟 110km，店長吸收部分國道費'
  },
  {
    id: 'tf-chiayi',
    name: '嘉義縣市',
    group: '南部地區',
    distanceKm: 110,
    highwayKm: 100,
    rawTotalFee: 1316,
    recommendedFee: 1300,
    badge: '店長吸收零頭',
    note: '原試算 1,316 元，店長吸收零頭收 1,300 元'
  },
  {
    id: 'tf-taipei-newtaipei',
    name: '臺北市區 / 新北市區 (雙北)',
    group: '北部地區',
    distanceKm: 150,
    highwayKm: 130,
    rawTotalFee: 1788,
    recommendedFee: 1700,
    badge: '店長吸收零頭',
    note: '原試算 1,788 元，店長吸收零頭收 1,700 元'
  },
  {
    id: 'tf-keelung',
    name: '基隆市區',
    group: '北部地區',
    distanceKm: 175,
    highwayKm: 155,
    rawTotalFee: 2072,
    recommendedFee: 1900,
    note: '北端單趟 175km，親民補貼價 1,900 元'
  },
  {
    id: 'tf-tainan',
    name: '臺南市區',
    group: '南部地區',
    distanceKm: 160,
    highwayKm: 150,
    rawTotalFee: 1936,
    recommendedFee: 1900,
    badge: '店長吸收零頭',
    note: '原試算 1,936 元，店長吸收零頭收 1,900 元'
  },
  {
    id: 'tf-kaohsiung',
    name: '高雄市區',
    group: '南部地區',
    distanceKm: 200,
    highwayKm: 190,
    rawTotalFee: 2432,
    recommendedFee: 2400,
    badge: '店長吸收零頭',
    note: '原試算 2,432 元，店長吸收零頭收 2,400 元'
  },
  {
    id: 'tf-pingtung-city',
    name: '屏東市區',
    group: '南部地區',
    distanceKm: 260,
    highwayKm: 230,
    rawTotalFee: 3152,
    recommendedFee: 3000,
    note: '預估單趟 260km，親民補貼收取 3,000 元'
  },
  {
    id: 'tf-kenting',
    name: '屏東墾丁 / 恆春地區',
    group: '南部地區',
    distanceKm: 320,
    highwayKm: 260,
    rawTotalFee: 3800,
    recommendedFee: 3800,
    note: '預估單趟 320km，國道來回 600 元，收取 3,800 元'
  },
  {
    id: 'tf-remote',
    name: '宜蘭 / 花蓮 / 台東 / 偏遠山區',
    group: '東部/偏遠專案',
    distanceKm: 0,
    highwayKm: 0,
    rawTotalFee: 0,
    recommendedFee: 0,
    badge: '專案實報',
    note: '偏遠地區車馬費依實際路程與過路費專案報價，請加 LINE 諮詢'
  }
];

export const DISCLAIMER_NOTICES = {
  preAssemble: {
    title: '完工確認',
    badge: '出貨拍照確認',
    content:
      '出貨前，我會先進行預組裝並拍攝照片（固定版型除外），透過 LINE 與您確認無誤後才會妥善加固打包出貨，讓您遠端安心驗貨。'
  },
  toolsNotice: {
    title: '組裝工具提醒（重要）',
    badge: '建議自備工具',
    content:
      '大型貓別墅組裝具一定挑戰性。為維持結構穩固與客製化彈性，板材僅預留「主要結構」孔洞，部分細部鎖點需自行定位。強烈建議您準備「電動螺絲起子」，並搭配由店長本人親自拍攝入鏡的教學影片進行。若遇困難，群內客服會隨時為您提供線上技術支援！'
  },
  shippingNotice: {
    title: '物流配送說明（新竹物流）',
    badge: '送至一樓 · 免運不含偏遠與離島',
    content:
      '工廠在大陸，製作完成後運送到台灣，享有免運費服務（免運不包含偏遠地區還有離島）。大型傢俱使用的是新竹物流，原則上僅配送至一樓，敬請見諒。物流運輸過程中若有極輕微的摩擦痕跡，或板材本身的自然木紋、微小結痂，屬於自然原木現象，不影響整體結構與美觀。'
  },
  warrantyNotice: {
    title: '售後保固承諾',
    badge: '1 年保固安心購',
    content:
      '享有自到貨日起 1 年保固。為保障您的權益，收貨拆箱時請務必「全程錄影」。期間內若有板材或五金損壞（非人為因素），皆可憑拆箱錄影影片免費補發全新板材或五金更換！'
  }
};

export const FEATURED_MODELS: VillaModel[] = [
  // --- 高 90cm 系列 ---
  {
    id: 'm-90-60-60',
    name: 'A款（90-60-60）',
    subtitle: '天然松木無甲醛 · 靜音萬向輪 · 側邊格柵通風',
    heightGroup: '90',
    heightGroupLabel: '高 90cm 系列',
    dimensions: { height: 90, depth: 60, length: 60, dimensionCode: '90-60-60' },
    price: 5500,
    installFee: 2000,
    image: '/assets/aistudio/90-60-60_f18b59e3.jpg',
    styleVariant: '標準款',
    includedAccessories: ['安全造型柵欄', '透氣格柵孔', '靜音煞車萬向輪'],
    recommendedCats: '1 隻成貓 / 幼貓小獨立套房',
    suitableSpace: '套房角落、臥室床邊、客廳電視旁',
    highlights: ['面寬 60cm 超好擺放', '高透耐磨壓克力門', '純實木板厚度足 1.5cm'],
    description: '輕巧省空間的小資單貓別墅，頂層設有可愛貓頭孔與透氣圍欄。',
    badge: '熱賣入門',
  },
  {
    id: 'm-90-60-90-a',
    name: 'B款（90-60-90）',
    subtitle: '雙開壓克力門 · 實木爬梯 · 靜音萬向輪',
    heightGroup: '90',
    heightGroupLabel: '高 90cm 系列',
    dimensions: { height: 90, depth: 60, length: 90, dimensionCode: '90-60-90' },
    price: 7500,
    installFee: 2500,
    image: '/assets/aistudio/90-60-90_c0bac971.jpg',
    styleVariant: '階梯版',
    includedAccessories: ['雙開壓克力門', '實木緩坡階梯', '二樓圍欄平台', '靜音煞車萬向輪'],
    recommendedCats: '1 - 2 隻貓咪',
    suitableSpace: '客廳電視櫃旁、書房景觀牆',
    highlights: ['90cm 寬幅雙開門設計', '坡道適合短腿貓與幼貓', '頂部可置物'],
    description: '90cm 面寬雙門款，右側配備貼心實木攀爬階梯，即使曼赤肯或幼貓也能輕鬆自如漫步二樓。',
    badge: '雙門暢銷',
  },
  {
    id: 'm-90-60-90-b',
    name: 'B1款（90-60-90）',
    subtitle: '雙開壓克力門 · 垂直劍麻抓柱 · 靈動跳板',
    heightGroup: '90',
    heightGroupLabel: '高 90cm 系列',
    dimensions: { height: 90, depth: 60, length: 90, dimensionCode: '90-60-90' },
    price: 7500,
    installFee: 2500,
    image: '/assets/aistudio/B90-60-90_dc78aa1a.jpg',
    styleVariant: '抓柱版',
    includedAccessories: ['雙開壓克力門', '天然劍麻磨爪柱', '貓頭休息房', '安全造型柵欄'],
    recommendedCats: '1 - 2 隻貓咪',
    suitableSpace: '客廳過道、主臥景觀窗前',
    highlights: ['垂直抓柱結合休息平台', '雙開門清理貓砂極便利', '純實木板厚度 1.5cm'],
    description: '配置下層劍麻貓抓支柱與跳躍平台，貓咪磨爪運動與高處俯瞰一氣呵成，日常清潔開門超省力。',
    badge: '經典首選',
  },

  // --- 高 120cm 系列 ---
  {
    id: 'm-120-60-60',
    name: 'C款（120-60-60）',
    subtitle: '高120cm 垂直躍升 · 貓頭休息房 · 靈巧立體動線',
    heightGroup: '120',
    heightGroupLabel: '高 120cm 系列',
    dimensions: { height: 120, depth: 60, length: 60, dimensionCode: '120-60-60' },
    price: 6500,
    installFee: 2500,
    image: '/assets/aistudio/120-60-60_587a0b85.jpg',
    styleVariant: '標準款',
    includedAccessories: ['單開大片壓克力門', '二樓圍欄平台', '貓頭休息房', '底部萬向輪'],
    recommendedCats: '1 - 2 隻貓咪',
    suitableSpace: '小坪數客廳、主臥角落',
    highlights: ['1.2米垂直視野', '佔地面積小、高度充裕', '兩側通風百葉格柵'],
    description: '挑高120公分讓小宅也能享有三層立體動線，貓咪最愛在頂層貓頭休息房打盹曬暖陽。',
    badge: '高挑省空間',
  },
  {
    id: 'm-120-60-90-a',
    name: 'D款（120-60-90）',
    subtitle: '高120 x 長90 cm · 雙門大視野 · 實木斜梯',
    heightGroup: '120',
    heightGroupLabel: '高 120cm 系列',
    dimensions: { height: 120, depth: 60, length: 90, dimensionCode: '120-60-90' },
    price: 8500,
    installFee: 3000,
    image: '/assets/aistudio/120-60-90_d44f97fc.jpg',
    styleVariant: '階梯版',
    includedAccessories: ['全景雙開壓克力門', '實木緩坡階梯', '貓頭休息房', '底部萬向輪'],
    recommendedCats: '2 隻成貓',
    suitableSpace: '客廳主位、書房走道',
    highlights: ['多層次立體平台', '高透安全壓克力', '松木無甲醛上防水漆'],
    description: '店內最具性價比的黃金尺寸！兼具縱向高度與90cm大面寬，斜梯連通上下樓，雙貓生活更愜意。',
    badge: '人氣首選',
  },
  {
    id: 'm-120-60-90-b',
    name: 'D1款（120-60-90）',
    subtitle: '高120 x 長90 cm · 雙開透明壓克力門 · 貓頭休息房',
    heightGroup: '120',
    heightGroupLabel: '高 120cm 系列',
    dimensions: { height: 120, depth: 60, length: 90, dimensionCode: '120-60-90' },
    price: 8500,
    installFee: 3000,
    image: '/assets/aistudio/B120-60-90_c49b37e1.jpg',
    styleVariant: '雙開門版',
    includedAccessories: ['雙開透明壓克力門', '貓頭休息房', '獨立如廁貓砂盆空間', '靜音煞車萬向輪'],
    recommendedCats: '2 隻成貓',
    suitableSpace: '客廳旁、陽台遮陽處',
    highlights: ['純實木板厚度足 1.5cm', '貓頭休息房高空休憩', '雙開門大開口清砂便'],
    description: '挑高120公分搭配90公分面寬，頂層設有溫馨貓頭休息房，底層好放貓砂盆，雙開門通透好打理。',
    badge: '雙開門首選',
  },
  {
    id: 'm-120-60-120-a',
    name: 'E款（120-60-120）',
    subtitle: '高120 x 長120 cm · 1.2米面寬 · 寬敞大空間',
    heightGroup: '120',
    heightGroupLabel: '高 120cm 系列',
    dimensions: { height: 120, depth: 60, length: 120, dimensionCode: '120-60-120' },
    price: 10800,
    installFee: 3500,
    image: '/assets/aistudio/120-60-120_132a6421.jpg',
    styleVariant: '大面寬版',
    includedAccessories: ['大面寬雙開門', '可容納大砂盆+雙食盆', '靈動實木跳台', '貓頭休息房'],
    recommendedCats: '2 - 3 隻貓咪',
    suitableSpace: '客廳中央、專屬寵物房',
    highlights: ['120cm 超寬視野', '多隻貓咪同樂不打架', '天然松木無甲醛'],
    description: '長度達到120公分的大器別墅，內部空間極度充裕，擺放超大封閉式貓砂盆後依然有充沛活動空間。',
    badge: '多貓熱賣',
  },
  {
    id: 'm-120-60-120-b',
    name: 'E1款（120-60-120）',
    subtitle: '高120 x 長120 cm · 雙貓頭休息房 · 雙層大平台',
    heightGroup: '120',
    heightGroupLabel: '高 120cm 系列',
    dimensions: { height: 120, depth: 60, length: 120, dimensionCode: '120-60-120' },
    price: 10800,
    installFee: 3500,
    image: '/assets/aistudio/B120-60-120_0e734dd8.jpg',
    styleVariant: '雙休息房版',
    includedAccessories: ['頂層對稱雙貓頭休息房', '大通透壓克力門', '中央雙開門大通道', '靜音煞車輪'],
    recommendedCats: '2 - 3 隻貓咪',
    suitableSpace: '客廳沙發旁、多貓住宅',
    highlights: ['雙貓各自擁有獨立休息房', '橫向伸展無拘無束', '防水漆保護日常易擦拭'],
    description: '頂層規劃兩間對稱的可愛貓頭休息房，雙貓家庭一人一間互不爭搶，是多貓和睦相處的利器。',
    badge: '多貓同樂',
  },

  // --- 高 150cm 系列 ---
  {
    id: 'm-150-60-60',
    name: 'F款（150-60-60）',
    subtitle: '高150 x 長60 cm · 1.5米立體高空視野',
    heightGroup: '150',
    heightGroupLabel: '高 150cm 系列',
    dimensions: { height: 150, depth: 60, length: 60, dimensionCode: '150-60-60' },
    price: 9800,
    installFee: 3500,
    image: '/assets/aistudio/150-60-60_bc590492.jpg',
    styleVariant: '標準款',
    includedAccessories: ['三層實木躍升平台', '高挑壓克力門', '頂層造型護欄', '劍麻抓柱'],
    recommendedCats: '1 - 2 隻貓咪',
    suitableSpace: '挑高套房、樓梯轉角、窄牆面',
    highlights: ['極致佔地坪效', '高挑1.5米視野極佳', '通風格柵設計'],
    description: '1.5米高度極限利用垂直空間，底部容納貓砂盆，中層飛撲磨爪，頂層享受至高無上的巡邏樂趣。',
    badge: '高挑纖細',
  },
  {
    id: 'm-150-60-90-a',
    name: 'G款（150-60-90）',
    subtitle: '高150 x 長90 cm · 挑高大空間 · 貓頭休息房',
    heightGroup: '150',
    heightGroupLabel: '高 150cm 系列',
    dimensions: { height: 150, depth: 60, length: 90, dimensionCode: '150-60-90' },
    price: 11500,
    installFee: 4000,
    image: '/assets/aistudio/150-60-90_4f890318.jpg',
    styleVariant: '標準挑高版',
    includedAccessories: ['貓頭休息房', '大開口雙開壓克力門', '實木活動跳台', '底部大容量貓砂盆位'],
    recommendedCats: '2 - 3 隻貓咪',
    suitableSpace: '客廳主位、寵物房',
    highlights: ['高度150cm大氣巍峨', '純實木板厚度足 1.5cm', '免運不含偏遠與離島'],
    description: '1.5米高挑空間讓貓咪享受三層高空巡邏樂趣，大開口雙門日常換砂打掃極致省力便利。',
    badge: '高挑首選',
  },
  {
    id: 'm-150-60-90-b',
    name: 'G1款（150-60-90）',
    subtitle: '高150 x 長90 cm · 附安全造型柵欄 · 雙開門設計',
    heightGroup: '150',
    heightGroupLabel: '高 150cm 系列',
    dimensions: { height: 150, depth: 60, length: 90, dimensionCode: '150-60-90' },
    price: 11500,
    installFee: 4000,
    image: '/assets/aistudio/B150-60-90_7092476a.jpg',
    styleVariant: '柵欄休憩版',
    includedAccessories: ['安全造型柵欄*1', '貓頭休息房', '實木躍升平台', '大面寬雙開門'],
    recommendedCats: '2 - 3 隻貓咪',
    suitableSpace: '客廳、家庭多貓活動區',
    highlights: ['標配安全造型柵欄', '貓砂盆空間隱蔽寬敞', '松木無甲醛溫潤安全'],
    description: '配置安全造型柵欄，防止貓咪睡覺翻滾，純實木1.5cm板材堅固耐用，多貓生活悠閒自在。',
    badge: '安心柵欄款',
  },
  {
    id: 'm-150-60-120-a',
    name: 'H款（150-60-120）',
    subtitle: '高150 x 長120 cm · 附通天柱*1 柵欄*1',
    heightGroup: '150',
    heightGroupLabel: '高 150cm 系列',
    dimensions: { height: 150, depth: 60, length: 120, dimensionCode: '150-60-120' },
    price: 13800,
    installFee: 4500,
    image: '/assets/aistudio/150-60-120_ff9034d7.jpg',
    styleVariant: '階梯抓柱版',
    includedAccessories: ['附厚實通天柱*1', '安全造型柵欄*1', '寬幅斜梯', '四層活動動線'],
    recommendedCats: '2 - 4 隻貓咪',
    suitableSpace: '大客廳、專屬貓房、貓舍',
    highlights: ['高150 x 長120 旗艦比例', '通天柱直穿上下層', '免運不含偏遠與離島'],
    description: '真正的旗艦級配置！內建通天柱與造型柵欄，120cm 面寬讓多隻貓咪能同時在上層眺望、下層跑酷。',
    badge: '旗艦霸主',
  },
  {
    id: 'm-150-60-120-b',
    name: 'H1款（150-60-120）',
    subtitle: '高150 x 長120 cm · 雙貓頭休息房 · 空中木吊橋',
    heightGroup: '150',
    heightGroupLabel: '高 150cm 系列',
    dimensions: { height: 150, depth: 60, length: 120, dimensionCode: '150-60-120' },
    price: 13800,
    installFee: 4500,
    image: '/assets/aistudio/B150-60-120_5aeb586e.jpg',
    styleVariant: '雙休息房吊橋版',
    includedAccessories: ['附通天柱*1', '安全造型柵欄*1', '高空浪漫吊橋', '雙貓頭休息房'],
    recommendedCats: '2 - 4 隻貓咪',
    suitableSpace: '大坪數客廳、寵物咖啡廳',
    highlights: ['空中吊橋趣味滿分', '左右分區獨立套房', '全透明高透壓克力'],
    description: '配有精緻木造空中吊橋與上下兩座貓頭休息房，如同小型主題樂園，看著貓咪過吊橋模樣超級療癒。',
    badge: '夢幻吊橋',
  },
  {
    id: 'm-150-60-150-a',
    name: 'I款（150-60-150）',
    subtitle: '高150 x 長150 cm · 3門大開口 · 附通天柱+安全造型柵欄',
    heightGroup: '150',
    heightGroupLabel: '高 150cm 系列',
    dimensions: { height: 150, depth: 60, length: 150, dimensionCode: '150-60-150' },
    price: 19800,
    installFee: 6000,
    image: '/assets/aistudio/150-60-150_c0c982c9.jpg',
    styleVariant: '三門大開口版',
    includedAccessories: ['附通天柱*1', '附安全造型柵欄*1', '三扇獨立壓克力門', '多層貓頭休息房'],
    recommendedCats: '3 - 5 隻貓咪',
    suitableSpace: '豪宅客廳、多貓家庭、專業育種貓舍',
    highlights: ['長達 1.5 米震撼面寬', '三扇大門通風無死角', '標配通天柱與安全造型柵欄'],
    description: '1.5米平方的超狂城堡！出廠標配贈送通天柱與安全造型柵欄，三扇門各自開闔，分區整理最輕鬆。',
    badge: '尊爵三門',
  },
  {
    id: 'm-150-60-150-b',
    name: 'I1款（150-60-150）',
    subtitle: '高150 x 長150 cm · 附通天柱+安全造型柵欄 · 空中吊橋',
    heightGroup: '150',
    heightGroupLabel: '高 150cm 系列',
    dimensions: { height: 150, depth: 60, length: 150, dimensionCode: '150-60-150' },
    price: 19800,
    installFee: 6000,
    image: '/assets/aistudio/B150-60-150_8a26d08b.jpg',
    styleVariant: '三門全能吊橋版',
    includedAccessories: ['附通天柱*1', '附安全造型柵欄*1', '空中吊橋', '三扇獨立壓克力門'],
    recommendedCats: '3 - 5 隻貓咪',
    suitableSpace: '整面客廳主景觀牆、商業展示空間',
    highlights: ['如微型原木遊樂園', '純實木板厚度 1.5cm', '出貨預組裝拍照確認'],
    description: '花花招財貓熱賣頂規款式！標配通天柱、安全造型柵欄與空中吊橋漫步，滿足所有挑剔貓咪。',
    badge: '全功能首選',
  },

  // --- 高 180cm 系列 ---
  {
    id: 'm-180-60-120-a',
    name: 'J款（180-60-120）',
    subtitle: '高180 x 長120 cm · 附通天柱*1 柵欄*1 · 上下四門',
    heightGroup: '180',
    heightGroupLabel: '高 180cm 系列',
    dimensions: { height: 180, depth: 60, length: 120, dimensionCode: '180-60-120' },
    price: 15800,
    installFee: 6000,
    image: '/assets/aistudio/180-60-120_d83cbc2e.jpg',
    styleVariant: '上下四門獨立版',
    includedAccessories: ['附通天柱*1', '附安全造型柵欄*1', '上下四組獨立開門', '雙貓頭休息房'],
    recommendedCats: '3 - 5 隻貓咪',
    suitableSpace: '透天別墅、客廳電視旁、挑高空間',
    highlights: ['1.8米霸氣直通天花板', '上下獨立四門開合', '免運不含偏遠與離島'],
    description: '1.8米直立頂天霸主！上下層四門可獨立開啟，下層作為貓砂盆衛生間，上層為高空別墅套房，完全隔離氣味。',
    badge: '1.8米頂天',
  },
  {
    id: 'm-180-60-120-b',
    name: 'J1款（180-60-120）',
    subtitle: '高180 x 長120 cm · 附通天柱*1 柵欄*1 · 上下四組獨立開門',
    heightGroup: '180',
    heightGroupLabel: '高 180cm 系列',
    dimensions: { height: 180, depth: 60, length: 120, dimensionCode: '180-60-120' },
    price: 15800,
    installFee: 6000,
    image: '/assets/aistudio/B180-60-120_c81f8495.jpg',
    styleVariant: '上下四門款',
    includedAccessories: ['附通天柱*1', '附安全造型柵欄*1', '上下四組獨立開門', '通透壓克力門片'],
    recommendedCats: '3 - 5 隻貓咪',
    suitableSpace: '客廳旁、陽台透天客廳',
    highlights: ['上下四組獨立開門', '附通天柱與安全造型柵欄', '1年非人為保固'],
    description: '升級上下四組獨立門片，上層生活起居、下層如廁清潔各自獨立互不干擾，標配通天柱與安全造型柵欄。',
    badge: '四門人氣款',
  },
  {
    id: 'm-180-60-120-c',
    name: 'J2款（180-60-120）',
    subtitle: '高180 x 長120 cm · 附通天柱*1 柵欄*1 · 高空吊橋+上下四門',
    heightGroup: '180',
    heightGroupLabel: '高 180cm 系列',
    dimensions: { height: 180, depth: 60, length: 120, dimensionCode: '180-60-120' },
    price: 15800,
    installFee: 6000,
    image: '/assets/aistudio/C180-60-120_080ab68b.jpg',
    styleVariant: '吊橋四門全配版',
    includedAccessories: ['附通天柱*1', '附安全造型柵欄*1', '高空弧形空中吊橋', '上下四組獨立開門'],
    recommendedCats: '3 - 5 隻貓咪',
    suitableSpace: '客廳主位、大空間透天',
    highlights: ['1.8米頂天視野', '頂部空中吊橋極為吸睛', '上下四組獨立開門便捷清理'],
    description: '結合 1.8 米高挑視野、弧形空中吊橋與上下四組獨立開門，頂天立地氣派非凡，全台免運費直寄到府（偏遠與離島除外）。',
    badge: '尊榮旗艦',
  }
];

export const ACCESSORY_OPTIONS: AccessoryOption[] = [
  {
    id: 'acc-drawer',
    name: '實木收納抽屜',
    price: 1500,
    description: '隱藏式大容量抽屜，收納貓罐頭、逗貓棒、零食飼料超整齊，也可以放置貓砂盆，方便更換貓砂',
    iconName: 'Archive'
  },
  {
    id: 'acc-capsule',
    name: '太空艙基礎款（直徑25）',
    price: 1000,
    description: '高透壓克力碗狀太空艙，由下仰望肉球療癒必備',
    iconName: 'Compass'
  },
  {
    id: 'acc-capsule-large',
    name: '太空艙加大款（直徑30）',
    price: 1500,
    description: '加大款直徑30cm，適合大體型貓咪/布偶/緬因貓舒適蜷縮，由下仰望粉嫩肉球',
    iconName: 'Maximize2'
  },
  {
    id: 'acc-acrylic-transparent',
    name: '全透明（透明片）',
    price: 1000,
    description: '左側板或右側板或背板可以更改為透明片，單片價格1000，長度超過60背板是兩片',
    iconName: 'Maximize2'
  },
  {
    id: 'acc-mesh-door',
    name: '透氣金屬網格門',
    price: 1000,
    description: '高硬度環保烤漆金屬網門，極致通風涼爽不易悶熱',
    iconName: 'Grid'
  },
  {
    id: 'acc-free-door',
    name: '自由進出小門',
    price: 800,
    description: '只進不出，只出不進，不進不出，自由進出，四種模式調節',
    iconName: 'DoorOpen'
  },
  {
    id: 'acc-pillar',
    name: '貫穿通天攀爬柱',
    price: 800,
    description: '直通上下樓層的原木立柱，滿足垂直飛撲攀登天性',
    iconName: 'Layers'
  },
  {
    id: 'acc-hammock',
    name: '柔軟實木懸掛吊床',
    price: 500,
    description: '親膚棉麻加厚布料，深陷包覆感極佳的熟睡角落',
    iconName: 'Feather'
  },
  {
    id: 'acc-fence',
    name: '安全造型柵欄',
    price: 300,
    description: '圓角實木護欄，防止睡相差滾落，兼顧造型美感',
    iconName: 'Shield'
  },
  {
    id: 'acc-scratch-post',
    name: '天然劍麻貓抓柱',
    price: 300,
    description: '緊實天然白麻繩纏繞，耐抓不脫線掉毛，耐磨實用',
    iconName: 'Sparkle'
  },
  {
    id: 'acc-bridge',
    name: '空中躍動木造吊橋',
    price: 300,
    description: '串聯左右平台懸索吊橋，增添日常行走冒險樂趣',
    iconName: 'GitCommit'
  },
  {
    id: 'acc-nest',
    name: '半封閉隱私貓窩',
    price: 300,
    description: '給膽小或喜愛幽暗環境貓咪最安心的避風港',
    iconName: 'Home'
  }
];

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    length: 60,
    title: '長度 60cm 系列 (深度固定 60cm)',
    originalImage: '/assets/aistudio/60__1__aa55f053.png',
    items: [
      { dimensionCode: '90-60-60', height: 90, depth: 60, length: 60, price: 5500, installFee: 2000 },
      { dimensionCode: '120-60-60', height: 120, depth: 60, length: 60, price: 6500, installFee: 2500 },
      { dimensionCode: '150-60-60', height: 150, depth: 60, length: 60, price: 9800, installFee: 3500 },
      { dimensionCode: '180-60-60', height: 180, depth: 60, length: 60, price: 11800, installFee: 4500 }
    ]
  },
  {
    length: 90,
    title: '長度 90cm 系列 (深度固定 60cm)',
    originalImage: '/assets/aistudio/90_16a75416.png',
    items: [
      { dimensionCode: '90-60-90', height: 90, depth: 60, length: 90, price: 7500, installFee: 2500 },
      { dimensionCode: '120-60-90', height: 120, depth: 60, length: 90, price: 8500, installFee: 3000 },
      { dimensionCode: '150-60-90', height: 150, depth: 60, length: 90, price: 11500, installFee: 4000, bundledNote: '附安全造型柵欄*1' },
      { dimensionCode: '180-60-90', height: 180, depth: 60, length: 90, price: 13500, installFee: 5000, bundledNote: '附安全造型柵欄*1' }
    ]
  },
  {
    length: 120,
    title: '長度 120cm 系列 (深度固定 60cm)',
    originalImage: '/assets/aistudio/120_8c63ebac.png',
    items: [
      { dimensionCode: '90-60-120', height: 90, depth: 60, length: 120, price: 8800, installFee: 3000 },
      { dimensionCode: '120-60-120', height: 120, depth: 60, length: 120, price: 10800, installFee: 3500 },
      { dimensionCode: '150-60-120', height: 150, depth: 60, length: 120, price: 13800, installFee: 4500, bundledNote: '附通天柱*1、安全造型柵欄*1' },
      { dimensionCode: '180-60-120', height: 180, depth: 60, length: 120, price: 15800, installFee: 6000, bundledNote: '附通天柱*1、安全造型柵欄*1' }
    ]
  },
  {
    length: 150,
    title: '長度 150cm 系列 (深度固定 60cm)',
    originalImage: '/assets/aistudio/150_4c3aaf2d.png',
    items: [
      { dimensionCode: '90-60-150', height: 90, depth: 60, length: 150, price: 12500, installFee: 4000 },
      { dimensionCode: '120-60-150', height: 120, depth: 60, length: 150, price: 14500, installFee: 5000 },
      { dimensionCode: '150-60-150', height: 150, depth: 60, length: 150, price: 19800, installFee: 6000, bundledNote: '附通天柱*1、安全造型柵欄*1' },
      { dimensionCode: '180-60-150', height: 180, depth: 60, length: 150, price: 27800, installFee: 7500, bundledNote: '附通天柱*1、安全造型柵欄*1' }
    ]
  },
  {
    length: 180,
    title: '長度 180cm 系列 (深度固定 60cm)',
    originalImage: '/assets/aistudio/180_0b3dabb4.png',
    items: [
      { dimensionCode: '90-60-180', height: 90, depth: 60, length: 180, price: 14500, installFee: 4500 },
      { dimensionCode: '120-60-180', height: 120, depth: 60, length: 180, price: 16500, installFee: 5500 },
      { dimensionCode: '150-60-180', height: 150, depth: 60, length: 180, price: 27800, installFee: 7500, bundledNote: '附通天柱*1、安全造型柵欄*1' },
      { dimensionCode: '180-60-180', height: 180, depth: 60, length: 180, price: 37800, installFee: 10000, bundledNote: '附通天柱*1、安全造型柵欄*1' }
    ]
  }
];

export const DEPTH_SURCHARGE_TIERS = [
  { id: 'depth-60', label: '標準深度 60cm', depthCm: 60, extraFee: 0, note: '標準黃金深度，擺放穩固' },
  { id: 'depth-70', label: '客製 61 - 70cm 深度', depthCm: 70, extraFee: 3000, note: '+NT$ 3,000 (每 10cm 一個區間)' },
  { id: 'depth-80', label: '客製 71 - 80cm 深度', depthCm: 80, extraFee: 6000, note: '+NT$ 6,000 (每 10cm 一個區間)' },
  { id: 'depth-90', label: '客製 81 - 90cm 深度', depthCm: 90, extraFee: 9000, note: '+NT$ 9,000 (每 10cm 一個區間)' },
  { id: 'depth-100', label: '客製 91 - 100cm 深度', depthCm: 100, extraFee: 12000, note: '+NT$ 12,000 (每 10cm 一個區間)' },
  { id: 'depth-custom', label: '深度超過 100cm 特殊客製', depthCm: 110, extraFee: 0, note: '特殊深長規格，請加 LINE 專案報價' }
];

export const HEIGHT_SURCHARGE_TIERS = [
  { id: 'height-standard', label: '標準高度 (90/120/150/180cm)', heightCm: 180, extraFee: 0, note: '標準高度區間' },
  { id: 'height-190', label: '客製 181 - 190cm 高度', heightCm: 190, extraFee: 1000, note: '+NT$ 1,000 (每 10cm 一個區間)' },
  { id: 'height-200', label: '客製 191 - 200cm 高度', heightCm: 200, extraFee: 2000, note: '+NT$ 2,000 (每 10cm 一個區間)' },
  { id: 'height-210', label: '客製 201 - 210cm 高度', heightCm: 210, extraFee: 3000, note: '+NT$ 3,000 (挑高天花板)' },
  { id: 'height-220', label: '客製 211 - 220cm 高度', heightCm: 220, extraFee: 4000, note: '+NT$ 4,000 (挑高天花板)' },
  { id: 'height-custom', label: '高度超過 220cm 特殊挑高', heightCm: 230, extraFee: 0, note: '超挑高客製，請加 LINE 專案報價' }
];

export interface HuaHuaPhoto {
  id: string;
  title: string;
  ageStage: string;
  dateStr: string;
  imageUrl: string;
  storyCaption: string;
  isCustomUpload?: boolean;
}

export const HUA_HUA_STORY = {
  catName: '花花（HuaHua）',
  storeName: '花花招財貓',
  birthday: '2021年6月23日',
  gender: '母貓（已絕育）',
  breed: '英國短毛貓 (英短藍貓)',
  role: '品牌靈感 Muse · 臺中豐原門店榮譽店長',
  biography: [
    '「花花」是我在懷孕母貓身邊親自接生的小生命。當時母貓一共生了 3 隻小貓，花花是最後一隻出生、也是體型最微小的早產貓。因為貓媽媽是第一次生寶寶完全沒有經驗，小貓的臍帶都是店長親自拿著剪刀小心翼翼剪斷的。',
    '由於是早產兒，體質非常微弱纖小，哪怕身旁只有另外兩隻手足，花花也爭搶不到母乳喝。看著奄奄一息的小身軀，店長毅然決然承擔起全職貓爸的責任，不分晝夜、每隔兩三個小時親自拿小針筒與奶瓶，一滴一滴將花花親手餵養長大。',
    '後來為花花選購生活用具時，滿懷期待在網路上購買了貓別墅，拆箱後卻發現迎面而來刺鼻刺眼的劣質膠水味與劣質碎木，小貓根本不敢進去。這段心疼的經歷讓店長下定決心：一定要親自創立【花花招財貓】，專注打造純天然松木無甲醛、純實木板厚度足足 1.5cm 的高品質貓城堡，讓全台灣的小貓都能生活在真正健康、溫暖、安全的家！',
    '現在的花花已經健康長大、圓滾滾又黏人，偶爾還會親自到臺中豐原門店「上班」當榮譽小店長巡視呢！'
  ],
  missionStatement: '店長初心：不想貓咪住到爛木頭！本賣場純實木板厚度足足有 1.5cm，可以使用很久，讓小貓生活在健康的城堡裡。',
  storeNotice: '門店來訪須提前預約！店長有時外出到府組裝不在店內，提前預約避免跑空。',
  customPhotoStatement: '可以把在網路上看到的照片或喜歡的款式照片發給我，我這邊按照照片 1:1 製作！客製化高度、深度、長度都是可以隨意修改。',
  stairsNotice: '上門安裝如果現場無電梯需要爬樓梯，需要額外提前報備，會依樓層加收搬運費用，具體請加 LINE 諮詢。',
  initialPhotos: [
    {
      id: 'hh-1',
      title: '剛出生第一天：三隻小奶貓來到世界',
      ageStage: '剛出生 (Day 1)',
      dateStr: '2021年06月23日',
      imageUrl: '/assets/aistudio/ba55b85fe7f8bf86c3e22ee5586c4a0_5165cb01.jpg',
      storyCaption: '在紙箱母貓懷裡親自接生剪臍帶，花花是最後一隻最小的早產貓。'
    },
    {
      id: 'hh-2',
      title: '尚未睜眼：手心裡最脆弱的掌上明珠',
      ageStage: '初生 7 天',
      dateStr: '2021年06月30日',
      imageUrl: '/assets/aistudio/cad1cc7369e9da394b64d0718d302ef_5ea56e51.jpg',
      storyCaption: '還沒睜眼的小花花只有手掌心大，搶不到母乳，全靠店長針筒人工滴餵。'
    },
    {
      id: 'hh-3',
      title: '產房帳篷裡手足情深',
      ageStage: '滿月期 (1個月)',
      dateStr: '2021年07月23日',
      imageUrl: '/assets/aistudio/be9a0b270154e2bc35560c6f32a3965_6fea4b7b.jpg',
      storyCaption: '貓媽媽帶著3隻小貓在產房小帳篷裡，花花終於慢慢長出肉肉，眼睛亮晶晶。'
    },
    {
      id: 'hh-4',
      title: '小花坐墊上的大眼睛好奇寶寶',
      ageStage: '幼貓期 (2個月)',
      dateStr: '2021年08月20日',
      imageUrl: '/assets/aistudio/61a1a04d810a1a720473174863215fe_38d007ba.jpg',
      storyCaption: '開始學會到處探索，圓滾滾的金黃色大眼睛直盯著鏡頭，萌度爆表。'
    },
    {
      id: 'hh-5',
      title: '格子毯上的甜甜睡顏',
      ageStage: '幼貓期 (3個月)',
      dateStr: '2021年09月18日',
      imageUrl: '/assets/aistudio/06b505430149d27b798d0e645cf4f1c_2c2c5241.jpg',
      storyCaption: '在保暖格子毛毯上蜷成一個小毛球，平安健康度過幼貓脆弱期。'
    },
    {
      id: 'hh-6',
      title: '抱著紅草莓毛球甜甜午睡',
      ageStage: '少年期 (5個月)',
      dateStr: '2021年11月10日',
      imageUrl: '/assets/aistudio/5065c21317f631942d47d8780b8c41c_d8d8443d.jpg',
      storyCaption: '抱著自己最喜歡的草莓玩具進入夢鄉，像小天使一樣無憂無慮。'
    },
    {
      id: 'hh-7',
      title: '剛睡醒打了一個大哈欠',
      ageStage: '少年期 (6個月)',
      dateStr: '2021年12月',
      imageUrl: '/assets/aistudio/8fdb297a6c7229bdd19a04f83e4243b_0047682f.jpg',
      storyCaption: '打個大哈欠 滿滿幸福安全感'
    },
    {
      id: 'hh-8',
      title: '冷冷冬日鑽進暖被窩',
      ageStage: '少年期 (7個月)',
      dateStr: '2022年01月15日',
      imageUrl: '/assets/aistudio/8c6fd1e2cd5cbff2dc088a7693402e9_cf0dad8a.jpg',
      storyCaption: '冬天最愛窩在棉被堆裡露出小腦袋，享受滿滿的安全感。'
    },
    {
      id: 'hh-9',
      title: '一歲生日！威嚴大氣的英短藍貓',
      ageStage: '成貓 (1歲)',
      dateStr: '2022年06月23日',
      imageUrl: '/assets/aistudio/24064c63cc8649a6de0529e00916c2e_de1b5add.jpg',
      storyCaption: '滿一歲啦！毛色濃密發亮、腮幫子圓潤，威嚴端坐高處巡視領地。'
    },
    {
      id: 'hh-10',
      title: '在電腦鍵盤旁認真監工當店長',
      ageStage: '門店店長日常',
      dateStr: '2022年10月05日',
      imageUrl: '/assets/aistudio/daf9688831ba1d48d63e15fd84e5361_091c081c.jpg',
      storyCaption: '店長在畫貓別墅客製圖，花花就在旁邊「監工」催促出貨，超盡責！'
    },
    {
      id: 'hh-11',
      title: '平安絕育：戴著向日葵頭套康復中',
      ageStage: '成貓健康守護',
      dateStr: '2023年04月12日',
      imageUrl: '/assets/aistudio/04d6d7d0a8ef1a8754c5994f8c04569_5b59f3a8.jpg',
      storyCaption: '母貓已順利完成絕育手術！戴著可愛的向日葵防舔圈，很快就恢復元氣。'
    },
    {
      id: 'hh-12',
      title: '最愛賴在店長胸口撒嬌',
      ageStage: '幸福定格 (現今)',
      dateStr: '2024年至今',
      imageUrl: '/assets/aistudio/e795868b7b6b2da3b8ff5370acbe330_f8388ab8.jpg',
      storyCaption: '從小手把手喂大，即使長大成大貓咪，最愛的依然是賴在店長胸口撒嬌呼嚕，這是最貼切的幸福定格。'
    }
  ]
};

export const INITIAL_SHOWCASE_PHOTOS: ShowcasePhoto[] = [
  {
    id: 'sc-1',
    title: '150-60-120 全景雙開門旗艦款 實品拍',
    sizeCategory: '120',
    dimensionsText: '高150 x 深60 x 長120 cm',
    imageUrl: '/assets/aistudio/150-60-120_ff9034d7.jpg',
    customerNote: '客製天然松木無甲醛，純實木板厚度足 1.5cm，表面微防水漆，透光耐磨壓克力雙開門，標配通天抓柱與實木柵欄。',
    date: '2026年 完工實拍',
    tags: ['通天柱', '實木柵欄', '天然松木', '壓克力門']
  },
  {
    id: 'sc-2',
    title: '180-60-120 頂天立地豪邸（上下四門獨立款）',
    sizeCategory: '120',
    dimensionsText: '高180 x 深60 x 長120 cm',
    imageUrl: '/assets/aistudio/180-60-120_d83cbc2e.jpg',
    customerNote: '1.8米直通天花板，下層獨立隱蔽貓砂盆空間，上層雙貓頭休息房，大陸工廠直寄全台免運費（偏遠與離島除外）！',
    date: '2026年 完工實拍',
    tags: ['四門獨立', '1.8米頂天', '雙休息房', '免運到府']
  },
  {
    id: 'sc-3',
    title: '150-60-150 三門豪華城堡（附通天柱+安全造型柵欄）',
    sizeCategory: '150',
    dimensionsText: '高150 x 深60 x 長150 cm',
    imageUrl: '/assets/aistudio/150-60-150_c0c982c9.jpg',
    customerNote: '1.5米長超大城堡，三門大開口透氣佳，出貨前進行預組裝拍照確認無誤後妥善打包。',
    date: '2026年 完工實拍',
    tags: ['三門城堡', '通天柱', '安全造型柵欄', '預組裝拍照']
  },
  {
    id: 'sc-4',
    title: '120-60-90 雙門經典款（附劍麻抓柱與跳台）',
    sizeCategory: '90',
    dimensionsText: '高120 x 深60 x 長90 cm',
    imageUrl: '/assets/aistudio/B120-60-90_c49b37e1.jpg',
    customerNote: '客廳電視牆黃金尺寸，天然松木無甲醛，純實木厚度 1.5cm，高透壓克力門讓貓咪曬太陽超愜意。',
    date: '2026年 完工實拍',
    tags: ['雙門', '劍麻柱', '90cm黃金面寬']
  },
  {
    id: 'sc-5',
    title: '90-60-60 輕巧小宅別墅 臥室床頭實拍照',
    sizeCategory: '60',
    dimensionsText: '高90 x 深60 x 長60 cm',
    imageUrl: '/assets/aistudio/90-60-60_f18b59e3.jpg',
    customerNote: '小資單貓獨立套房，帶萬向輪好移動打掃，底層可容納大號貓砂盆，全台免運費（偏遠與離島除外）。',
    date: '2026年 完工實拍',
    tags: ['單貓套房', '萬向煞車輪', '小宅首選']
  },
  {
    id: 'sc-custom-1',
    title: '183-73-142 特殊畸零空間量身客製款',
    sizeCategory: 'custom',
    dimensionsText: '高183 x 深73 x 長142 cm（依屋主畸零空間特殊訂製）',
    imageUrl: '/assets/aistudio/C180-60-120_080ab68b.jpg',
    customerNote: '依照家中畸零空間量身打造！高度183cm頂天立地、深度加大至73cm、面寬142cm，純實木板厚度足1.5cm，出貨前預組裝實拍確認。',
    date: '2026年 完工實拍',
    tags: ['特殊客製', '高183cm', '深73cm', '長142cm', '依圖訂製']
  }
];

export const FAQS = [
  {
    q: '花花招財貓的板材厚度與門片是什麼材質？',
    a: '我的初心就是「不想貓咪住到爛木頭」！本賣場全純實木板厚度皆足足有 1.5cm，堅固厚實可以使用很久，遠勝於市面劣質薄板或貼皮碎木板。我堅持採用「天然松木無甲醛」板材，表面塗刷些許環保防水漆保護木質防潮防潑水。透明門片並非使用易碎沉重的玻璃，而是全面採用「高透耐磨安全壓克力板」，透光通透無阻、輕盈防撞且抗碎裂，保障貓咪嬉戲時的絕對安全。'
  },
  {
    q: '深度可以超過 60cm 嗎？高度可以超過 180cm 嗎？價格如何計算？',
    a: '完全可以！我提供全套深度與高度客製化服務：\n1. 深度超過 60cm：每 10cm 一個計費區間（例如 61-70cm 加收 NT$ 3,000；71-80cm 加收 NT$ 6,000；81-90cm 加收 NT$ 9,000，以此類推）。\n2. 高度超過 180cm：每 10cm 一個計費區間（例如 181-190cm 加收 NT$ 1,000；191-200cm 加收 NT$ 2,000；201-210cm 加收 NT$ 3,000，以此類推）。\n客製化安裝費用會根據實際尺寸大小與樣式彈性報價，歡迎隨時加 LINE 諮詢！'
  },
  {
    q: '我可以提供網路上看到的照片請您 1:1 製作嗎？',
    a: '可以的！您可以把在網路上、社群看到喜歡的款式照片發到 LINE 給店長，我這邊可以直接按照您提供的照片 1:1 打造，高度、深度、長度、隔層格局都能隨意修改量身訂做。'
  },
  {
    q: '產地在哪裡？運送需要運費嗎？出貨前會確認嗎？',
    a: '我的客製化工廠位於大陸，專注高品質貓別墅生產。製作完成後直寄台灣，享有【免運費】配送到府（免運不包含偏遠地區還有離島）！為了保障品質，出貨前我會先在廠內進行「預組裝並拍攝完整實拍照片」（固定版型除外），透過 LINE 與您線上確認無誤後才會妥善加固打包出貨。'
  },
  {
    q: '物流配送方式為何？如果現場需要爬樓梯怎麼辦？',
    a: '大型貓別墅使用的是「新竹物流」負責配送，原則上「僅配送至一樓」，敬請見諒。若您需要師傅到府組裝且現場無電梯需爬樓梯搬運，請於訂購時「提前報備」，會依樓層酌收額外樓層搬運費，具體可於 LINE 中確認。物流運輸過程中若有極輕微的摩擦痕跡，或原木本身的自然木紋、微小結痂，屬於自然現象，不影響整體堅固與美觀。'
  },
  {
    q: '自行組裝會很困難嗎？需要準備什麼工具？',
    a: '大型貓別墅組裝具一定挑戰性。為維持結構穩固與客製化彈性，板材僅預留「主要結構」孔洞，部分細部鎖點需自行定位。強烈建議您自備「電動螺絲起子」，並搭配「由店長本人親自拍攝入鏡示範的組裝教學影片」進行，若遇困難，群內客服會隨時為您提供線上技術支援！'
  },
  {
    q: '如果需要到府組裝，安裝費與車馬費如何計算？',
    a: '提供專業師傅全台到府安裝定位服務！安裝工資依貓別墅尺寸規格訂價，車馬費則以門店「臺中豐原」出發計算來回里程與國道耗損。為了減輕貓爸媽負擔，店長主動吸收零頭讓利（例如臺中市區/豐原僅酌收親民價200元、彰化苗栗500元、新竹900元、雙北1,700元、高雄2,400元），您可以在網站上的「即時估價試算機」直接選擇所在縣市查看精確報價！'
  },
  {
    q: '售後保固多久？如果收到時有損壞怎麼處理？',
    a: '全系列貓別墅享有「自到貨日起 1 年保固」！為保障您的權益，收貨拆箱時請務必【全程錄影】。保固期間內若有板材或五金損壞（非人為因素），皆可憑拆箱錄影影片免費為您補發全新更換零件。'
  },
  {
    q: '門店在哪裡？可以直接到店內看實體樣板嗎？',
    a: '門店展示倉儲中心位於「臺中市豐原區圓環西路97號」。店內陳列多款實體貓別墅與木材樣板，歡迎現場感受天然松木溫潤質感。⚠️【重要提醒】門店來訪請務必提前預約！因為店長常外出到府為客人組裝貓別墅，提前預約避免跑空，歡迎撥打電話 0966-129-569 或加 LINE 預約！'
  }
];
