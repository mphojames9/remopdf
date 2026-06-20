import React, { useEffect } from 'react';

export default function ModalAd({ slotId = "7609882921" }) {
  useEffect(() => {
    try {
      // This triggers AdSense to fill the <ins> tag with the actual ad
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense failed: ", error);
    }
  }, []);

  return (
    <div className="ad-container my-4 flex justify-center">
      <ins 
        className="adsbygoogle"
        // These styles now exactly match your generated snippet
        style={{ display: 'inline-block', width: '320px', height: '70px' }}
        data-ad-client="ca-pub-6068689040743381" 
        data-ad-slot={slotId}                     
      />
    </div>
  );
}