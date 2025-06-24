import {injectable, inject} from "inversify";
import Ch5MqttConnector from "../mqtt/MqttClient.ts";

import {DisplayController} from "../interop/controllers/DisplayController.ts";

@injectable("Singleton")
export class DisplayService {

    constructor(
        @inject(DisplayController) public displayController: DisplayController,
        @inject(Ch5MqttConnector) public mqttClient: Ch5MqttConnector
    ) {
        this.mqttClient.connectCallback(() => {
            this.displayController.onBacklightPowerChange(this._onDisplayPowerChange.bind(this));
            this.displayController.onBacklightBrightnessChange(this._onDisplayBrightnessChange.bind(this));
        })

        this.mqttClient.registerRoute("display/power", this.setDisplayPower.bind(this));
        this.mqttClient.registerRoute("display/brightness", this.setDisplayBrightness.bind(this));
    }

    private setDisplayPower(_topic: string, message: any, _params?: Record<string, string>): void {
        if (typeof message === "boolean") {
            this.displayController.backlightPower = message;
        } else {
            console.warn("[LedAccessoryService] Invalid power message received:", message);
        }
    }

    private _onDisplayPowerChange(newState: boolean): void {
        this.mqttClient.sendMessage("display/power", newState);
        console.log("[DisplayService] Display power state changed:", newState);
    }

    private setDisplayBrightness(_topic: string, message: any, _params?: Record<string, string>): void {
        if (typeof message === "number") {
            this.displayController.backlightBrightness = message;
        } else {
            console.warn("[LedAccessoryService] Invalid brightness message received:", message);
        }
    }

    private _onDisplayBrightnessChange(newBrightness: number): void {
        this.mqttClient.sendMessage("display/brightness", newBrightness);
        console.log("[DisplayService] Display brightness changed:", newBrightness);
    }
}