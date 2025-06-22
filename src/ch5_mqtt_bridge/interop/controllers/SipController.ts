import {injectable} from "inversify";

@injectable("Singleton")
export class SipController {
    constructor() {
        // Initialize any necessary state or subscriptions here
        window.CrComLib.subscribeState("boolean", "Csig.ConnectedToServer_fb", this._handleSipConnectionChange.bind(this));
    }

    private _handleSipConnectionChange(isConnected: boolean): void {
        console.log("[SipController] SIP connection state changed:", isConnected);
        // Handle SIP connection state change logic here
    }

    public get sipConnected(): boolean {
        return window.CrComLib.getBooleanSignalValue("Csig.SipConnected_fb");
    }
}