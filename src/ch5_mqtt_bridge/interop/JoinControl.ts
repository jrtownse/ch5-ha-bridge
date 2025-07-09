export default class JoinControl {
    private static CSIG_CANARY = "Csig.fb33331";

    public static async syncJoinStates() {
        let subId: string = "";

        const promise = new Promise<void>((resolve) => {
            subId = window.CrComLib.subscribeState("s", this.CSIG_CANARY, (s: string) => {
                if (s == "") return;

                resolve();
            });
        });

        promise.then(() => {
            if (subId != "") {
                window.CrComLib.unsubscribeState("s", this.CSIG_CANARY, subId);
            }
        });

        window.CrComLib.publishEvent("object", "Csig.State_Synchronization", {});

        return promise;
    }
}