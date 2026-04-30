"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const canRegister =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";

    if (!canRegister) {
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA install support should not block the calculator UI.
      });
    });
  }, []);

  return null;
}
