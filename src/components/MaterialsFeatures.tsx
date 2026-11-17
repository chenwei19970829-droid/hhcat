import React from 'react';
import { Shield, Sparkles, Wind, Disc, Award, Droplets } from 'lucide-react';

export const MaterialsFeatures: React.FC = () => {
  const features = [
    {
      title: '天然松木無甲醛 · 實木厚度足 1.5cm',
      subtitle: '原木質地 · 拒絕薄板與貼皮碎木',
      description:
        '全櫃體採用足厚 1.5cm 純實木板，結構紮實承重力高，長期承載多隻大貓蹦跳也不變形，保留天然無甲醛松木清香。',
      icon: Shield
    },
    {
      title: '木質表面塗刷微防水漆',
      subtitle: '防潮防潑水 · 日常輕鬆清潔',
      description:
        '每塊木材表面皆細心塗刷些許環保防水漆，有效阻隔濕氣水氣、防潮抗汙漬。即使日常貓咪打翻水碗或清潔擦拭也能輕鬆維護。',
      icon: Droplets
    },
    {
      title: '高透耐磨安全壓克力門片',
      subtitle: '非易碎玻璃 · 輕盈防爆防撞',
      description:
        '門片全面使用加厚高透耐磨壓克力，透光視野極佳！相比笨重易碎的玻璃更具韌性與抗衝擊力，徹底消除破裂危險，安全滿分。',
      icon: Sparkles
    },
    {
      title: '304 不銹鋼靜音緩衝鉸鏈',
      subtitle: '靜音防夾五金配件',
      description:
        '每次開關門皆有柔和阻尼緩衝，關門輕柔無聲，徹底杜絕驚嚇熟睡中的貓咪，更避免夾傷好奇探出的小爪與尾巴。',
      icon: Disc
    },
    {
      title: '環保空氣對流散熱設計',
      subtitle: '常保清新透氣不悶熱',
      description:
        '兩側與頂部精心規劃多組通風孔與透氣百葉，室內空氣自然形成煙囪對流效應，夏季不悶熱、異味不聚積、防霉防潮。',
      icon: Wind
    },
    {
      title: '天然無染色劍麻抓柱',
      subtitle: '耐磨三年不脫屑掉毛',
      description:
        '嚴選天然高品質粗白麻繩緊密螺旋纏繞，不經化學漂白劑處理，耐磨度強，讓愛貓釋放磨爪天性，同時保護家中名貴沙發家具。',
      icon: Award
    }
  ];

  return (
    <section id="materials" className="py-16 sm:py-20 border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Premium Craftsmanship
          </div>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            材質與極致工藝特色
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            天然松木無甲醛、表面微防水漆防潮、高透安全壓克力門，每一道工序皆為愛貓安全與實用而生
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-stone-200/90 p-6 hover:border-amber-800/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-900">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif-title font-bold text-stone-900 text-base">
                      {item.title}
                    </h3>
                    <div className="text-xs font-medium text-amber-900 mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Competitive Differentiation Comparison Table */}
        <div className="mt-12 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
          <div className="mb-5">
            <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Craft Comparison · 選購避雷對照
            </div>
            <h3 className="font-serif-title text-xl font-bold text-stone-900 mt-1">
              花花招財貓 1.5cm 純松木 vs 市售一般網購貓櫃
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="py-3 pr-4 font-semibold">對比項目</th>
                  <th className="py-3 px-4 font-bold text-amber-950 bg-amber-50/70">
                    花花招財貓（1.5cm 純實木客製）
                  </th>
                  <th className="py-3 pl-4 font-medium text-stone-500">
                    市售平價網購／貼皮薄板貓籠
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">板材真材實料</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">
                    全純實木松木實測足 <span className="font-mono">1.5cm</span>，大貓跳躍不搖晃變形
                  </td>
                  <td className="py-3.5 pl-4 text-stone-500">
                    常見 0.8–1.2cm 貼皮密度板或碎木壓合，易塌陷脫皮
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">無毒防水安全</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">
                    天然無甲醛原木＋微防水漆防潮塗裝，清潔擦拭不發霉
                  </td>
                  <td className="py-3.5 pl-4 text-stone-500">
                    刺鼻黏膠甲醛味重，沾水或貓尿易膨脹起泡
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">視野與防爆門片</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">
                    高透耐磨安全壓克力門＋304 靜音緩衝鉸鏈，輕巧防碎
                  </td>
                  <td className="py-3.5 pl-4 text-stone-500">
                    笨重易碎玻璃門或冰冷生鏽鐵籠，易夾傷或驚嚇毛孩
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">實體門店與驗收</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">
                    台中豐原實體門店可看木頭 + 出貨前預組裝拍照驗貨 + 1 年保固
                  </td>
                  <td className="py-3.5 pl-4 text-stone-500">
                    純網拍無實體門店可摸實品，收到貨才開箱抽盲盒
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
