# iPad Air 2 setup

Target: iPadOS/Safari 15, 1024 × 768 landscape logical viewport, 2048 × 1536 Retina screen, 2 GB RAM. Use the latest system update available for this hardware. Current desktop WebKit tests cannot reproduce its memory, thermal or Safari engine behavior.

1. Open the approved HTTPS deployment in Safari. In household mode, sign in at `/admin.html`, name the iPad and Authorize this display. Do this in the Home Screen app as well if Safari and its installed app do not share the session.
2. Safari Share → Add to Home Screen → AdventuresDisplay. Launch the icon. Put the iPad in landscape and enable orientation lock. The manifest requests landscape; iPadOS may ignore this, so verify it manually.
3. Settings → Display & Brightness → Auto-Lock → Never, if available. Adjust actual hardware brightness manually. Device policies may restrict Auto-Lock options. [Apple display settings](https://support.apple.com/guide/ipad/ipad11dbabaf/ipados).
4. Settings → Accessibility → Guided Access. Enable it, set a passcode, and configure its separate Display Auto-Lock setting. With the frame open, triple-click the Air 2’s **Home button** and start Guided Access. Keep touch enabled for photo/navigation controls. End with the same shortcut and passcode. [Apple Guided Access guide](https://support.apple.com/111795).
5. Use a stable ventilated stand and reliable charger away from cooking heat/water. The website cannot manage battery charging, backlight or hardware power. Check heat and aging battery condition during long-running use.
6. Tap for navigation; choose Pure Photos, Ambient Photos, Today, Weekly Outlook or Display. Preferences control enabled modes and timing; at least one photo mode stays enabled. The default ten-minute cycle spends nine minutes in photographs. The app reopens in a photo mode and returns there after manual interaction becomes idle.
7. Night hours use America/New_York and default to 10 PM–7 AM. The dark interface layer is simulated dimming, **not** an actual backlight/brightness or screen-off schedule. Start/end hours are configurable; identical hours disable the scheduled interval. Use manual iPad brightness or supported OS automation separately if desired.

Public demo photographs/settings assets cache after the first successful load. Optional private offline caching requires explicit server configuration and a trusted authorized display. It lasts only for the one-hour offline lease; data is stale and access locks at expiry. Safari may evict storage, especially under memory pressure. Keep the app open and online for initial caching; verify an offline relaunch before relying on it. Network recovery requests fresh sources without reload loops.

Album clips play muted by default. Reveal controls and tap Enable clip sound for audio; Safari may need another tap after reopening or an interruption. The saved sound preference cannot bypass browser gesture restrictions. Use device volume/Control Center and normal audio routing. Leaving photo modes or backgrounding pauses and mutes video. If Low Power Mode blocks autoplay, use Tap to play video. Test portrait clips, sound, pause/resume and completion on the real Air 2.

Echo Show handles voice, NPR/music services, timers and smart-home interactions independently. Optional album-video sound is this app’s only audio capability. No microphone permission is requested.

Before household release: inspect bright/dark/portrait images, all four modes and three overlay placements at 1024 × 768; verify additions/deletions, disconnected Wi-Fi, offline-lease expiry/revocation and Home Screen session persistence. Run 24–48 hours on power through day/night boundaries, monitoring heat, memory eviction and image failures. Use real Safari 15, not only a user-agent override.
