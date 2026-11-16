import React, { useState } from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { Phone, MessageCircle, Menu, X, MapPin, QrCode } from 'lucide-react';

interface NavbarProps {
  onOpenEstimator?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQrPopover, setShowQrPopover] = useState(false);

  const navLinks = [
    { label: '門市現貨', href: '#instock' },
    { label: '精選款式', href: '#models' },
    { label: '品牌故事', href: '#story' },
    { label: '客製相冊', href: '#showcase' },
    { label: '價目目錄', href: '#catalog' },
    { label: '即時估價', href: '#estimator' },
    { label: '訂購須知', href: '#disclaimer' },
    { label: '材質工藝', href: '#materials' },
    { label: '常見問題', href: '#faq' },
    { label: '門店聯絡', href: '#contact' }
  ];

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = href;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-8">
          {/* Zone 1: Brand Wordmark with Logo */}
          <a href="#" className="flex items-center gap-3 shrink-0 group">
            <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-stone-200/90 shadow-sm group-hover:border-amber-700 transition-colors overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={STORE_INFO.logoImage || '/assets/aistudio/logo_6994c231.jpg'}
                alt={STORE_INFO.name}
                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif-title text-xl font-bold tracking-tight text-stone-900 leading-none">
                {STORE_INFO.name}
              </span>
              <span className="text-[11px] tracking-wider text-stone-500 mt-1 uppercase font-medium">
                手工客製實木貓別墅
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-stone-600">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="hover:text-amber-800 transition-colors whitespace-nowrap py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-amber-800 hover:after:w-full after:transition-all"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Primary Action & Direct Contact */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0 relative">
            <button
              type="button"
              onClick={() => setShowQrPopover(!showQrPopover)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 rounded-lg transition-colors"
              title="手機掃碼加 LINE"
            >
              <QrCode className="w-3.5 h-3.5 text-stone-600" />
              <span>LINE QR</span>
            </button>

            <a
              href={`tel:${STORE_INFO.phone}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:text-amber-900 bg-stone-100 hover:bg-stone-200/70 rounded-lg transition-colors whitespace-nowrap"
              title="點擊撥打專線"
            >
              <Phone className="w-3.5 h-3.5 text-amber-800" />
              <span>{STORE_INFO.phoneDisplay}</span>
            </a>

            <a
              href={STORE_INFO.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg shadow-sm hover:shadow transition-all whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>LINE 諮詢</span>
            </a>

            {/* Desktop QR Popover */}
            {showQrPopover && (
              <div
                className="absolute right-0 top-12 z-50 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 text-center animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-xs font-bold text-stone-800">加入店長 LINE</span>
                  <button
                    type="button"
                    onClick={() => setShowQrPopover(false)}
                    className="text-stone-400 hover:text-stone-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="my-3 p-2 bg-stone-50 rounded-xl border border-stone-200 inline-block">
                  <img
                    src={STORE_INFO.lineQrCode}
                    alt="LINE QR"
                    className="w-40 h-40 object-contain mx-auto rounded"
                  />
                </div>
                <div className="text-[11px] text-stone-500 font-mono">ID：{STORE_INFO.lineId}</div>
                <div className="text-[10px] text-amber-900 mt-1">
                  請開啟手機相機對準 QR 條碼掃描
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 xl:hidden">
            <a
              href={STORE_INFO.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-[#06C755] rounded-md"
            >
              加 LINE
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-800/30"
              aria-label="打開導覽選單"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-stone-200 bg-[#FAF8F5] px-4 pt-4 pb-6 space-y-3 shadow-lg">
          <div className="grid grid-cols-2 gap-2 text-sm font-medium text-stone-700">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="px-3 py-2.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile QR Code Box */}
          <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center gap-3">
            <img
              src={STORE_INFO.lineQrCode}
              alt="LINE QR"
              className="w-16 h-16 rounded-lg bg-stone-50 p-1 border border-stone-200 object-contain shrink-0"
            />
            <div className="text-xs">
              <div className="font-bold text-stone-900">花花招財貓 LINE QR</div>
              <div className="text-[11px] text-stone-500 font-mono">ID：{STORE_INFO.lineId}</div>
              <div className="text-[10px] text-amber-900 mt-0.5">長按或截圖加入店長好友</div>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200/80 space-y-2">
            <a
              href={`tel:${STORE_INFO.phone}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-stone-800 bg-stone-100 rounded-lg"
            >
              <Phone className="w-4 h-4 text-amber-800" />
              <span>撥打電話：{STORE_INFO.phoneDisplay}</span>
            </a>
            <a
              href={STORE_INFO.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#06C755] rounded-lg shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>加入 LINE 官方好友諮詢</span>
            </a>
            <div className="text-xs text-stone-500 text-center pt-1 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>門店地址：{STORE_INFO.address}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
