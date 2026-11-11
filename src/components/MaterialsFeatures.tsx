import React from 'react';
import { Shield, Sparkles, Wind, Disc, Award, Heart, Droplets } from 'lucide-react';

export const MaterialsFeatures: React.FC = () => {
  const features = [
    {
      title: '天然松木無甲醛 · 實木厚度足 1.5cm',
      subtitle: '原木質地 · 拒絕爛木頭與薄皮板',
      description:
        '店長初心：不想貓咪住到爛木頭！本賣場純實木板厚度足足有 1.5cm，遠勝一般廉價薄木板與貼皮碎木。嚴選天然無甲醛松木，天然木紋純淨美觀，保留松木清香，安全耐用多年。',
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
      title: '高透耐磨安全亞克力門片',
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
            天然松木無甲醛、表面微防水漆防潮、高透安全亞克力門，每一道工序皆為愛貓安全與實用而生
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

                <div className="pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[11px] text-stone-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-700" />
                  <span>花花招財貓實體門店嚴格品檢</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
