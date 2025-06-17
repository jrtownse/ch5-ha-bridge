import {injectable, inject} from "inversify";
import Ch5MqttClient from "../mqtt/MqttClient.ts";

import {SignalRegistrationRecord} from "../interop/CrestronTypes.ts";
import {HardButtonController, TouchPanelHardButton} from "../interop/controllers/HardButtonController.ts";

@injectable("Singleton")
export class TouchEventService {

    private _mqttClient: Ch5MqttClient;
    private _hardButtonController: HardButtonController;

    private constructor(
        @inject(Ch5MqttClient) mqttClient: Ch5MqttClient,
        @inject(HardButtonController) hardButtonController: HardButtonController
    ) {
        this._mqttClient = mqttClient;
        this._hardButtonController = hardButtonController;

        this._hardButtonController.onAnyButtonPress(this._onButtonPress.bind(this));
        this._hardButtonController.onAnyButtonRelease(this._onButtonRelease.bind(this));
    }

    private _onButtonPress(button: TouchPanelHardButton): void {
        let buttonName = TouchPanelHardButton[button];

        this._mqttClient.sendMessage(`event/button/${buttonName}/press`, true);
        console.log(`[TouchEventService] Button ${buttonName} pressed.`);
    }

    private _onButtonRelease(button: TouchPanelHardButton): void {
        let buttonName = TouchPanelHardButton[button];

        this._mqttClient.sendMessage(`event/button/${buttonName}/press`, false);
        console.log(`[TouchEventService] Button ${buttonName} released.`);
    }
}