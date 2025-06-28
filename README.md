# Crestron CH5/HomeAssistant Bridge

> [!warning]
>
> **This project is not affiliated with, endorsed by, or supported by Crestron.** It is very likely that Crestron
> will not like this project at all, and will not support anything done as part of it. This project uses a decent
> number of undocumented features that are subject to change at any time for any reason.
>
> DO NOT USE THIS PROJECT FOR PAYING CLIENTS OR DEPLOY IT IN A PROFESSIONAL ENVIRONMENT. This project makes
> *absolutely zero promises* as to its stability and reliability, and use in production environments ***will***
> cause significant trouble when something inevitably breaks. This is NOT a replacement for a properly-configured
> and competently-programmed Crestron control system.

> [!caution]
> This project is still under active development, and nothing should be considered stable at this time. Significant
> work is still necessary before this is ready to use outside of lab settings.

The `ch5-ha-bridge` aims to bridge the gap between Crestron tablets (such as the TSW-xx60 and TSW-xx70 product lines)
and open smart home projects like Home Assistant. It works standalone, meaning there is no need for a central
processor or any controlled programming. Everything lives, to the best of its ability, within the context of a
tablet operating standalone.

This project aims to bridge the gap between Crestron tablets (e.g. the TSW xx60 and xx70 product lines) and Home 
Assistant, allowing deep integration without needing a control processor or the ability to do custom programming on
a Crestron system. To this end, this project makes extensive use of [Crestron's CrComLib][crcomlib] to interact with
the tablet and its joins, and uses MQTT to speak to Home Assistant or any other MQTT consumer. Many of the insights
in this project came from staring at CrComLib's code and throwing various things at the wall in an attempt to make
things work.

This project makes use of the [CH5 React TS Template][ch5-react] as its base.

[crcomlib]: https://github.com/Crestron/CH5ComponentLibrary
[ch5-react]: https://github.com/jphillipsCrestron/ch5-react-ts-template/

## Building and Installing

This is a standard Vite project, so just run `yarn install` to install deps, `yarn build:dev` to build the dist files,
and then `yarn:archive` to generate a .ch5z file.

You will also need to copy `.env.template` to `.env` and fill in any appropriate values for your system.

### Deployment Instructions

At present, there are a few extra required steps to deploy this project in a typical Home Assistant environment. These are
temporary (sorta) until the bootloader and all relevant code is completed, and are not included in the project pipeline
because the underyling code is unlikely to change regularly.

1. Compile [`polyfill_localstorage.ts`](./homeassistant/polyfill_localstorage.ts) to JavaScript using your favorite
   TypeScript compiler.
1. Place [`coldboot.html`](./homeassistant/coldboot.html) and your compiled `polyfill_localstorage.js` file in `www/crestron`
   on your HA server.
3. Define the `VITE_HA_DASHBOARD_URL` as `http://YOUR_HA_HOST/local/crestron/coldboot.html?redirect_to=/your/dashboard/url`
4. Make the following changes to your HA `configuration.yaml`:
    ```yml
    frontend:
      extra_module_url:
        - /local/crestron/polyfill_localstorage.js
    
    http:
      use_x_frame_options: false
    ```

If HTTPS access is desired and a publicly-trusted certificate is not available, you will need to load all relevant certificates
[on the panel](https://docs.crestron.com/en-us/8989/Content/Topics/Web-Configuration.htm#802.1x_Configuration). Note that HTTPS has
not been thoroughly tested, and may cause other problems I don't know about yet.

## Project Direction

As of now, this project is very much a proof of concept. It will not run properly without configuration changes to Home
Assistant (specifically, disabling `X-Frame-Options`), and there are still unanswered questions regarding how best to 
tie things in properly. We may need to create a "bootloader" CH5 app that then gets proper scripts from HA, but there
are many other possible considerations here.

Help is very much welcome here!

### Project Structure

At the moment, the actual integration component is roughly split into three distinct layers:

* The [`interop` layer](./src/ch5_mqtt_bridge/interop/) contains Crestron specific logic and "controllers" that are
  designed to make the join system more accessible and usable in TypeScript land. It's helpful to consider this layer
  to be the "drivers" behind the project.
* The [`services` layer](./src/ch5_mqtt_bridge/services/) exposes Crestron state to the world, either from an interop
  controller or directly via the CrComLib interface.
* The [`behaviors` layer](./src/ch5_mqtt_bridge/behaviors) contains on-device business logic to control the tablet and
  its operation.

Of these layers, `services` is (by design) opinionated to translate things into a Home Assistant and architecturally
friendly pattern. The `behaviors` layer is *extremely* opinionated and will likely be moved somewhere else in the
future to allow users to define and control their own logic.

## MQTT Reference

The following is a list of MQTT topics that this project currently implements. All custom MQTT events will be placed in
the `crestron/ch5_mqtt/{PanelModel}_{PanelSerial}` namespace, with the following subtopics:

* `/joins` - Joins subsystem.
  * `/{JoinType}/{JoinName}` (R/W) - API to access joins directly.
    * `/_subscribe` (W) - Special topic to force subscribing to a join. No payload is used.
    * `/_unsubscribe` (W) - Special topic to force unsubscribing from a join. No payload is used.
  * `/_subscribeAll` (W) - Special topic to subscribe to all joins the panel is currently aware of. No payload is used.
* `/hardButton` - Hard Button subsystem
  * `/{ButtonName}/press` (R) - Indication that a button was pressed. `true` when pressed, `false` when released.
  * `/{ButtonName}/active` (R/W) - State of the button. `true` if the LED is lit and the button can be used.
  * `/brightness` (R/W) - Brightness of the hard button LEDs, from 0 to 65535. Not respected if autobrightness is enabled.
* `/ledAccessory` - LED accessory subsystem/control.
  * `/available` (R, persistent) - `true` if the LED accessory is available, `false` otherwise.
  * `/color` (R/W) - Color of the LED accessory. Accepts hex, color names, tuple, or `{"r":100,"g":100,"b":100}`.
  * `/brightness` (R/W) - Brightness of the LED accessory, from 0 to 100.
  * `/power` (R/W) - Power state of the LED accessory, `true` for on, `false` for off.


### Join Reference

When accessing joins through the `/joins` topic, the join type will be one of `boolean`, `integer`, `string`, or 
`object`. Join names are defined by the [Reserved Join Viewers][rjviewer] in the Crestron documentation, though certain
other undocumented joins may also be available.

When reading a join, the *State* name will be used, which normally *will* be suffixed with `_fb`. Subscriptions can only
be made to these states, not events.

When writing to a join, use the *Event* name, which will normally *not* be suffixed with `_fb`.

[rjviewer]: https://sdkcon78221.crestron.com/downloads/rjviewapp/index.html
