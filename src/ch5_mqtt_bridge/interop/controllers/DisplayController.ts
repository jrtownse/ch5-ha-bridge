import {injectable} from "inversify";

type BacklightStateCallback = (newState: boolean) => void;
type BrightnessChangeCallback = (newBrightness: number) => void;

@injectable("Singleton")
export class DisplayController {
    constructor() {
        window.CrComLib.subscribeState("b", "Csig.Backlight_On_fb", this._handleBacklightPowerChange.bind(this));
        window.CrComLib.subscribeState("n", "Csig.Lcd_Brt_fb", this._handleBacklightBrightnessChange.bind(this));
    }

    private _backlightPowerChangeCallbacks: BacklightStateCallback[] = [];
    private _backlightBrightnessChangeCallbacks: BrightnessChangeCallback[] = [];

    public get backlightPower() : boolean {
        return window.CrComLib.getBooleanSignalValue("Csig.Backlight_On_fb") || false;
    }

    public set backlightPower(value: boolean) {
        window.CrComLib.publishEvent("b", `Csig.Backlight_${value ? "On" : "Off"}`, true);
    }

    public get backlightBrightness() : number {
        return window.CrComLib.getNumericSignalValue("Csig.Lcd_Brt_fb") || 0;
    }

    public set backlightBrightness(value: number) {
        if (value < 0 || value > 100) {
            console.warn("[DisplayController] Brightness value must be between 0 and 100.");
            return;
        }
        window.CrComLib.publishEvent("n", "Csig.Lcd_Brt", value);
    }

    public onBacklightPowerChange(callback: BacklightStateCallback) {
        this._backlightPowerChangeCallbacks.push(callback);
        callback(this.backlightPower);
    }

    public onBacklightBrightnessChange(callback: BrightnessChangeCallback) {
        this._backlightBrightnessChangeCallbacks.push(callback);
        callback(this.backlightBrightness);
    }

    private _handleBacklightPowerChange(value: boolean): void {
        this._backlightPowerChangeCallbacks.forEach(cb => cb(value));
    }

    private _handleBacklightBrightnessChange(value: number): void {
        this._backlightBrightnessChangeCallbacks.forEach(cb => cb(value));
    }
}