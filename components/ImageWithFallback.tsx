"use client";

import { useState } from "react";
import { ImageProps, Image, cn } from "@heroui/react";

import { extractDomain } from "@/lib/extractDomain";

const EMPTY_PLACEHOLDER_URL = "https://placehold.co/56?text=?";

const LOGO_DEV_URL = "https://img.logo.dev/";
const LOGO_DEV_TOKEN = "?token=pk_DxrQtA58T7qDKnpL24nlww";

const COMPANY_ROUNDED_LOGO_LIST = process.env.NEXT_PUBLIC_ROUNDED_LOGOS ? JSON.parse(process.env.NEXT_PUBLIC_ROUNDED_LOGOS) : ["TikTok"];

function cleanCompanyName(name: string): string {
  // Remove special characters, spaces, and convert to lowercase
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove any character that's not a letter or number
    .trim();
}

function getLogoDevFullUrl(url: string | null) {
  if (!url) return ""; // string | null as src can be string | null

  return `${LOGO_DEV_URL}${url}${LOGO_DEV_TOKEN}`;
}

export function ImageWithFallback({
  src,
  fallbackSrc = EMPTY_PLACEHOLDER_URL,
  companyName,
  className,
  ...props
}: {
  src: string | null;
  fallbackSrc?: string;
  companyName?: string;
  className?: string;
} & Omit<ImageProps, "src">) {
  const [imgSrc, setImgSrc] = useState(getLogoDevFullUrl(src) || fallbackSrc);
  const [fallbackStage, setFallbackStage] = useState(0); // 0: initial, 1: domain tried, 2: company tried

  const handleImageError = () => {
    // First try: Extract domain from failed URL
    if (fallbackStage === 0 && src) {
      const domain = extractDomain(src);
      const newSrc = getLogoDevFullUrl(domain);

      if (domain && imgSrc !== newSrc) {
        setImgSrc(newSrc);
        setFallbackStage(1);

        return;
      }
    }

    // Second try: Use company name
    if (fallbackStage <= 1 && companyName) {
      const cleanName = cleanCompanyName(companyName);
      const newSrc = getLogoDevFullUrl(cleanName);

      if (imgSrc !== newSrc) {
        setImgSrc(newSrc);
        setFallbackStage(2);

        return;
      }
    }

    // Final fallback: Use placeholder
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <Image
      {...props}
      alt="logo"
      src={imgSrc}
      classNames={{
        img: cn("h-full w-full !object-contain", className, {
          "!rounded-full": companyName && COMPANY_ROUNDED_LOGO_LIST.includes(companyName),
          "!rounded-xl": !(companyName && COMPANY_ROUNDED_LOGO_LIST.includes(companyName)),
        }),
      }}
      onError={handleImageError}
    />
  );
}
