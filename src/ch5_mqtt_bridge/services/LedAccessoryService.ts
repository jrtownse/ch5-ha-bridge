import { injectable, inject } from "inversify";
import Ch5MqttConnector from "../mqtt/MqttClient.ts";

import { LedAccessoryController} from "../interop/controllers/LedAccessoryController.ts";

@injectable("Singleton")
export class LedAccessoryService {

    constructor(
        @inject(LedAccessoryController) public ledAccessoryController: LedAccessoryController,
        @inject(Ch5MqttConnector) public mqttClient: Ch5MqttConnector
    ) {
        this.mqttClient.connectCallback(() => {
            this.mqttClient.sendMessage("ledAccessory/available", this.ledAccessoryController.hasAccessory, { retain: true });

            this.ledAccessoryController.addLedStateChangeCallback(this._onLedStateChange.bind(this));
        })

        this.mqttClient.registerRoute("ledAccessory/color", this.setLedColor.bind(this));
        this.mqttClient.registerRoute("ledAccessory/brightness", this.setLedBrightness.bind(this));
        this.mqttClient.registerRoute("ledAccessory/power", this.setLedPower.bind(this));
    }


    private _onLedStateChange(): void {
        const color = this.ledAccessoryController.color;
        if (color) {
            this.mqttClient.sendMessage("ledAccessory/color", {r: color[0], g: color[1], b: color[2]});
        }

        const brightness = this.ledAccessoryController.brightness;
        this.mqttClient.sendMessage("ledAccessory/brightness", brightness);

        const power = this.ledAccessoryController.power;
        this.mqttClient.sendMessage("ledAccessory/power", power);
    }

    private setLedColor(_topic: string, message: any, _params?: Record<string, string>): void {
        if (typeof message === "object" && message.r !== undefined && message.g !== undefined && message.b !== undefined) {
            this.ledAccessoryController.color = [message.r, message.g, message.b];
        } else if (typeof message === "string") {
            this.ledAccessoryController.setColor(message);
        } else if (Array.isArray(message) && message.length === 3 && message.every(num => typeof num === "number")) {
            this.ledAccessoryController.color = message as [number, number, number];
        } else {
            console.warn("[LedAccessoryService] Invalid color message received:", message);
        }
    }

    private setLedBrightness(_topic: string, message: any, _params?: Record<string, string>): void {
        if (typeof message === "number") {
            this.ledAccessoryController.brightness = message;
        } else {
            console.warn("[LedAccessoryService] Invalid brightness message received:", message);
        }
    }

    private setLedPower(_topic: string, message: any, _params?: Record<string, string>): void {
        if (typeof message === "boolean") {
            this.ledAccessoryController.power = message;
        } else {
            console.warn("[LedAccessoryService] Invalid power message received:", message);
        }
    }
}