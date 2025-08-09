import './assets/css/App.css' // Your CSS

import { useState, useEffect } from 'react';
import { Ch5MqttBridge } from "./ch5_mqtt_bridge/Ch5MqttBridge.ts";
import HomeAssistantFrame from "./components/HomeAssistantFrame.tsx";
import ConfigPanel from "./components/ConfigPanel.tsx";

// Initialize eruda for panel/app debugging capabilities (in dev mode only)
if (import.meta.env.DEV || import.meta.env.MODE === "development") {
  import('eruda').then(({ default: eruda }) => {
    eruda.init();
  });
}

// initialize the bridge
const BridgeInstance = new Ch5MqttBridge();
window.Ch5MqttBridgeInstance = BridgeInstance;

BridgeInstance.start();

function App() {
  const [showConfig, setShowConfig] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Setup config panel trigger - 5 taps in top-right corner
    const handleTap = (e: TouchEvent | MouseEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      // Check if tap is in top-right corner (100x100 pixel area)
      if (x > window.innerWidth - 100 && y < 100) {
        setTapCount(prev => {
          const newCount = prev + 1;
          
          // Clear existing timer
          if (tapTimer) {
            clearTimeout(tapTimer);
          }
          
          // Set new timer to reset count after 2 seconds
          const timer = setTimeout(() => {
            setTapCount(0);
          }, 2000);
          setTapTimer(timer);
          
          // Open config panel after 5 taps
          if (newCount >= 5) {
            setShowConfig(true);
            return 0;
          }
          
          return newCount;
        });
      }
    };

    // Add both touch and click listeners for compatibility
    document.addEventListener('touchstart', handleTap);
    document.addEventListener('click', handleTap);

    return () => {
      document.removeEventListener('touchstart', handleTap);
      document.removeEventListener('click', handleTap);
      if (tapTimer) {
        clearTimeout(tapTimer);
      }
    };
  }, [tapTimer]);

  return (
    <>
      <HomeAssistantFrame />
      {showConfig && <ConfigPanel onClose={() => setShowConfig(false)} />}
      
      {/* Hidden tap area indicator (only in dev mode) */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 100,
          height: 100,
          border: '1px dashed rgba(255,0,0,0.2)',
          pointerEvents: 'none',
          zIndex: 9998
        }}>
          <span style={{
            position: 'absolute',
            bottom: 5,
            left: 5,
            fontSize: 10,
            color: 'rgba(255,0,0,0.4)'
          }}>
            Config: {tapCount}/5
          </span>
        </div>
      )}
    </>
  )
}

export default App;
