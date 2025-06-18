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
export type HardButtonBrightnessChangeCallback = (value: number) => void;
export type HardButtonActiveCallback = (button: TouchPanelHardButton, active: boolean) => void;


@injectable("Singleton")
export class HardButtonController {

    constructor() {
        this.registerDispatchEvents(TouchPanelHardButton.BUTTON_POWER);
        this.registerDispatchEvents(TouchPanelHardButton.BUTTON_HOME);
        this.registerDispatchEvents(TouchPanelHardButton.BUTTON_LIGHTBULB);
        this.registerDispatchEvents(TouchPanelHardButton.BUTTON_UP);
        this.registerDispatchEvents(TouchPanelHardButton.BUTTON_DOWN);

        window.CrComLib.subscribeState("n", "Csig.Hard_Buton_Brightness_fb", this._handleBrightnessChange.bind(this));

        this._initialized = true;
    }

    private _initialized: boolean = false;
    private _pressEventHandlers: { [key in TouchPanelHardButton]?: HardButtonPressCallback[] } = {};
    private _releaseEventHandlers: { [key in TouchPanelHardButton]?: HardButtonReleaseCallback[] } = {};
    private _heldEventHandlers: { [key in TouchPanelHardButton]?: HardButtonHeldReleasedCallback[] } = {};
    private _buttonActiveEventHandlers: { [key in TouchPanelHardButton]?: HardButtonActiveCallback[] } = {};
    private _brightnessChangeCallbacks : HardButtonBrightnessChangeCallback[] = [];

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

    public onButtonActiveToggle(button: TouchPanelHardButton, callback: HardButtonActiveCallback): void {
        this._buttonActiveEventHandlers[button] ||= [];
        this._buttonActiveEventHandlers[button]!.push(callback);
    }

    public onAnyButtonActiveToggle(callback: HardButtonActiveCallback) {
        Object.values(TouchPanelHardButton).forEach(button => {
            this.onButtonActiveToggle(button, callback);
        });
    }

    public onBrightnessChange(callback: HardButtonBrightnessChangeCallback) {
        this._brightnessChangeCallbacks.push(callback);
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

    private registerDispatchEvents(button: TouchPanelHardButton) {
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

        window.CrComLib.subscribeState("boolean", `Csig.Hard_Button_${button}_On_fb}`, (power: boolean) => {
            this._buttonActiveEventHandlers[button]?.forEach(cb => cb(button, power));
        })
    }

    private _handleBrightnessChange(value: number): void {
        this._brightnessChangeCallbacks.forEach(callback => callback(value));
    }
}