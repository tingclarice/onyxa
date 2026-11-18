"use client";

import { useEffect } from "react";

const HERO_ENTRANCE_THRESHOLD = 0.12;
const SECTION_REVEAL_THRESHOLD = 0.22;

export function LandingEntrances() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
      for (const { intersectionRatio, target } of entries) {
        if (!(target instanceof HTMLElement)) continue;
        const visibleFraction = target.hasAttribute("data-landing-reveal")
          ? SECTION_REVEAL_THRESHOLD
          : HERO_ENTRANCE_THRESHOLD;
        if (intersectionRatio >= visibleFraction) {
          observer.unobserve(target);
          target.style.setProperty("--landing-delay", `${target.dataset.landingEnter ?? 0}ms`);
          target.setAttribute("data-landing-entered", "");
        }
      }
    }, { threshold: [HERO_ENTRANCE_THRESHOLD, SECTION_REVEAL_THRESHOLD] });

    document.querySelectorAll("[data-landing-enter]").forEach((element) => observer.observe(element));

    const hero = document.querySelector("[data-landing-hero]");
    let heroIsVisible = false;
    const updateHeroMotion = () => {
      hero?.toggleAttribute("data-landing-hero-visible", heroIsVisible && !document.hidden);
    };
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroIsVisible = entry?.isIntersecting ?? false;
      updateHeroMotion();
    });
    if (hero) {
      heroObserver.observe(hero);
      document.addEventListener("visibilitychange", updateHeroMotion);
    }

    return () => {
      observer.disconnect();
      heroObserver.disconnect();
      document.removeEventListener("visibilitychange", updateHeroMotion);
    };
  }, []);

  return null;
}
