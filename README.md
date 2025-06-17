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
