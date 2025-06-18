# Crestron CH5/HomeAssistant Bridge

> [!warning]
> This project is in its early stages and is not yet ready for production use. Code is ugly, things are structured
> weirdly, nothing is documented, and there are no tests.
> 
> **This project is not affiliated with or endorsed by Crestron.** It is very likely that Crestron will not like this
> project at all, and will probably not support anything we do here. We use a number of undocumented features and 
> systems that we _probably_ should not be touching.
> 
> I *highly* recommend that you do not use this project in a paying client's home, or in any other situation where 
> someone will get mad if this doesn't work as intended. 

This project aims to bridge the gap between Crestron tablets (e.g. the TSW xx60 and xx70 product lines) and Home 
Assistant, allowing deep integration without needing a control processor or the ability to do custom programming on
a Crestron system.

It leverages [Crestron's CrComLib][crcomlib] to interact with the tablet and its joins, and uses MQTT to speak to Home 
Assistant(or, realistically, any other consumer that wants MQTT). The initial project was built using 
[Crestron's React template][ch5-react] and then adapted to make things slightly simpler.

[crcomlib]: https://github.com/Crestron/CH5ComponentLibrary
[ch5-react]: https://github.com/jphillipsCrestron/ch5-react-ts-template/

## Building

This is a standard Vite project, so just run `yarn install` to install deps, `yarn build:dev` to build the dist files,
and then `yarn:archive` to generate a .ch5z file.

You will also need to copy `.env.template` to `.env` and fill in any appropriate values for your system.

## Project Direction

As of now, this project is very much a proof of concept. It will not run properly without configuration changes to Home
Assistant (specifically, disabling `X-Frame-Options`), and there are still unanswered questions regarding how best to 
tie things in properly. We may need to create a "bootloader" CH5 app that then gets proper scripts from HA, but there
are many other possible considerations here.

Help is very much welcome here!

## MQTT Reference

The following is a list of MQTT topics that this project currently implements.

* `crestron/ch5_mqtt/{PanelModel}_{PanelSerial}` - The root topic for this panel.
  * `/joins` - Joins subsystem, allowing raw access to Crestron join information.
    * `/{JoinType}/{JoinName}` (R/W) - API to access joins directly.
      * `/_subscribe` (W) - Special topic to force subscribing to a join. No payload is used.
      * `/_unsubscribe` (W) - Special topic to force unsubscribing from a join. No payload is used.
    * `/_subscribeAll` (W) - Special topic to subscribe to all joins the panel is currently aware of. No payload is used.
  * `/events` - Various event subsystems.
    * `/button/{ButtonName}/press` (R) - Indication that a button was pressed. `true` when pressed, `false` when released.
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
