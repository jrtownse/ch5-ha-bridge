import {injectable} from 'inversify';

export enum TouchPanelHardButton {
    BUTTON_POWER = 1,
    BUTTON_HOME = 2,
    BUTTON_LIGHTBULB = 3,
    BUTTON_UP = 4,
    BUTTON_DOWN = 5,
}

export type HardButtonPressCallback = (button: TouchPanelHardButton) => void;
export type HardButtonReleaseCallback = (button: TouchPanelHardButton) => void;
export type HardButtonHeldReleasedCallback = (button: TouchPanelHardButton, millisHeld: number) => void;


@injectable("Singleton")
export class HardButtonController {

    constructor() {
        this.registerDispatchEvent(TouchPanelHardButton.BUTTON_POWER);
        this.registerDispatchEvent(TouchPanelHardButton.BUTTON_HOME);
        this.registerDispatchEvent(TouchPanelHardButton.BUTTON_LIGHTBULB);
        this.registerDispatchEvent(TouchPanelHardButton.BUTTON_UP);
        this.registerDispatchEvent(TouchPanelHardButton.BUTTON_DOWN);

        this._initialized = true;
    }

    private _initialized: boolean = false;
    private _pressEventHandlers: { [key in TouchPanelHardButton]?: HardButtonPressCallback[] } = {};
    private _releaseEventHandlers: { [key in TouchPanelHardButton]?: HardButtonReleaseCallback[] } = {};
    private _heldEventHandlers: { [key in TouchPanelHardButton]?: HardButtonHeldReleasedCallback[] } = {};

    private _buttonHoldStates = new Map<TouchPanelHardButton, Stopwatch>();

    public onButtonPress(button: TouchPanelHardButton, callback: HardButtonPressCallback): void {
        this._pressEventHandlers[button] ||= [];
        this._pressEventHandlers[button]!.push(callback);
    }

    public onAnyButtonPress(callback: HardButtonPressCallback) {
        Object.values(TouchPanelHardButton).forEach(button => {
            this.onButtonPress(button, callback);
        });
    }

    public onButtonRelease(button: TouchPanelHardButton, callback: HardButtonReleaseCallback): void {
        this._releaseEventHandlers[button] ||= [];
        this._releaseEventHandlers[button]!.push(callback);
    }

    public onAnyButtonRelease(callback: HardButtonReleaseCallback) {
        Object.values(TouchPanelHardButton).forEach(button => {
            this.onButtonRelease(button, callback);
        });
    }

    public getButtonLedPower(button: TouchPanelHardButton): boolean {
        let signal = `Csig.Hard_Button_${button}_On_fb`;
        return window.CrComLib.getState("boolean", signal) ?? false;
    }

    public setButtonLedPower(button: TouchPanelHardButton, power: boolean): void {
        let signal = `Csig.Hard_Button_${button}_${power ? "On" : "Off"}`;
        window.CrComLib.publishEvent("boolean", signal, true);
    }

    public getButtonLedBrightness(): number {
        return window.CrComLib.getState("number", "Csig.Hard_Button_Brightness_fb", -1);
    }

    public setButtonLedBrightness(value: number): void {
        window.CrComLib.publishEvent("number", "Csig.Hard_Button_Brightness", value);
    }

    private registerDispatchEvent(button: TouchPanelHardButton) {
        window.CrComLib.subscribeState("boolean", `Csig.Hard_Button_${button}.Press`, (pressed: boolean) => {
            if (!this._initialized) {
                return;
            }

            if (pressed) {
                this._pressEventHandlers[button]?.forEach(cb => cb(button));

                this._buttonHoldStates.set(button, Date.now());
            }

            if (!pressed) {
                let holdStartTime = this._buttonHoldStates.get(button);
                if (holdStartTime !== undefined) {
                    let millisHeld = Date.now() - holdStartTime;
                    this._buttonHoldStates.delete(button);

                    // Dispatch held event
                    this._heldEventHandlers[button]?.forEach(cb => cb(button, millisHeld));
                }

                this._releaseEventHandlers[button]?.forEach(cb => cb(button));
            }
        });
    }
}