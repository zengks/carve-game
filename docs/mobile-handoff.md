# Mobile browser → native app handoff (inactive preparation)

Nothing is connected to the game yet. `future/mobile-handoff.mjs` is not imported
by either course and the build whitelist does not deploy it. Its default release
config is disabled and contains no store links. Tests assert that build isolation.
Do not enable this until the user approves activation after both native releases
are published. This work does not alter the carve-mobile repository.

## Future player flow

At the initial menu on iPhone/iPad or Android, show an accessible modal with:

- Open CARVE app (explicit tap on a verified HTTPS link).
- Download on the App Store / Get it on Google Play (correct platform only).
- Continue in browser (initial keyboard focus, always available).

Escape also continues in the browser. Dismissal is remembered for the tab session.
Never interrupt an active run, navigate automatically, probe installed apps, or
use a timer to send someone to a store. If installation/opening fails, the player
can continue in the browser. Storage blocked or missing release configuration
skips the prompt. Layout/branding should use the game's dialog system at integration.

`prepareMobilePrompt(config, {atMenu:true, ...})` validates configuration and
returns a controller without showing anything; only a deliberate future bootstrap
calls `.show()`. The shipped config must remain disabled for now.

## Installed-app opening

Use iOS Universal Links and Android App Links. The OS can route a deliberate tap
to an installed app; the website cannot promise to detect installation. User
preferences and in-app browsers can keep the link on the web. Use a dedicated
owned link subdomain, distinct from the game host: Safari treats same-domain
navigation as continued web browsing. `/open` must also work as a small web
fallback with store links and a browser-play link that never reopens the prompt.
Do not route the fallback directly back into another app-opening loop.

Release configuration per platform must include `published:true`,
`linksVerified:true`, the real HTTPS `storeUrl`, a verified HTTPS `openUrl` ending
in `/open`, and its `verifiedHosts` allowlist. `example.com` values in tests are
synthetic fixtures, not release links. There is no deployed association document,
store banner, route, or redirect at present.

## Native/release prerequisites

1. Real published store listings and native handling for the `/open` path.
2. An owned HTTPS link domain with a web fallback; associated-domain entitlement
   in iOS and verified intent filters in Android. Restrict association to `/open`
   so normal browser game URLs continue to work on the web.
3. Serve `/.well-known/apple-app-site-association` as JSON without redirects,
   containing the real Apple application identifier and path rules. Serve
   `/.well-known/assetlinks.json` with the real Android package name and the
   **Play App Signing** certificate SHA-256 fingerprint (not just an upload key).
4. Verify both domain associations on physical devices before marking links
   verified. Test installed/uninstalled, link tapped from game vs other sites,
   Safari/Chrome, iPadOS desktop UA, browser choice, cancellation, returning from
   app/store, and never prompting during a run. OS preferences must be respected.
5. Shared web/native player progress is a separate backend project. This module
   transfers no scores, coins, save payloads, account data or credentials. Native
   code must not trust client-supplied rewards or arbitrary launch parameters.

Sources: [Apple Universal Links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app),
[Apple debugging and Safari same-domain behavior](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links),
[Android App Links](https://developer.android.com/training/app-links),
[Android verified links](https://developer.android.com/training/app-links/verify-android-applinks).
