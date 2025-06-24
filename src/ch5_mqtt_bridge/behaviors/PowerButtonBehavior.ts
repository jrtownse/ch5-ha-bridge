import {inject, injectable} from "inversify";
import {DisplayController} from "../interop/controllers/DisplayController.ts";
import {HardButtonController, TouchPanelHardButton} from "../interop/controllers/HardButtonController.ts";
import Ch5MqttConnector from "../mqtt/MqttClient.ts";

// TODO: This really should not be in the bridge library.
@injectable("Singleton")
export class PowerButtonBehavior {

    private _displayController: DisplayController;
    private _hardButtonController: HardButtonController;

    constructor(
        @inject(DisplayController) private displayController: DisplayController,
        @inject(HardButtonController) private hardButtonController: HardButtonController
    ) {
        this._displayController = displayController;
        this._hardButtonController = hardButtonController;

        this.hardButtonController.onButtonPress(TouchPanelHardButton.BUTTON_POWER, this._handlePowerButtonPress.bind(this));
        this.hardButtonController.onButtonHold(TouchPanelHardButton.BUTTON_POWER, 2000, this._handlePowerButtonHold.bind(this));

        this.displayController.onBacklightPowerChange(this._handleBacklightPowerChange.bind(this));
    }

    private _handlePowerButtonPress(_: TouchPanelHardButton): void {
        if (!this.displayController.backlightPower) {
            this.displayController.backlightPower = true;
        }
    }

    private _handlePowerButtonHold(_: TouchPanelHardButton): void {
        console.log("[PowerButtonBehavior] Power button held for 2 seconds, toggling display power.");
        if (this.displayController.backlightPower) {
            this.displayController.backlightPower = false;
        }
    }

    private _handleBacklightPowerChange(isOn: boolean): void {
        console.log("[PowerButtonBehavior] Backlight power changed:", isOn);

        this.hardButtonController.setButtonLedPower(TouchPanelHardButton.BUTTON_HOME, isOn);
        this.hardButtonController.setButtonLedPower(TouchPanelHardButton.BUTTON_LIGHTBULB, isOn);
        this.hardButtonController.setButtonLedPower(TouchPanelHardButton.BUTTON_UP, isOn);
        this.hardButtonController.setButtonLedPower(TouchPanelHardButton.BUTTON_DOWN, isOn);
    }
}