# Qraft

Qraft is a simple, browser-based tool for creating custom QR codes. It was built to handle more than just plain links—supporting Wi-Fi credentials and contact cards—while giving you enough control over the design to make them look good.

## Features
- **Multiple Types**: Generate codes for URLs, plain text, Wi-Fi networks (SSID/Password), and vCards.
- **Logo Overlays**: Paste a URL for any image to place it right in the center of the QR code.
- **Double Border Styling**: A unique "frame + padding" look that makes the code stand out from standard generators.
- **Full Customization**: Change foreground/background colors, adjust resolution, and pick error correction levels.
- **Recent History**: Keeps track of your last few generated codes locally so you don't lose them.
- **Save & Copy**: Download your design as a high-res PNG or copy it directly to your clipboard.

## How to use
1. **Choose your mode**: Pick the tab that matches what you want to share (Link, Text, etc.).
2. **Enter details**: Fill in the fields. The preview on the right updates in real-time.
3. **Customize**: (Optional) Change the colors, add a logo link, or adjust the frame thickness using the sliders.
4. **Export**: Click "Download PNG" to save the file or "Copy" to use it immediately.

## Running locally
Since Qraft is just a front-end project, there's no complex setup or backend required.

1. Clone the repo:
   ```bash
   git clone https://github.com/DulinaAbeysekara/Qraft.git
   ```
2. Open `index.html` in any modern web browser.

That's it. No `npm install`, no servers—just open and use.

## Libraries used
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) - For the core QR generation and logo support.
