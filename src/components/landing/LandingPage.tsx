import React from 'react';
import { ArrowRight } from 'lucide-react';
import { BoomerangVideoBg } from './BoomerangVideoBg';
import { GoogleLogoSvg } from '../auth/GoogleSignInModal';

interface LandingPageProps {
  onOpenLogin: () => void;
  onGoogleSignIn?: (email?: string, name?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin, onGoogleSignIn }) => {
  return (
    <div className="min-h-screen bg-white text-[#191919] font-sans antialiased selection:bg-[#191919] selection:text-white overflow-hidden relative">
      {/* ========================================================================= */}
      {/* FIXED NAVBAR                                                              */}
      {/* ========================================================================= */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex items-center justify-between pointer-events-auto">
        {/* Left: The Inclusion Project Emblem + Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onOpenLogin}>
          <img
            src="/tip-emblem.svg"
            alt="The Inclusion Project"
            className="h-8 w-auto object-contain"
          />
          <span className="font-semibold text-sm tracking-tight text-[#191919]">
            The Inclusion Project
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-widest text-[#191919]/45 border-l border-[#191919]/20 pl-2">
            CRM Portal
          </span>
        </div>

        {/* Center Links (directly from www.theinclusionproject.com) */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="https://www.theinclusionproject.com/programs/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
          >
            Programs
          </a>
          <a
            href="https://www.theinclusionproject.com/people/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
          >
            People
          </a>
          <a
            href="https://www.theinclusionproject.com/events/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
          >
            Events
          </a>
          <a
            href="https://www.theinclusionproject.com/tip-insights/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
          >
            Insights
          </a>
          <a
            href="https://www.theinclusionproject.com/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
          >
            Contact
          </a>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onGoogleSignIn ? onGoogleSignIn() : onOpenLogin()}
            className="px-3.5 sm:px-4 py-2 bg-white border border-zinc-200/90 text-zinc-800 text-xs sm:text-sm font-medium rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 cursor-pointer shadow-2xs flex items-center gap-2"
          >
            <GoogleLogoSvg className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
            <span className="hidden xs:inline">Sign in with Google</span>
            <span className="xs:hidden">Google</span>
          </button>
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#191919] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200 cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>Sign In</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* HERO SECTION (Centered Full-Viewport with Center Logo)                    */}
      {/* ========================================================================= */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden h-screen px-4 sm:px-6">
        {/* Full bleed boomerang background video (ping-pong at 30fps) */}
        <BoomerangVideoBg />

        {/* Hero Copy Block (Vertically & Horizontally Centered) */}
        <div className="relative z-10 text-center flex flex-col items-center max-w-4xl mx-auto pt-10 sm:pt-14 px-4">
          {/* Inclusion Project Logo in the Middle */}
          <div className="mb-5 sm:mb-7 flex flex-col items-center">
            <img
              src="/tip-logo.svg"
              alt="The Inclusion Project ...in our hands"
              className="h-16 sm:h-20 md:h-24 w-auto object-contain drop-shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
              onClick={onOpenLogin}
            />
          </div>

          {/* AREDI+ Framework Kicker Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 mb-4 sm:mb-5 rounded-full bg-white/85 backdrop-blur-xs border border-zinc-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ea0543] animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-700 font-medium">
              Accessibility · Racial Equity · Diversity · Inclusion
            </span>
          </div>

          {/* Official Core Heading from theinclusionproject.com */}
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.12] tracking-tight text-[#191919] font-normal">
            Advancing equity,<br className="hidden sm:inline" /> diversity & inclusion.
          </h1>

          {/* Official Mission & Analytics Wording from theinclusionproject.com */}
          <p className="max-w-xl sm:max-w-2xl mt-4 sm:mt-5 text-sm sm:text-base md:text-[17px] text-[#191919]/80 leading-relaxed font-normal">
            The Inclusion Project (TIP) actively engages partners and decision-makers through evidence-based research, racial and gender data analytics, and community frameworks — charting new pathways for equity across Canadian society.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md sm:max-w-none">
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-7 sm:px-9 py-3 sm:py-3.5 bg-[#191919] text-white text-sm sm:text-base font-medium rounded-lg hover:bg-[#191919]/90 transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center gap-2 group"
            >
              <span>Sign In to CRM Portal</span>
              <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 group-hover:text-white transition-all duration-200" />
            </button>
            <button
              type="button"
              onClick={() => onGoogleSignIn ? onGoogleSignIn() : onOpenLogin()}
              className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 bg-white text-zinc-800 border border-zinc-200/90 text-sm sm:text-base font-medium rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 cursor-pointer shadow-2xs flex items-center justify-center gap-2.5"
            >
              <GoogleLogoSvg className="w-4 h-4 shrink-0" />
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
