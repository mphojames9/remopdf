import React, { useEffect } from 'react';

export default function ModalAd({ slotId }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense failed: ", error);
    }
  }, []);

  return (
    <div className="ad-container my-4 flex justify-center">
      <ins 
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '90px' }}
        data-ad-client="ca-pub-6068689040743381" // Your actual ID
        data-ad-slot={slotId}                     // Your specific Ad Unit ID
      />
    </div>
  );
}