import { injectable, inject } from "inversify";
import Ch5MqttConnector from "../mqtt/MqttClient.ts";
import { DeviceInfo } from "../interop/DeviceInfo.ts";
import { LedAccessoryController } from "../interop/controllers/LedAccessoryController.ts";
import { HardButtonController } from "../interop/controllers/HardButtonController.ts";

interface HADiscoveryDevice {
    identifiers: string[];
    name: string;
    model: string;
    manufacturer: string;
    sw_version: string;
    configuration_url?: string;
}

interface HADiscoveryConfig {
    name: string;
    unique_id: string;
    device: HADiscoveryDevice;
    state_topic?: string;
    command_topic?: string;
    availability_topic?: string;
    payload_available?: string;
    payload_not_available?: string;
    [key: string]: any;
}

@injectable("Singleton")
export class AutodiscoveryService {
    private _mqttClient: Ch5MqttConnector;
    private _discoveryPrefix = "homeassistant";
    private _deviceId: string;
    private _baseTopic: string;
    private _device: HADiscoveryDevice;
    private _published: Set<string> = new Set();
    
    constructor(
        @inject(Ch5MqttConnector) mqttClient: Ch5MqttConnector,
        @inject(LedAccessoryController) private ledController: LedAccessoryController,
        @inject(HardButtonController) private buttonController: HardButtonController
    ) {
        this._mqttClient = mqttClient;
        
        // Generate unique device ID
        const model = DeviceInfo.getModelNumber() || "TSW-Unknown";
        const serial = DeviceInfo.getTSID() || "Unknown";
        this._deviceId = `crestron_${model}_${serial}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        this._baseTopic = `crestron/ch5_mqtt/${model}_${serial}`;
        
        // Create device info for all entities
        this._device = {
            identifiers: [this._deviceId],
            name: `Crestron ${model} - ${import.meta.env.VITE_TABLET_LOCATION || serial}`,
            model: model,
            manufacturer: "Crestron",
            sw_version: import.meta.env.VITE_APP_VERSION || "4.0.0",
            configuration_url: `http://${DeviceInfo.getIPAddress() || "unknown"}/`
        };
        
        this._mqttClient.readyPromise.then(() => {
            this.initialize();
        });
    }
    
    private initialize() {
        console.log("[AutodiscoveryService] Initializing MQTT Autodiscovery...");
        
        // Register MQTT route for autodiscovery control
        this._mqttClient.registerRoute("autodiscovery/refresh", this.publishAllDiscoveryConfigs.bind(this));
        this._mqttClient.registerRoute("autodiscovery/remove", this.removeAllDiscoveryConfigs.bind(this));
        
        // Publish availability
        this.publishAvailability();
        
        // Wait a bit for MQTT to stabilize, then publish discovery configs
        setTimeout(() => {
            this.publishAllDiscoveryConfigs();
        }, 5000);
        
        // Republish periodically to handle HA restarts
        setInterval(() => {
            this.publishAvailability();
        }, 60000); // Every minute
    }
    
    private publishAvailability() {
        this._mqttClient.sendMessage("status", "online", { retain: true });
    }
    
    private publishAllDiscoveryConfigs() {
        console.log("[AutodiscoveryService] Publishing discovery configurations...");
        
        // Device tracker (connectivity)
        this.publishDeviceTracker();
        
        // Hard buttons as binary sensors
        this.publishHardButtons();
        
        // Button LED brightness as light
        this.publishButtonBrightness();
        
        // LED accessory as light (if available)
        if (this.ledController.isAvailable()) {
            this.publishLedAccessory();
        }
        
        // Display power as switch
        this.publishDisplayPower();
        
        // Sensors for device info
        this.publishDeviceSensors();
        
        // Update sensor
        this.publishUpdateSensor();
        
        console.log(`[AutodiscoveryService] Published ${this._published.size} discovery configurations`);
    }
    
    private publishDeviceTracker() {
        const config: HADiscoveryConfig = {
            name: `${this._device.name} Status`,
            unique_id: `${this._deviceId}_status`,
            device: this._device,
            state_topic: `${this._baseTopic}/status`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            device_class: "connectivity",
            entity_category: "diagnostic"
        };
        
        this.publishDiscovery("binary_sensor", "status", config);
    }
    
    private publishHardButtons() {
        const buttons = [
            { id: "BUTTON_POWER", name: "Power Button", icon: "mdi:power" },
            { id: "BUTTON_HOME", name: "Home Button", icon: "mdi:home" },
            { id: "BUTTON_LIGHTBULB", name: "Light Button", icon: "mdi:lightbulb" },
            { id: "BUTTON_UP", name: "Up Button", icon: "mdi:arrow-up" },
            { id: "BUTTON_DOWN", name: "Down Button", icon: "mdi:arrow-down" }
        ];
        
        buttons.forEach(button => {
            // Button press as binary sensor
            const pressSensorConfig: HADiscoveryConfig = {
                name: `${this._device.name} ${button.name}`,
                unique_id: `${this._deviceId}_${button.id.toLowerCase()}_press`,
                device: this._device,
                state_topic: `${this._baseTopic}/hardButton/${button.id}/press`,
                availability_topic: `${this._baseTopic}/status`,
                payload_available: "online",
                payload_not_available: "offline",
                payload_on: "true",
                payload_off: "false",
                icon: button.icon
            };
            
            this.publishDiscovery("binary_sensor", `${button.id.toLowerCase()}_press`, pressSensorConfig);
            
            // Button LED active state as switch
            const ledSwitchConfig: HADiscoveryConfig = {
                name: `${this._device.name} ${button.name} LED`,
                unique_id: `${this._deviceId}_${button.id.toLowerCase()}_led`,
                device: this._device,
                state_topic: `${this._baseTopic}/hardButton/${button.id}/active`,
                command_topic: `${this._baseTopic}/hardButton/${button.id}/active`,
                availability_topic: `${this._baseTopic}/status`,
                payload_available: "online",
                payload_not_available: "offline",
                payload_on: "true",
                payload_off: "false",
                icon: `${button.icon}-outline`,
                entity_category: "config"
            };
            
            this.publishDiscovery("switch", `${button.id.toLowerCase()}_led`, ledSwitchConfig);
        });
    }
    
    private publishButtonBrightness() {
        const config: HADiscoveryConfig = {
            name: `${this._device.name} Button Brightness`,
            unique_id: `${this._deviceId}_button_brightness`,
            device: this._device,
            state_topic: `${this._baseTopic}/hardButton/brightness`,
            command_topic: `${this._baseTopic}/hardButton/brightness`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            brightness_scale: 65535,
            on_command_type: "brightness",
            schema: "json",
            icon: "mdi:brightness-6",
            entity_category: "config"
        };
        
        this.publishDiscovery("light", "button_brightness", config);
    }
    
    private publishLedAccessory() {
        const config: HADiscoveryConfig = {
            name: `${this._device.name} LED Strip`,
            unique_id: `${this._deviceId}_led_strip`,
            device: this._device,
            state_topic: `${this._baseTopic}/ledAccessory/power`,
            command_topic: `${this._baseTopic}/ledAccessory/power`,
            brightness_state_topic: `${this._baseTopic}/ledAccessory/brightness`,
            brightness_command_topic: `${this._baseTopic}/ledAccessory/brightness`,
            rgb_state_topic: `${this._baseTopic}/ledAccessory/color`,
            rgb_command_topic: `${this._baseTopic}/ledAccessory/color`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            payload_on: "true",
            payload_off: "false",
            brightness_scale: 100,
            schema: "json",
            effect_list: ["none", "rainbow", "pulse"],
            icon: "mdi:led-strip-variant"
        };
        
        this.publishDiscovery("light", "led_strip", config);
    }
    
    private publishDisplayPower() {
        const config: HADiscoveryConfig = {
            name: `${this._device.name} Display`,
            unique_id: `${this._deviceId}_display`,
            device: this._device,
            state_topic: `${this._baseTopic}/display/power`,
            command_topic: `${this._baseTopic}/display/power/set`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            payload_on: "true",
            payload_off: "false",
            icon: "mdi:monitor",
            device_class: "switch"
        };
        
        this.publishDiscovery("switch", "display", config);
    }
    
    private publishDeviceSensors() {
        // IP Address sensor
        const ipConfig: HADiscoveryConfig = {
            name: `${this._device.name} IP Address`,
            unique_id: `${this._deviceId}_ip_address`,
            device: this._device,
            state_topic: `${this._baseTopic}/device/ip_address`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            icon: "mdi:ip-network",
            entity_category: "diagnostic"
        };
        
        this.publishDiscovery("sensor", "ip_address", ipConfig);
        
        // Publish the actual IP
        this._mqttClient.sendMessage("device/ip_address", 
            DeviceInfo.getIPAddress() || "unknown", 
            { retain: true }
        );
        
        // Uptime sensor
        const uptimeConfig: HADiscoveryConfig = {
            name: `${this._device.name} Uptime`,
            unique_id: `${this._deviceId}_uptime`,
            device: this._device,
            state_topic: `${this._baseTopic}/device/uptime`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            unit_of_measurement: "seconds",
            device_class: "duration",
            state_class: "total_increasing",
            icon: "mdi:timer-outline",
            entity_category: "diagnostic"
        };
        
        this.publishDiscovery("sensor", "uptime", uptimeConfig);
        
        // Start publishing uptime
        const startTime = Date.now();
        setInterval(() => {
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            this._mqttClient.sendMessage("device/uptime", uptime.toString());
        }, 30000); // Every 30 seconds
        
        // Model sensor
        const modelConfig: HADiscoveryConfig = {
            name: `${this._device.name} Model`,
            unique_id: `${this._deviceId}_model`,
            device: this._device,
            state_topic: `${this._baseTopic}/device/model`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            icon: "mdi:information-outline",
            entity_category: "diagnostic"
        };
        
        this.publishDiscovery("sensor", "model", modelConfig);
        this._mqttClient.sendMessage("device/model", 
            DeviceInfo.getModelNumber() || "Unknown", 
            { retain: true }
        );
    }
    
    private publishUpdateSensor() {
        // Update available binary sensor
        const updateAvailableConfig: HADiscoveryConfig = {
            name: `${this._device.name} Update Available`,
            unique_id: `${this._deviceId}_update_available`,
            device: this._device,
            state_topic: `${this._baseTopic}/update/status`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            value_template: "{{ 'ON' if value_json.updateAvailable else 'OFF' }}",
            device_class: "update",
            icon: "mdi:package-up",
            entity_category: "diagnostic"
        };
        
        this.publishDiscovery("binary_sensor", "update_available", updateAvailableConfig);
        
        // Current version sensor
        const versionConfig: HADiscoveryConfig = {
            name: `${this._device.name} Version`,
            unique_id: `${this._deviceId}_version`,
            device: this._device,
            state_topic: `${this._baseTopic}/update/status`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            value_template: "{{ value_json.currentVersion }}",
            icon: "mdi:information-outline",
            entity_category: "diagnostic"
        };
        
        this.publishDiscovery("sensor", "version", versionConfig);
        
        // Update button
        const updateButtonConfig: HADiscoveryConfig = {
            name: `${this._device.name} Check Updates`,
            unique_id: `${this._deviceId}_check_updates`,
            device: this._device,
            command_topic: `${this._baseTopic}/update/check`,
            availability_topic: `${this._baseTopic}/status`,
            payload_available: "online",
            payload_not_available: "offline",
            payload_press: "{}",
            icon: "mdi:refresh",
            entity_category: "config"
        };
        
        this.publishDiscovery("button", "check_updates", updateButtonConfig);
    }
    
    private publishDiscovery(component: string, objectId: string, config: HADiscoveryConfig) {
        const topic = `${this._discoveryPrefix}/${component}/${this._deviceId}/${objectId}/config`;
        
        // Publish with retain flag so HA remembers the config
        this._mqttClient.sendMessage(
            topic.replace(`${this._baseTopic}/`, ""), 
            config, 
            { retain: true, qos: 1 }
        );
        
        this._published.add(`${component}/${objectId}`);
    }
    
    private removeAllDiscoveryConfigs() {
        console.log("[AutodiscoveryService] Removing all discovery configurations...");
        
        this._published.forEach(key => {
            const [component, objectId] = key.split('/');
            const topic = `${this._discoveryPrefix}/${component}/${this._deviceId}/${objectId}/config`;
            
            // Publish empty message with retain to remove the config
            this._mqttClient.sendMessage(
                topic.replace(`${this._baseTopic}/`, ""), 
                "", 
                { retain: true }
            );
        });
        
        this._published.clear();
        console.log("[AutodiscoveryService] All discovery configurations removed");
    }
}