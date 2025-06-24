import {injectable} from 'inversify';
import {EnumUtil} from "../../util/EnumUtil.ts";

export enum TouchPanelHardButton {
    BUTTON_POWER = 1,
    BUTTON_HOME = 2,
    BUTTON_LIGHTBULB = 3,
    BUTTON_UP = 4,
    BUTTON_DOWN = 5,
}

export type HardButtonPressDelegate = (button: TouchPanelHardButton) => void;
export type HardButtonReleaseDelegate = (button: TouchPanelHardButton, millisHeld: number | null) => void;
export type HardButtonBrightnessChangeDelegate = (value: number) => void;
export type HardButtonActiveDelegate = (button: TouchPanelHardButton, active: boolean) => void;


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
    private _pressEventHandlers: { [key in TouchPanelHardButton]?: HardButtonPressDelegate[] } = {};
    private _releaseEventHandlers: { [key in TouchPanelHardButton]?: HardButtonReleaseDelegate[] } = {};
    private _buttonActiveEventHandlers: { [key in TouchPanelHardButton]?: HardButtonActiveDelegate[] } = {};
    private _brightnessChangeCallbacks : HardButtonBrightnessChangeDelegate[] = [];

    private _buttonHoldStates = new Map<TouchPanelHardButton, number>();
    private _buttonHoldTimeouts : { [key in TouchPanelHardButton]?: NodeJS.Timeout[] } = {};

    public onButtonPress(button: TouchPanelHardButton, callback: HardButtonPressDelegate): void {
        this._pressEventHandlers[button] ||= [];
        this._pressEventHandlers[button]!.push(callback);
    }

    public onAnyButtonPress(callback: HardButtonPressDelegate) {
        EnumUtil.getNumericEnumValues(TouchPanelHardButton).forEach(button => {
            this.onButtonPress(button, callback);
        });
    }

    public onButtonRelease(button: TouchPanelHardButton, callback: HardButtonReleaseDelegate): void {
        this._releaseEventHandlers[button] ||= [];
        this._releaseEventHandlers[button]!.push(callback);
    }

    public onAnyButtonRelease(callback: HardButtonReleaseDelegate) {
        EnumUtil.getNumericEnumValues(TouchPanelHardButton).forEach(button => {
            this.onButtonRelease(button, callback);
        });
    }

    public onButtonActiveToggle(button: TouchPanelHardButton, callback: HardButtonActiveDelegate): void {
        this._buttonActiveEventHandlers[button] ||= [];
        this._buttonActiveEventHandlers[button]!.push(callback);
    }

    public onAnyButtonActiveToggle(callback: HardButtonActiveDelegate) {
        EnumUtil.getNumericEnumValues(TouchPanelHardButton).forEach(button => {
            this.onButtonActiveToggle(button, callback);
        })
    }

    public onButtonHold(button: TouchPanelHardButton, millisHeld: number = 2_000, callback: HardButtonPressDelegate): void {
        let fn = (pButton: TouchPanelHardButton) => {
            let timer = setTimeout(() => callback(pButton), millisHeld);

            this._buttonHoldTimeouts[pButton] ||= [];
            this._buttonHoldTimeouts[pButton]!.push(timer);
        };

        this.onButtonPress(button, fn);
    }

    public onBrightnessChange(callback: HardButtonBrightnessChangeDelegate) {
        this._brightnessChangeCallbacks.push(callback);
    }

    public getButtonLedPower(button: TouchPanelHardButton): boolean {
        let signal = `Csig.Hard_Button_${button}_On_fb`;
        return window.CrComLib.getBooleanSignalValue(signal) || false;
    }

    public setButtonLedPower(button: TouchPanelHardButton, power: boolean): void {
        let signal = `Csig.Hard_Button_${button}_${power ? "On" : "Off"}`;
        window.CrComLib.publishEvent("boolean", signal, true);
    }

    public getButtonLedBrightness(): number {
        return window.CrComLib.getNumericSignalValue("Csig.Hard_Button_Brightness_fb") || 0;
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
                let millisHeld: number | null = null;
                if (holdStartTime !== undefined) {
                    millisHeld = Date.now() - holdStartTime;
                    this._buttonHoldStates.delete(button);
                }

                this._releaseEventHandlers[button]?.forEach(cb => cb(button, millisHeld));

                this._buttonHoldTimeouts[button]?.forEach(t => clearTimeout(t));
                this._buttonHoldTimeouts[button] = [];
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