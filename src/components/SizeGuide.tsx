import React from 'react';
import { Home, Users, CheckCircle2, ArrowRight } from 'lucide-react';

interface SizeGuideProps {
  onSelectDimension: (length: number, height: number) => void;
}

export const SizeGuide: React.FC<SizeGuideProps> = ({ onSelectDimension }) => {
  const guideRows = [
    {
      lengthRange: '長度 60 cm',
      heightRecommended: '高 90 ~ 120 cm',
      catCount: '1 隻成貓 / 幼貓獨立房',
      spaceType: '租屋套房、主臥床頭旁、陽台角落',
      sandBasin: '底層可放置一般標準封閉/半封閉貓砂盆',
      recommendedModel: '120-60-60 ($6,500)',
      targetLength: 60,
      targetHeight: 120,
      tips: '垂直利用高度，佔地不到一塊磁磚，不佔生活走道空間。'
    },
    {
      lengthRange: '長度 90 cm',
      heightRecommended: '高 120 ~ 150 cm',
      catCount: '1 ~ 2 隻貓咪',
      spaceType: '一般公寓客廳、玄關過道、書房景觀窗',
      sandBasin: '底層充裕，可同時放置貓砂盆 + 自動餵食機',
      recommendedModel: '150-60-90 ($11,500 附抓柱*2 柵欄*1)',
      targetLength: 90,
      targetHeight: 150,
      tips: '人氣性價比推薦！雙貓各自有獨立休憩樓層，互不干擾。'
    },
    {
      lengthRange: '長度 120 cm',
      heightRecommended: '高 150 ~ 180 cm',
      catCount: '2 ~ 4 隻貓咪',
      spaceType: '標準三房兩廳客廳電視旁、多功能貓房',
      sandBasin: '支援雙貓砂盆或大號加大防落砂貓砂盆',
      recommendedModel: '150-60-120 ($13,800 附通天柱*1 柵欄*1)',
      targetLength: 120,
      targetHeight: 150,
      tips: '寬闊大面寬，附貫穿式通天柱，愛貓享受飛奔攀爬快感。'
    },
    {
      lengthRange: '長度 150 cm',
      heightRecommended: '高 150 ~ 180 cm',
      catCount: '3 ~ 5 隻多貓家庭',
      spaceType: '大坪數客廳、寵物咖啡廳、景觀落地窗旁',
      sandBasin: '大容量獨立儲物空間 + 專屬獨立洗手間隔層',
      recommendedModel: '150-60-150 ($19,800 附通天柱*1 安全造型柵欄*1)',
      targetLength: 150,
      targetHeight: 150,
      tips: '旗艦大面寬款！出廠標配通天柱與安全造型柵欄，三扇門各自開闔好打理。'
    },
    {
      lengthRange: '長度 180 cm',
      heightRecommended: '高 180 cm (頂天立地)',
      catCount: '4 ~ 8 隻多貓家庭',
      spaceType: '透天別墅、專屬貓房主牆面、商業貓館',
      sandBasin: '多組貓砂盆、全套自動循環飲水機、零食大收納',
      recommendedModel: '180-60-180 ($37,800 附通天柱*1 安全造型柵欄*1)',
      targetLength: 180,
      targetHeight: 180,
      tips: '尊榮頂天城堡！如同將一座微型原木遊樂園直接搬進家中。'
    }
  ];

  return (
    <section id="sizeguide" className="py-16 sm:py-20 border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Dimensions & Sizing Guide
          </div>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            尺寸選購指引表
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            不知道該買多大？依據家中小主子隻數與擺放空間格局，挑選最適合的專屬規格
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-semibold">
                  <th className="py-3.5 px-4">面寬系列</th>
                  <th className="py-3.5 px-4">建議高度</th>
                  <th className="py-3.5 px-4">建議貓口</th>
                  <th className="py-3.5 px-4">適配居家空間</th>
                  <th className="py-3.5 px-4">貓砂盆配置容積</th>
                  <th className="py-3.5 px-4">推薦主打型號</th>
                  <th className="py-3.5 px-4 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {guideRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                      {row.lengthRange}
                    </td>
                    <td className="py-4 px-4 font-medium text-stone-700 whitespace-nowrap">
                      {row.heightRecommended}
                    </td>
                    <td className="py-4 px-4 font-semibold text-amber-900 whitespace-nowrap">
                      {row.catCount}
                    </td>
                    <td className="py-4 px-4 text-stone-600 min-w-[150px]">
                      {row.spaceType}
                    </td>
                    <td className="py-4 px-4 text-stone-500 min-w-[180px]">
                      {row.sandBasin}
                    </td>
                    <td className="py-4 px-4 font-mono font-semibold text-stone-800 whitespace-nowrap">
                      {row.recommendedModel}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectDimension(row.targetLength, row.targetHeight)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <span>試算此款</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-stone-50 border-t border-stone-200 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2">
            <span>
              ※ 深度全系列固定為 <strong>60 cm</strong>
              ，預留貓咪轉身伸展空間與各品牌大號貓砂盆收納。可全套尺寸客製化！
            </span>
            <span className="font-medium text-stone-700">
              有特殊畸零角或插座孔需求？歡迎加 LINE 直接由店長為您繪圖規劃
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
