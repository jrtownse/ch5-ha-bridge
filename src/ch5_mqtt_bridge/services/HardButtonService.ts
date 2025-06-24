import {injectable, inject} from "inversify";
import Ch5MqttConnector from "../mqtt/MqttClient.ts";

import {HardButtonController, TouchPanelHardButton} from "../interop/controllers/HardButtonController.ts";

@injectable("Singleton")
export class HardButtonService {

    private _mqttClient: Ch5MqttConnector;
    private _hardButtonController: HardButtonController;

    private constructor(
        @inject(Ch5MqttConnector) mqttClient: Ch5MqttConnector,
        @inject(HardButtonController) hardButtonController: HardButtonController
    ) {
        this._mqttClient = mqttClient;
        this._hardButtonController = hardButtonController;

        this._hardButtonController.onAnyButtonPress(this._onButtonPress.bind(this));
        this._hardButtonController.onAnyButtonRelease(this._onButtonRelease.bind(this));
        this._hardButtonController.onAnyButtonActiveToggle(this._onButtonActiveToggle.bind(this));
        this._hardButtonController.onBrightnessChange(this._onBrightnessChange.bind(this));

        this._mqttClient.registerRoute("hardButton/:name/active", this._handleButtonActive.bind(this));
        this._mqttClient.registerRoute("hardButton/brightness", this._setButtonBrightness.bind(this));
    }

    private _onButtonPress(button: TouchPanelHardButton): void {
        let buttonName = TouchPanelHardButton[button];

        this._mqttClient.sendMessage(`hardButtonutton/${buttonName}/press`, true);
        console.log(`[HardButtonService] Button ${buttonName} pressed.`);
    }

    private _onButtonRelease(button: TouchPanelHardButton, _: number | null): void {
        let buttonName = TouchPanelHardButton[button];

        this._mqttClient.sendMessage(`hardButton/${buttonName}/press`, false);
        console.log(`[HardButtonService] Button ${buttonName} released.`);
    }

    private _onButtonActiveToggle(button: TouchPanelHardButton, isActive: boolean): void {
        let buttonName = TouchPanelHardButton[button];

        this._mqttClient.sendMessage(`hardButton/${buttonName}/active`, isActive);
        console.log(`[HardButtonService] Button ${buttonName} a state changed to ${isActive}.`);
    }

    private _handleButtonActive(topic: string, message: any, params?: Record<string, string>): void {
        if (typeof message !== "boolean") {
            console.warn(`[HardButtonService] Invalid message for ${topic}:`, message);
            return;
        }

        let buttonKey = params?.name;
        if (!buttonKey) {
            console.warn(`[HardButtonService] No button key provided in topic: ${topic}`);
            return;
        }

        let button: TouchPanelHardButton;
        if (isNaN(Number(buttonKey))) {
            button = TouchPanelHardButton[buttonKey as keyof typeof TouchPanelHardButton];
        } else {
            button = Number(buttonKey) as TouchPanelHardButton;
        }

        if (button === undefined) {
            console.warn(`[HardButtonService] Unknown button: ${buttonKey}`);
            return;
        }

        this._hardButtonController.setButtonLedPower(button, message);
    }

    private _setButtonBrightness(topic: string, message: any, _params?: Record<string, string>): void {
        if (typeof message !== "number" || message < 0 || message > 65535) {
            console.warn(`[HardButtonService] Invalid brightness value for ${topic}:`, message);
            return;
        }

        this._hardButtonController.setButtonLedBrightness(message);
    }

    private _onBrightnessChange(newBrightness: number): void {
        this._mqttClient.sendMessage("hardButton/brightness", newBrightness);
        console.log(`[HardButtonService] Hard button brightness changed to ${newBrightness}.`);
    }
}