/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { InStockSection } from './components/InStockSection';
import { FeaturedModels } from './components/FeaturedModels';
import { BrandStorySection } from './components/BrandStorySection';
import { ShowcaseGallery } from './components/ShowcaseGallery';
import { PriceCatalog } from './components/PriceCatalog';
import { EstimatorCalculator } from './components/EstimatorCalculator';
import { DisclaimerNotice } from './components/DisclaimerNotice';
import { MaterialsFeatures } from './components/MaterialsFeatures';
import { SizeGuide } from './components/SizeGuide';
import { FaqSection } from './components/FaqSection';
import { ContactSection } from './components/ContactSection';
import { LightboxModal } from './components/LightboxModal';
import { OriginalMenuModal } from './components/OriginalMenuModal';
import { Footer } from './components/Footer';
import { MobileStickyBar } from './components/MobileStickyBar';
import { StoreOwnerAuthModal } from './components/StoreOwnerAuthModal';
import { ProductDetailPage } from './components/ProductDetailPage';
import { TopicGuidePage } from './components/TopicGuidePage';
import { useStoreOwner } from './utils/adminAuth';
import { FEATURED_MODELS, VillaModel } from './data/catVillaData';

const HOME_TITLE = '貓別墅｜實木貓別墅推薦・花花招財貓 1.5cm天然松木客製貓櫃（全台免運）';
const HOME_DESCRIPTION =
  '實木貓別墅客製首選花花招財貓！嚴選無甲醛天然松木足1.5cm純實木板，防潮微防水漆與高透耐磨安全壓克力門。支援1:1照照片客製尺寸，出貨預組裝拍照確認，全台免運直寄含1年保固。台中豐原實體門店預約體驗看實木：0966-129-569、LINE：hhcat.cc。';

export default function App() {
  const { isOwner } = useStoreOwner();
  const [ownerAuthOpen, setOwnerAuthOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Restore home metadata when navigating back to root
  useEffect(() => {
    if (currentPath === '/' || currentPath === '') {
      document.title = HOME_TITLE;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', HOME_DESCRIPTION);
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', 'https://hhcat.cc/');
    }
  }, [currentPath]);

  useEffect(() => {
    if (typeof window === 'undefined' || isOwner) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1' || window.location.hash === '#owner') {
      setOwnerAuthOpen(true);
    }
  }, [isOwner]);

  // Lightbox Modal State
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    title: string;
    imageUrl: string;
    subtitle?: string;
  }>({
    isOpen: false,
    title: '',
    imageUrl: '',
    subtitle: ''
  });

  // Original Menu Modal State (5 user uploaded menu sheets)
  const [originalMenuModal, setOriginalMenuModal] = useState<{
    isOpen: boolean;
    initialIndex: number;
  }>({
    isOpen: false,
    initialIndex: 0
  });

  // Target dimension for estimator
  const [estimatorDimensions, setEstimatorDimensions] = useState<{
    length: number;
    height: number;
  }>({
    length: 120,
    height: 150
  });

  const navigateToPath = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const navigateHome = useCallback((hash?: string) => {
    if (typeof window !== 'undefined') {
      const targetUrl = hash ? `/${hash}` : '/';
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', targetUrl);
        setCurrentPath('/');
        setTimeout(() => {
          if (hash) {
            const elem = document.getElementById(hash.replace('#', ''));
            elem?.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 60);
      } else if (hash) {
        const elem = document.getElementById(hash.replace('#', ''));
        elem?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, []);

  const handleOpenImageZoom = (title: string, imageUrl: string, subtitle?: string) => {
    setLightbox({
      isOpen: true,
      title,
      imageUrl,
      subtitle
    });
  };

  const handleCloseLightbox = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
  };

  const handleOpenOriginalMenu = (index = 0) => {
    setOriginalMenuModal({
      isOpen: true,
      initialIndex: index
    });
  };

  const handleCloseOriginalMenu = () => {
    setOriginalMenuModal((prev) => ({ ...prev, isOpen: false }));
  };

  const scrollToEstimator = (length?: number, height?: number) => {
    if (length && height) {
      setEstimatorDimensions({ length, height });
    }
    navigateHome('#estimator');
  };

  const handleSelectModelForQuote = (model: VillaModel) => {
    scrollToEstimator(model.dimensions.length, model.dimensions.height);
  };

  const handleOpenModelPage = (model: VillaModel) => {
    navigateToPath(`/villa/${model.id}`);
  };

  // Resolve route match
  const normalizedPath = currentPath.replace(/\/+$/, '') || '/';
  const villaMatch = normalizedPath.match(/^\/villa\/([^/]+)$/);
  const matchedModel = villaMatch
    ? FEATURED_MODELS.find((m) => m.id === villaMatch[1]) || FEATURED_MODELS[0]
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-800 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Top Bar following 3-zone contract */}
      <Navbar
        onOpenEstimator={() => scrollToEstimator()}
        onNavigateHome={navigateHome}
      />

      {/* Route Switch: Dedicated Product Page / SEO Guides / Main Storefront */}
      <main className="flex-1">
        {matchedModel ? (
          <ProductDetailPage
            model={matchedModel}
            allModels={FEATURED_MODELS}
            onNavigateHome={navigateHome}
            onNavigateToPath={navigateToPath}
            onSelectForQuote={handleSelectModelForQuote}
          />
        ) : normalizedPath === '/guides/solid-wood-craft' ? (
          <TopicGuidePage
            mode="craft"
            onNavigateHome={navigateHome}
            onNavigateToPath={navigateToPath}
          />
        ) : normalizedPath === '/taichung-showroom' ? (
          <TopicGuidePage
            mode="showroom"
            onNavigateHome={navigateHome}
            onNavigateToPath={navigateToPath}
          />
        ) : (
          <>
            {/* 1. Hero Section: Slogan, 4 Guarantees, Big Visual Showcase */}
            <HeroSection
              onOpenEstimator={() => scrollToEstimator()}
              onViewMenuImages={() => handleOpenOriginalMenu(0)}
              onOpenImageZoom={handleOpenImageZoom}
              onNavigateToPath={navigateToPath}
            />

            {/* 2. Brand Story & Muse Hua Hua */}
            <BrandStorySection onOpenImageZoom={handleOpenImageZoom} />

            {/* 3. In-Stock Showcase */}
            <InStockSection onOpenImageZoom={handleOpenImageZoom} />

            {/* 4. Featured Cat Villa Models */}
            <FeaturedModels
              onSelectForQuote={handleSelectModelForQuote}
              onOpenImageZoom={handleOpenImageZoom}
              onOpenModelPage={handleOpenModelPage}
            />

            {/* 5. Customer Custom Showcase & Gallery */}
            <ShowcaseGallery onOpenImageZoom={handleOpenImageZoom} />

            {/* 6. Complete Menu Pricing Tables & Original Paper Menu Viewer */}
            <PriceCatalog
              onOpenOriginalMenuModal={handleOpenOriginalMenu}
              onSelectDimensionForEstimator={(len, h) => scrollToEstimator(len, h)}
            />

            {/* 7. Online Interactive Custom Quoting Estimator */}
            <EstimatorCalculator
              initialLength={estimatorDimensions.length}
              initialHeight={estimatorDimensions.height}
              onOpenImageZoom={handleOpenImageZoom}
            />

            {/* 8. Order Guidelines & Warranty */}
            <DisclaimerNotice />

            {/* 9. Materials, Craftsmanship & Competitive Comparison */}
            <MaterialsFeatures />

            {/* 10. Size Selection Guide */}
            <SizeGuide onSelectDimension={(len, h) => scrollToEstimator(len, h)} />

            {/* 11. Frequently Asked Questions */}
            <FaqSection />

            {/* 12. Contact & OMO Showroom Experience */}
            <ContactSection />
          </>
        )}
      </main>

      {/* Footer with Business Info, SEO Links, Discreet Owner Portal & Back-to-Top */}
      <Footer
        onOpenOwnerAuth={() => setOwnerAuthOpen(true)}
        onNavigateHome={navigateHome}
        onNavigateToPath={navigateToPath}
      />

      {/* Mobile Bottom Sticky Bar */}
      <MobileStickyBar onOpenEstimator={() => scrollToEstimator()} />

      {/* Store Owner Auth Modal */}
      <StoreOwnerAuthModal
        isOpen={ownerAuthOpen}
        onClose={() => setOwnerAuthOpen(false)}
        onSuccess={() => setOwnerAuthOpen(false)}
        actionTitle="解鎖店主管理與上傳編輯功能"
      />

      {/* Lightbox Modal for Full Image Zoom */}
      <LightboxModal
        isOpen={lightbox.isOpen}
        title={lightbox.title}
        imageUrl={lightbox.imageUrl}
        subtitle={lightbox.subtitle}
        onClose={handleCloseLightbox}
      />

      {/* Original Paper Menu Viewer */}
      <OriginalMenuModal
        isOpen={originalMenuModal.isOpen}
        initialIndex={originalMenuModal.initialIndex}
        onClose={handleCloseOriginalMenu}
      />
    </div>
  );
}
