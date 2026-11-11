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
      {/* Top Navigation */}
      <Navbar onOpenEstimator={() => scrollToEstimator()} />

      {/* Main Single-page Layout Sections */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <HeroSection
          onOpenEstimator={() => scrollToEstimator()}
          onViewMenuImages={() => handleOpenOriginalMenu(0)}
          onOpenImageZoom={handleOpenImageZoom}
        />

        {/* 2. In-Stock Showcase: 門店現貨實拍區（台中豐原店內現成款式、店主密碼上傳與售出刪除卡片） */}
        <InStockSection onOpenImageZoom={handleOpenImageZoom} />

        {/* 3. Featured Cat Villa Models */}
        <FeaturedModels
          onSelectForQuote={handleSelectModelForQuote}
          onOpenImageZoom={handleOpenImageZoom}
        />

        {/* 4. Brand Story & Muse Hua Hua */}
        <BrandStorySection onOpenImageZoom={handleOpenImageZoom} />

        {/* 5. Customer Custom Showcase & Gallery */}
        <ShowcaseGallery onOpenImageZoom={handleOpenImageZoom} />

        {/* 6. Complete Menu Pricing Tables */}
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

        {/* 8. Order Disclaimers & Warranty Notice */}
        <DisclaimerNotice />

        {/* 9. Materials & Craftsmanship */}
        <MaterialsFeatures />

        {/* 10. Frequently Asked Questions */}
        <FaqSection />

        {/* 11. Contact & Ordering Section */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Sticky Bar */}
      <MobileStickyBar onOpenEstimator={() => scrollToEstimator()} />

      {/* Lightbox Modal */}
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
