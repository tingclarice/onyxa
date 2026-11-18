"use client";

import { useEffect } from "react";

export function LandingEntrances() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting || !(target instanceof HTMLElement)) continue;
        observer.unobserve(target);
        target.style.setProperty("--landing-delay", `${target.dataset.landingEnter ?? 0}ms`);
        target.setAttribute("data-landing-entered", "");
      }
    }, { threshold: 0.12 });

    document.querySelectorAll("[data-landing-enter]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}
