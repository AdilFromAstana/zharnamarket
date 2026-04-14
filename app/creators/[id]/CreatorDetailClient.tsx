"use client";

import { useState } from "react";
import type { CreatorProfile } from "@/lib/types/creator";
import ContactModal from "@/app/ads/[id]/ContactModal";
import ReportModal from "@/components/report/ReportModal";
import ReviewsSection from "@/components/reviews/ReviewsSection";
import AdPhotoGallery from "@/app/ads/[id]/AdPhotoGallery";
import { FileImageOutlined } from "@ant-design/icons";
import { api } from "@/lib/api-client";

import CreatorDetailHeader from "./CreatorDetailHeader";
import CreatorProfileSidebar from "./CreatorProfileSidebar";
import CreatorPortfolioSection from "./CreatorPortfolioSection";
import CreatorProofsSection from "./CreatorProofsSection";
import CreatorStickyBar from "./CreatorStickyBar";

interface CreatorDetailClientProps {
  creator: CreatorProfile;
  isPreview?: boolean;
}

export default function CreatorDetailClient({
  creator,
  isPreview,
}: CreatorDetailClientProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleContactClick = () => {
    setContactOpen(true);
    api.post(`/api/creators/${creator.id}/contact-click`).catch(() => {});
  };

  const contactChannels = [
    creator.contacts.telegram && "Telegram",
    creator.contacts.whatsapp && "WhatsApp",
    creator.contacts.phone && "Телефон",
    creator.contacts.email && "Email",
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-5 md:gap-6 pb-28 md:pb-6">
      <CreatorDetailHeader
        creatorName={creator.fullName}
        onReportOpen={() => setReportOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: profile sidebar */}
        <CreatorProfileSidebar
          creator={creator}
          contactChannels={contactChannels}
          onContactClick={handleContactClick}
        />

        {/* Right: content sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Screenshots */}
          {creator.screenshots.length > 0 && (
            <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileImageOutlined className="text-sky-500" /> Скриншоты работ
              </h2>
              <AdPhotoGallery
                images={creator.screenshots}
                title={creator.fullName}
              />
            </div>
          )}

          <CreatorPortfolioSection portfolio={creator.portfolio} />
          <CreatorProofsSection portfolio={creator.portfolio} />
          <ReviewsSection
            creatorProfileId={creator.id}
            creatorUserId={creator.userId}
          />
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <CreatorStickyBar
        pricing={creator.pricing}
        contactChannels={contactChannels}
        onContactClick={handleContactClick}
      />

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        contacts={creator.contacts}
        businessName={creator.fullName}
      />

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="creator"
        targetId={creator.id}
      />
    </div>
  );
}
