import React from 'react';
import { Camera, Wrench, Truck, ShieldCheck, AlertCircle, Video, CheckCircle } from 'lucide-react';
import { STORE_INFO } from '../data/catVillaData';

export const DisclaimerNotice: React.FC = () => {
  return (
    <section id="disclaimer" className="py-16 sm:py-20 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-amber-900 bg-amber-500/10 border border-amber-600/20 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-800" />
            <span>透明誠信 · 買家權益保障</span>
          </div>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            訂購須知 · 免責聲明與售後保固
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            為維護您的寶貴權益，下單前請詳閱以下出貨檢驗、組裝建議、物流配送與 1 年保固政策
          </p>
        </div>

        {/* 4 Essential Policy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. 完工確認 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-amber-900 bg-amber-100/60 px-2.5 py-0.5 rounded-md">
                出貨前預組裝檢驗
              </span>
            </div>

            <div>
              <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                01. 完工確認與實拍
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mt-2">
                出貨前，我們會先在廠內進行<strong>預組裝並拍攝完整實拍照</strong>（固定版型除外），透過 LINE 與您在線確認各部位格局無誤後，才會進行嚴實加固打包出貨，讓您遠端也能第一時間看見愛貓未來的城堡。
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>線上確認無誤才安排打包裝箱</span>
            </div>
          </div>

          {/* 2. 組裝工具提醒 (重要) */}
          <div className="bg-white rounded-2xl border border-amber-900/30 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-800 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              重要提醒
            </div>

            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-800 flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-orange-800 bg-orange-100/60 px-2.5 py-0.5 rounded-md">
                強烈建議自備工具
              </span>
            </div>

            <div>
              <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                02. 組裝工具提醒（重要）
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mt-2">
                大型貓別墅組裝具一定挑戰性。為維持結構穩固與客製化彈性，板材僅預留「主要結構」孔洞，部分細部鎖點需自行定位。
                強烈建議您準備<strong>「電動螺絲起子」</strong>，並搭配我們<strong>由店長本人親自拍攝入鏡示範的教學影片</strong>進行。若遇困難，群內客服會隨時為您提供技術支援！
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-orange-900 font-medium">
              <Video className="w-4 h-4 text-orange-700 shrink-0" />
              <span>店長本人親自拍攝入鏡教學影片，手把手示範</span>
            </div>
          </div>

          {/* 3. 物流配送說明 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-blue-800 bg-blue-100/60 px-2.5 py-0.5 rounded-md">
                新竹物流配送至一樓
              </span>
            </div>

            <div>
              <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                03. 物流配送說明（新竹物流）
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mt-2">
                工廠在大陸，製作完後運送到台灣，享有<strong>免運費</strong>服務（<strong>免運不包含偏遠地區還有離島</strong>）。大型傢俱由<strong>新竹物流</strong>配送，原則上<strong>僅配送至一樓</strong>，敬請見諒。若需我們師傅到府組裝且現場無電梯需爬樓梯搬運，需額外提前報備加收樓層費，具體請加 LINE 諮詢。物流運輸過程中若有極輕微的摩擦痕跡，或板材本身的自然木紋、微小結痂，屬於自然原木現象，不影響整體結構與美觀。
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>新竹物流送至一樓（免運不含偏遠與離島，無電梯爬梯需另報備）</span>
            </div>
          </div>

          {/* 4. 售後保固 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2.5 py-0.5 rounded-md">
                1 年非人為保固
              </span>
            </div>

            <div>
              <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                04. 1 年售後保固（請全程拆箱錄影）
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed mt-2">
                我們提供<strong>自到貨日起 1 年品質保固</strong>。為保障雙方權益，收貨拆箱時請務必<strong>「全程錄影」</strong>（包含外箱標籤與開箱過程）。保固期間內若發現板材或五金損壞（非人為外力破壞因素），皆可憑影片由我們<strong>免費補發全新板材或配件更換</strong>！
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <Video className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>拆箱全程錄影，破損免費補寄更換</span>
            </div>
          </div>
        </div>

        {/* Reassurance Footer Banner */}
        <div className="mt-8 p-4 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span>
            花花招財貓堅持把關每道工序：<strong>店長初心不想貓咪住到爛木頭</strong>，<strong>純實木板厚度足 1.5cm</strong>、<strong>天然松木無甲醛</strong>、<strong>表面微防水漆</strong>、<strong>高透安全亞克力門</strong>，讓愛貓住得健康、家長買得放心。
          </span>
          <a
            href={STORE_INFO.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-amber-900 hover:underline shrink-0"
          >
            有疑問？加 LINE 線上詢問店長 &rarr;
          </a>
        </div>
      </div>
    </section>
  );
};
