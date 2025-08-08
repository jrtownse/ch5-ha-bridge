import { injectable, inject } from "inversify";
import Ch5MqttConnector from "../mqtt/MqttClient.ts";
import { DisplayController } from "../interop/controllers/DisplayController.ts";
import { HardButtonController } from "../interop/controllers/HardButtonController.ts";

interface ScreensaverConfig {
    enabled: boolean;
    timeout: number; // seconds
    mode: 'clock' | 'blank' | 'custom' | 'dashboard';
    brightness: number; // 0-100
    customContent?: string;
    dashboardUrl?: string;
    showWeather?: boolean;
    showDate?: boolean;
}

@injectable("Singleton")
export class ScreensaverService {
    private _mqttClient: Ch5MqttConnector;
    private _displayController: DisplayController;
    private _buttonController: HardButtonController;
    
    private _config: ScreensaverConfig = {
        enabled: false,
        timeout: 300, // 5 minutes default
        mode: 'clock',
        brightness: 20,
        showWeather: true,
        showDate: true
    };
    
    private _screensaverActive = false;
    private _lastActivity = Date.now();
    private _timeoutHandle: NodeJS.Timeout | null = null;
    private _clockInterval: NodeJS.Timeout | null = null;
    private _originalContent: HTMLElement | null = null;
    private _screensaverElement: HTMLDivElement | null = null;
    
    constructor(
        @inject(Ch5MqttConnector) mqttClient: Ch5MqttConnector,
        @inject(DisplayController) displayController: DisplayController,
        @inject(HardButtonController) buttonController: HardButtonController
    ) {
        this._mqttClient = mqttClient;
        this._displayController = displayController;
        this._buttonController = buttonController;
        
        this._mqttClient.readyPromise.then(() => {
            this.initialize();
        });
    }
    
    private initialize() {
        console.log("[ScreensaverService] Initializing screensaver service...");
        
        // Register MQTT routes
        this._mqttClient.registerRoute("screensaver/config", this.updateConfig.bind(this));
        this._mqttClient.registerRoute("screensaver/activate", this.activateScreensaver.bind(this));
        this._mqttClient.registerRoute("screensaver/deactivate", this.deactivateScreensaver.bind(this));
        this._mqttClient.registerRoute("screensaver/status", this.publishStatus.bind(this));
        
        // Load saved config from localStorage
        this.loadConfig();
        
        // Set up activity listeners
        this.setupActivityListeners();
        
        // Inject screensaver styles
        this.injectStyles();
        
        // Start monitoring if enabled
        if (this._config.enabled) {
            this.startMonitoring();
        }
        
        // Publish initial status
        this.publishStatus();
    }
    
    private setupActivityListeners() {
        // Listen for any user interaction
        const resetActivity = () => {
            this._lastActivity = Date.now();
            
            if (this._screensaverActive) {
                this.deactivateScreensaver();
            }
            
            if (this._config.enabled) {
                this.resetTimeout();
            }
        };
        
        // Touch/click events
        document.addEventListener('touchstart', resetActivity, { passive: true });
        document.addEventListener('click', resetActivity, { passive: true });
        document.addEventListener('mousemove', resetActivity, { passive: true });
        
        // Hardware button events
        this._buttonController.on('buttonStateChange', resetActivity);
        
        // MQTT activity
        this._mqttClient.registerRoute("screensaver/reset", resetActivity);
    }
    
    private startMonitoring() {
        if (this._timeoutHandle) {
            clearTimeout(this._timeoutHandle);
        }
        
        this._timeoutHandle = setTimeout(() => {
            if (!this._screensaverActive && this._config.enabled) {
                this.activateScreensaver();
            }
        }, this._config.timeout * 1000);
    }
    
    private resetTimeout() {
        if (this._timeoutHandle) {
            clearTimeout(this._timeoutHandle);
        }
        
        if (this._config.enabled) {
            this.startMonitoring();
        }
    }
    
    private activateScreensaver() {
        if (this._screensaverActive) return;
        
        console.log("[ScreensaverService] Activating screensaver...");
        this._screensaverActive = true;
        
        // Store original content
        const mainContent = document.getElementById('root');
        if (mainContent) {
            this._originalContent = mainContent;
            mainContent.style.display = 'none';
        }
        
        // Create screensaver element
        this._screensaverElement = document.createElement('div');
        this._screensaverElement.id = 'screensaver';
        this._screensaverElement.className = 'screensaver-container';
        
        // Apply brightness
        this._screensaverElement.style.filter = `brightness(${this._config.brightness}%)`;
        
        // Render based on mode
        switch (this._config.mode) {
            case 'clock':
                this.renderClockMode();
                break;
            case 'blank':
                this.renderBlankMode();
                break;
            case 'dashboard':
                this.renderDashboardMode();
                break;
            case 'custom':
                this.renderCustomMode();
                break;
        }
        
        document.body.appendChild(this._screensaverElement);
        
        // Reduce display brightness if supported
        this._displayController.setBrightness(Math.floor(this._config.brightness * 655.35));
        
        // Publish status
        this._mqttClient.sendMessage("screensaver/active", true);
    }
    
    private deactivateScreensaver() {
        if (!this._screensaverActive) return;
        
        console.log("[ScreensaverService] Deactivating screensaver...");
        this._screensaverActive = false;
        
        // Remove screensaver element
        if (this._screensaverElement) {
            document.body.removeChild(this._screensaverElement);
            this._screensaverElement = null;
        }
        
        // Restore original content
        if (this._originalContent) {
            this._originalContent.style.display = '';
            this._originalContent = null;
        }
        
        // Clear clock interval if active
        if (this._clockInterval) {
            clearInterval(this._clockInterval);
            this._clockInterval = null;
        }
        
        // Restore display brightness
        this._displayController.setBrightness(65535);
        
        // Reset timeout if enabled
        if (this._config.enabled) {
            this.resetTimeout();
        }
        
        // Publish status
        this._mqttClient.sendMessage("screensaver/active", false);
    }
    
    private renderClockMode() {
        if (!this._screensaverElement) return;
        
        const clockContainer = document.createElement('div');
        clockContainer.className = 'screensaver-clock';
        
        const timeElement = document.createElement('div');
        timeElement.className = 'screensaver-time';
        
        const dateElement = document.createElement('div');
        dateElement.className = 'screensaver-date';
        
        const weatherElement = document.createElement('div');
        weatherElement.className = 'screensaver-weather';
        
        clockContainer.appendChild(timeElement);
        
        if (this._config.showDate) {
            clockContainer.appendChild(dateElement);
        }
        
        if (this._config.showWeather) {
            clockContainer.appendChild(weatherElement);
            this.fetchWeather(weatherElement);
        }
        
        this._screensaverElement.appendChild(clockContainer);
        
        // Update clock every second
        const updateClock = () => {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            if (this._config.showDate) {
                dateElement.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        };
        
        updateClock();
        this._clockInterval = setInterval(updateClock, 1000);
    }
    
    private renderBlankMode() {
        if (!this._screensaverElement) return;
        this._screensaverElement.style.backgroundColor = 'black';
    }
    
    private renderDashboardMode() {
        if (!this._screensaverElement || !this._config.dashboardUrl) return;
        
        const iframe = document.createElement('iframe');
        iframe.src = this._config.dashboardUrl;
        iframe.className = 'screensaver-dashboard';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        this._screensaverElement.appendChild(iframe);
    }
    
    private renderCustomMode() {
        if (!this._screensaverElement) return;
        
        if (this._config.customContent) {
            this._screensaverElement.innerHTML = this._config.customContent;
        } else {
            this._screensaverElement.innerHTML = '<div class="screensaver-message">Custom screensaver content not configured</div>';
        }
    }
    
    private async fetchWeather(element: HTMLElement) {
        // This would integrate with Home Assistant's weather entity
        // For now, just show placeholder
        element.textContent = '72°F | Partly Cloudy';
        
        // Subscribe to weather updates via MQTT
        this._mqttClient.registerRoute("weather/current", (topic, data) => {
            if (element && data.temperature && data.condition) {
                element.textContent = `${data.temperature}°F | ${data.condition}`;
            }
        });
    }
    
    private updateConfig(topic: string, config: Partial<ScreensaverConfig>) {
        console.log("[ScreensaverService] Updating configuration:", config);
        
        const wasEnabled = this._config.enabled;
        
        // Update config
        this._config = { ...this._config, ...config };
        
        // Save to localStorage
        this.saveConfig();
        
        // Handle enable/disable
        if (config.enabled !== undefined) {
            if (config.enabled && !wasEnabled) {
                this.startMonitoring();
            } else if (!config.enabled && wasEnabled) {
                if (this._timeoutHandle) {
                    clearTimeout(this._timeoutHandle);
                    this._timeoutHandle = null;
                }
                if (this._screensaverActive) {
                    this.deactivateScreensaver();
                }
            }
        }
        
        // Update timeout if changed
        if (config.timeout !== undefined && this._config.enabled) {
            this.resetTimeout();
        }
        
        // Update brightness if screensaver is active
        if (config.brightness !== undefined && this._screensaverActive && this._screensaverElement) {
            this._screensaverElement.style.filter = `brightness(${config.brightness}%)`;
            this._displayController.setBrightness(Math.floor(config.brightness * 655.35));
        }
        
        this.publishStatus();
    }
    
    private publishStatus() {
        const status = {
            enabled: this._config.enabled,
            active: this._screensaverActive,
            mode: this._config.mode,
            timeout: this._config.timeout,
            brightness: this._config.brightness,
            lastActivity: new Date(this._lastActivity).toISOString(),
            config: this._config
        };
        
        this._mqttClient.sendMessage("screensaver/status", status);
    }
    
    private loadConfig() {
        const saved = localStorage.getItem('screensaverConfig');
        if (saved) {
            try {
                this._config = { ...this._config, ...JSON.parse(saved) };
            } catch (error) {
                console.error("[ScreensaverService] Error loading config:", error);
            }
        }
    }
    
    private saveConfig() {
        try {
            localStorage.setItem('screensaverConfig', JSON.stringify(this._config));
        } catch (error) {
            console.error("[ScreensaverService] Error saving config:", error);
        }
    }
    
    private injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .screensaver-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: black;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .screensaver-clock {
                text-align: center;
                color: white;
            }
            
            .screensaver-time {
                font-size: 8vw;
                font-weight: 200;
                letter-spacing: -0.5vw;
                margin-bottom: 2vh;
            }
            
            .screensaver-date {
                font-size: 2vw;
                font-weight: 300;
                opacity: 0.8;
                margin-bottom: 2vh;
            }
            
            .screensaver-weather {
                font-size: 2.5vw;
                font-weight: 300;
                opacity: 0.7;
            }
            
            .screensaver-message {
                color: white;
                font-size: 2vw;
                text-align: center;
                opacity: 0.7;
            }
            
            .screensaver-dashboard {
                width: 100%;
                height: 100%;
            }
        `;
        document.head.appendChild(style);
    }
}