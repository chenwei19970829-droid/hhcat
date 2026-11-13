/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { VillaModel } from './data/catVillaData';

export default function App() {
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
    const elem = document.getElementById('estimator');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectModelForQuote = (model: VillaModel) => {
    scrollToEstimator(model.dimensions.length, model.dimensions.height);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-800 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Top Bar following 3-zone contract */}
      <Navbar onOpenEstimator={() => scrollToEstimator()} />

      {/* Main Single-page Layout Sections */}
      <main className="flex-1">
        {/* 1. Hero Section: Slogan, 4 Guarantees, Big Visual Showcase */}
        <HeroSection
          onOpenEstimator={() => scrollToEstimator()}
          onViewMenuImages={() => handleOpenOriginalMenu(0)}
          onOpenImageZoom={handleOpenImageZoom}
        />

        {/* 2. Brand Story & Muse Hua Hua: 首席鏟屎官初心、花花誕生故事與成長寫真 */}
        <BrandStorySection onOpenImageZoom={handleOpenImageZoom} />

        {/* 3. In-Stock Showcase: 門店現貨實拍區（台中豐原店內現成款式、支援店主上傳與售出刪除、現貨自取自理） */}
        <InStockSection onOpenImageZoom={handleOpenImageZoom} />

        {/* 4. Featured Cat Villa Models: A-Z 款式, filtering by All/90/120/150/180 */}
        <FeaturedModels
          onSelectForQuote={handleSelectModelForQuote}
          onOpenImageZoom={handleOpenImageZoom}
        />

        {/* 5. Customer Custom Showcase & Store Owner Upload Gallery (依尺寸檢索實品照) */}
        <ShowcaseGallery onOpenImageZoom={handleOpenImageZoom} />

        {/* 4. Complete Menu Pricing Tables & Original Paper Menu Viewer */}
        <PriceCatalog
          onOpenOriginalMenuModal={handleOpenOriginalMenu}
          onSelectDimensionForEstimator={(len, h) => scrollToEstimator(len, h)}
        />

        {/* 5. Online Interactive Custom Quoting Estimator (帶入尺寸、加裝配件、LINE一鍵諮詢) */}
        <EstimatorCalculator
          initialLength={estimatorDimensions.length}
          initialHeight={estimatorDimensions.height}
          onOpenImageZoom={handleOpenImageZoom}
        />

        {/* 6. Order Disclaimers & Warranty Notice (出貨預組裝拍照、工具提醒、物流送一樓、1年保固全程錄影) */}
        <DisclaimerNotice />

        {/* 7. Materials & Craftsmanship (天然松木無甲醛、高透安全壓克力、靜音五金、對流通風) */}
        <MaterialsFeatures />

        {/* 8. Frequently Asked Questions (常見問題與訂購流程) */}
        <FaqSection />

        {/* 9. Contact & Ordering Section: LINE, Phone, Store Address Cards with Direct Click */}
        <ContactSection />
      </main>

      {/* Footer with Business Info & Back-to-Top */}
      <Footer />

      {/* Mobile Bottom Sticky Bar (Phone / LINE / Estimator) */}
      <MobileStickyBar onOpenEstimator={() => scrollToEstimator()} />

      {/* Lightbox Modal for Full Image Zoom */}
      <LightboxModal
        isOpen={lightbox.isOpen}
        title={lightbox.title}
        imageUrl={lightbox.imageUrl}
        subtitle={lightbox.subtitle}
        onClose={handleCloseLightbox}
      />

      {/* Original Paper Menu Viewer (User's 5 authentic attachments) */}
      <OriginalMenuModal
        isOpen={originalMenuModal.isOpen}
        initialIndex={originalMenuModal.initialIndex}
        onClose={handleCloseOriginalMenu}
      />
    </div>
  );
}
