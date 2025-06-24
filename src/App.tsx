// Uncomment the below line if you are using CH5 components.
// import '@crestron/ch5-theme/output/themes/light-theme.css' // Crestron CSS. @crestron/ch5-theme/output/themes shows the other themes that can be used.
import './assets/css/App.css' // Your CSS

import { Ch5MqttBridge } from "./ch5_mqtt_bridge/Ch5MqttBridge.ts";

// Initialize eruda for panel/app debugging capabilities (in dev mode only)
if (import.meta.env.DEV) {
  import('eruda').then(({ default: eruda }) => {
    eruda.init();
  });
}

// initialize the bridge
const BridgeInstance = new Ch5MqttBridge();
window.Ch5MqttBridgeInstance = BridgeInstance;

BridgeInstance.start();

function App() {
  return (
    <>
      <iframe src={ import.meta.env.VITE_HA_DASHBOARD_URL } style={{ width: `100vw`, height: `100vh` }}/>
    </>
  )
}

export default App
