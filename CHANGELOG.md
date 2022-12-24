# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## UNRELEASED

- Support for polygon

## [0.0.43] - 2022-12-25

- Handle Personal Sign Messages

## [0.0.42] - 2022-12-23

- Clearer message about what chains we support.
- Revert phishing checks temporarily

## [0.0.41] - 2022-12-10

- Skip popup on invalid chains

## [0.0.38] - 2022-11-30

- Add basic phishing detection.

## [0.0.38] - 2022-11-26

- Fixed referral link in settings to have https

## [0.0.37] - 2022-11-15

- Add referral link in settings

## [0.0.36] - 2022-11-13

- Remove unused mixpanel

## [0.0.35] - 2022-11-07

- Keep the settings button always displayed.
- Rename sniper mode -> hyperdrive

## [0.0.34] - 2022-11-07

- Minor text change

## [0.0.33] - 2022-11-06

- Fix loading for settings.

## [0.0.32] - 2022-11-05

- Added premium sniper mode and logging in feature.

## [0.0.31] - 2022-11-03

- Add an onboarding page when it is first installed

## [0.0.30] - 2022-10-31

- Fix sendAsync using target instead of provider.request to get the chainId

## [0.0.29] - 2022-10-31

- Support the native brave wallet (thanks Rosco for all the help here!)

## [0.0.28] - 2022-10-31

- Remove clientId being sent

## [0.0.27] - 2022-10-31

- Fix provider injection

## [0.0.26] - 2022-10-30

- Fix unintentional removal of eth_sign

## [0.0.25] - 2022-10-28

- Remove the PocketUniverse console logging.
- Fix support for metamask on brave.
- Disable native brave wallet.

## [0.0.24] - 2022-10-26

- Fix disabling simulations button not working.

## [0.0.23] - 2022-10-25

- Fix double popup with revoke cash and coinbase wallet.

## [0.0.22] - 2022-09-11

- Pass through the id to help debug errors
- See if the simulation is being used.

## [0.0.21] - 2022-09-11

- Add signature hash scams

## [0.0.20] - 2022-09-02

- Use the new sever endpoint.

## [0.0.19] - 2022-09-02

- Revert back to older version of injection.

## [0.0.18] - 2022-09-02

- Fix adding back functionality for send/sendAsync

## [0.0.17] - 2022-09-01

- Fix firefox not popping up
- Display an update banner

## [0.0.16] - 2022-08-31

- Use local storage
- Fix double popup of extension

## [0.0.15] - 2022-08-25

- Add honeypot scam

## [0.0.14] - 2022-08-24

- Add verified contracts

## [0.0.13] - 2022-08-23

- Add gasless signature support for OpenSea listings

## [0.0.11] - 2022-08-23

- Fix verified contract addresses

## [0.0.10] - 2022-08-22

- Add verified NFTs from OpenSea and ERC20 Tokens
- Add verified contracts

## [0.0.9] - 2022-08-04

- Fix PocketUniverse being incompatible with NFTY Dash
- Fix Windows having scrollbars when the popup was created
- Add showing verified contracts in preparation for mint verification.
- Fix so the settings closing when clicking it again.
- Fix the coloring of the settings button

## [0.0.8] - 2022-07-29

- Add the ability to disable PocketUniverse simulations
- Use the pocket-universe SDK instead of manually copying the models
