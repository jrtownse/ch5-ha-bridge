import { injectable, inject } from "inversify";
import Ch5MqttConnector from "../mqtt/MqttClient.ts";

interface UpdateManifest {
    version: string;
    releaseDate: string;
    releaseNotes: string;
    downloadUrl: string;
    checksum: string;
    minVersion?: string;
    criticalUpdate?: boolean;
}

@injectable("Singleton")
export class UpdateService {
    private _mqttClient: Ch5MqttConnector;
    private _currentVersion: string;
    private _updateCheckInterval: number;
    private _updateServerUrl: string;
    private _autoUpdate: boolean;
    private _checkTimer: NodeJS.Timeout | null = null;
    private _lastCheckTime: number = 0;
    private _updateManifest: UpdateManifest | null = null;

    constructor(@inject(Ch5MqttConnector) mqttClient: Ch5MqttConnector) {
        this._mqttClient = mqttClient;
        
        // Get configuration from environment variables
        this._currentVersion = import.meta.env.VITE_APP_VERSION || "4.0.0";
        this._updateServerUrl = import.meta.env.VITE_UPDATE_SERVER || "";
        this._autoUpdate = import.meta.env.VITE_AUTO_UPDATE === "true";
        this._updateCheckInterval = parseInt(import.meta.env.VITE_UPDATE_CHECK_INTERVAL || "3600") * 1000;

        this._mqttClient.readyPromise.then(() => {
            this.initialize();
        });
    }

    private initialize() {
        // Register MQTT routes for update control
        this._mqttClient.registerRoute("update/check", this.checkForUpdates.bind(this));
        this._mqttClient.registerRoute("update/apply", this.applyUpdate.bind(this));
        this._mqttClient.registerRoute("update/status", this.getUpdateStatus.bind(this));
        this._mqttClient.registerRoute("update/config", this.updateConfig.bind(this));

        // Publish initial status
        this.publishStatus();

        // Start periodic update checks if configured
        if (this._updateServerUrl && this._updateCheckInterval > 0) {
            this.startPeriodicChecks();
        }

        console.log(`[UpdateService] Initialized - Version: ${this._currentVersion}, Auto-update: ${this._autoUpdate}`);
    }

    private startPeriodicChecks() {
        if (this._checkTimer) {
            clearInterval(this._checkTimer);
        }

        // Initial check after 30 seconds
        setTimeout(() => this.checkForUpdates(), 30000);

        // Periodic checks
        this._checkTimer = setInterval(() => {
            this.checkForUpdates();
        }, this._updateCheckInterval);
    }

    private async checkForUpdates(): Promise<void> {
        if (!this._updateServerUrl) {
            console.log("[UpdateService] Update server URL not configured, skipping check");
            return;
        }

        try {
            console.log("[UpdateService] Checking for updates...");
            
            const manifestUrl = `${this._updateServerUrl}/manifest.json`;
            const response = await fetch(manifestUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch manifest: ${response.status}`);
            }

            const manifest: UpdateManifest = await response.json();
            this._lastCheckTime = Date.now();
            
            // Compare versions
            const updateAvailable = this.isNewerVersion(manifest.version, this._currentVersion);
            
            if (updateAvailable) {
                this._updateManifest = manifest;
                console.log(`[UpdateService] Update available: ${manifest.version}`);
                
                // Publish update availability
                this._mqttClient.sendMessage("update/available", {
                    current: this._currentVersion,
                    available: manifest.version,
                    releaseDate: manifest.releaseDate,
                    releaseNotes: manifest.releaseNotes,
                    critical: manifest.criticalUpdate || false
                });

                // Auto-apply if configured and not critical
                if (this._autoUpdate && !manifest.criticalUpdate) {
                    console.log("[UpdateService] Auto-applying update...");
                    setTimeout(() => this.applyUpdate(), 5000);
                }
            } else {
                console.log("[UpdateService] No updates available");
                this._updateManifest = null;
            }

            this.publishStatus();
            
        } catch (error) {
            console.error("[UpdateService] Error checking for updates:", error);
            this._mqttClient.sendMessage("update/error", {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    private async applyUpdate(): Promise<void> {
        if (!this._updateManifest) {
            console.log("[UpdateService] No update manifest available");
            return;
        }

        try {
            console.log(`[UpdateService] Applying update ${this._updateManifest.version}...`);
            
            // Publish update progress
            this._mqttClient.sendMessage("update/progress", {
                status: "downloading",
                version: this._updateManifest.version
            });

            // Download the update package
            const response = await fetch(this._updateManifest.downloadUrl);
            if (!response.ok) {
                throw new Error(`Failed to download update: ${response.status}`);
            }

            const updateData = await response.blob();
            
            // Verify checksum if provided
            if (this._updateManifest.checksum) {
                const verified = await this.verifyChecksum(updateData, this._updateManifest.checksum);
                if (!verified) {
                    throw new Error("Update checksum verification failed");
                }
            }

            // Store update in local storage for application on next reload
            this._mqttClient.sendMessage("update/progress", {
                status: "installing",
                version: this._updateManifest.version
            });

            // Save update metadata
            localStorage.setItem("pendingUpdate", JSON.stringify({
                version: this._updateManifest.version,
                timestamp: Date.now()
            }));

            // Schedule reload after a delay
            this._mqttClient.sendMessage("update/progress", {
                status: "reloading",
                version: this._updateManifest.version
            });

            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (error) {
            console.error("[UpdateService] Error applying update:", error);
            this._mqttClient.sendMessage("update/error", {
                error: error.message,
                version: this._updateManifest.version,
                timestamp: new Date().toISOString()
            });
        }
    }

    private async verifyChecksum(data: Blob, expectedChecksum: string): Promise<boolean> {
        try {
            const buffer = await data.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return hashHex === expectedChecksum;
        } catch (error) {
            console.error("[UpdateService] Error verifying checksum:", error);
            return false;
        }
    }

    private getUpdateStatus(): void {
        this.publishStatus();
    }

    private publishStatus(): void {
        const status = {
            currentVersion: this._currentVersion,
            updateAvailable: this._updateManifest !== null,
            availableVersion: this._updateManifest?.version || null,
            lastCheck: this._lastCheckTime ? new Date(this._lastCheckTime).toISOString() : null,
            autoUpdate: this._autoUpdate,
            updateServerConfigured: !!this._updateServerUrl,
            checkInterval: this._updateCheckInterval / 1000
        };

        this._mqttClient.sendMessage("update/status", status);
    }

    private updateConfig(topic: string, message: any): void {
        if (message.autoUpdate !== undefined) {
            this._autoUpdate = message.autoUpdate;
            console.log(`[UpdateService] Auto-update set to: ${this._autoUpdate}`);
        }

        if (message.checkInterval !== undefined) {
            this._updateCheckInterval = message.checkInterval * 1000;
            console.log(`[UpdateService] Check interval set to: ${message.checkInterval} seconds`);
            
            // Restart periodic checks with new interval
            if (this._updateServerUrl) {
                this.startPeriodicChecks();
            }
        }

        this.publishStatus();
    }

    private isNewerVersion(available: string, current: string): boolean {
        const availableParts = available.split('.').map(Number);
        const currentParts = current.split('.').map(Number);

        for (let i = 0; i < Math.max(availableParts.length, currentParts.length); i++) {
            const availablePart = availableParts[i] || 0;
            const currentPart = currentParts[i] || 0;

            if (availablePart > currentPart) {
                return true;
            } else if (availablePart < currentPart) {
                return false;
            }
        }

        return false;
    }

    public checkPendingUpdate(): void {
        // Check if there's a pending update from previous session
        const pendingUpdate = localStorage.getItem("pendingUpdate");
        if (pendingUpdate) {
            try {
                const update = JSON.parse(pendingUpdate);
                console.log(`[UpdateService] Pending update detected: ${update.version}`);
                
                // Clear pending update
                localStorage.removeItem("pendingUpdate");
                
                // Update current version
                this._currentVersion = update.version;
                
                // Notify about successful update
                this._mqttClient.sendMessage("update/complete", {
                    version: update.version,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error("[UpdateService] Error processing pending update:", error);
            }
        }
    }
}