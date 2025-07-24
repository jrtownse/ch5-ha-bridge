import './assets/css/App.css' // Your CSS

import { Ch5MqttBridge } from "./ch5_mqtt_bridge/Ch5MqttBridge.ts";
import HomeAssistantFrame from "./components/HomeAssistantFrame.tsx";

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
  return (
    <>
      <HomeAssistantFrame />
    </>
  )
}

export default App;
