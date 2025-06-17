// Uncomment the below line if you are using CH5 components.
// import '@crestron/ch5-theme/output/themes/light-theme.css' // Crestron CSS. @crestron/ch5-theme/output/themes shows the other themes that can be used.
import './assets/css/App.css' // Your CSS
import { useState, useEffect, useMemo } from 'react';

import { Ch5MqttBridge } from "./ch5_mqtt_bridge/Ch5MqttBridge.ts";

// Initialize eruda for panel/app debugging capabilities (in dev mode only)
if (import.meta.env.VITE_APP_ENV === 'development') {
  import('eruda').then(({ default: eruda }) => {
    eruda.init();
  });
}

// initialize the bridge
setTimeout(() => {
  const BridgeInstance = new Ch5MqttBridge();
  window.Ch5MqttBridgeInstance = BridgeInstance;

  BridgeInstance.start();
}, 5_000);

function App() {
  useEffect(() => {
  })

  return (
    <>
        <h1 style={{ color: "#888888" }}>Hello, world.</h1>
      <iframe src={ import.meta.env.VITE_HA_DASHBOARD_URL }/>
    </>
  )
}

export default App
