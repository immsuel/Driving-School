"use client"; // Required because we are using useEffect for the auto-download

import { useEffect, useRef } from "react";

export default function HomePage() {
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Trigger the download automatically after 1 second
    const timer = setTimeout(() => {
      if (downloadLinkRef.current) {
        downloadLinkRef.current.click();
      }
    }, 1000);

    return () => clearTimeout(timer); // Clean up timer on unmount
  }, []);

  // URL encoded string for: /Admin - Dees Driver Training Centre.exe
  const fileUrl = "/Admin%20-%20Dees%20Driver%20Training%20Centre.exe";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center font-sans">
      <div className="max-w-md rounded-xl bg-white p-8 shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Downloading Your Software...
        </h1>
        <p className="text-gray-600 mb-6">
          Your download should start automatically in a moment.
        </p>

        {/* Hidden/Fallback Link */}
        <a
          ref={downloadLinkRef}
          href={fileUrl}
          download="Admin - Dees Driver Training Centre.exe"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          If it didn't start, click here
        </a>
      </div>
    </div>
  );
}