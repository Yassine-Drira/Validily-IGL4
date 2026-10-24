"use client";

import React from "react";
import { SiteIntroOverlay } from "./site-intro-overlay";

interface PremiumCardIntroProps {
  user?: any;
}

/**
 * Premium VIP Card Intro Animation Overlay
 */
export function PremiumCardIntro(_props: PremiumCardIntroProps) {
  return <SiteIntroOverlay />;
}

export { SiteIntroOverlay };
