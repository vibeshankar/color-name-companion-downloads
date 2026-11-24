# Color Name Companion

A desktop Chrome side panel that names colors you pick from the screen and prepares project names for Adobe Express. Color matching runs on your device.

Made by Vinayak Pathak.

## Install version 2

1. Unzip the download and keep the extracted folder somewhere you can find again.
2. Open `chrome://extensions` in desktop Chrome and turn on **Developer mode**.
3. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Pin **Color Name Companion** from Chrome’s Extensions menu and click its toolbar icon to open the panel.

To upgrade an existing unpacked installation, replace the files in its existing folder with the files in the new ZIP and click **Reload** on the extension’s card at `chrome://extensions`. Keep the same folder so Chrome keeps the extension ID and local settings. For a GitHub download, updates are manual.

## Name a project in Adobe Express

1. Open the side panel from any Chrome tab and click **Pick color from screen**. Click a solid part of your design or press Escape to cancel. You can also enter a HEX value.
2. Read the color family and suggested shade. If the result is a close call, choose another name from the buttons under the result.
3. Add an optional project label, edit the suggested title if needed, and click **Copy project name**. Paste it into the project’s title in Adobe Express.
4. To reuse a name, open **Personal color name**, enter the label you want, and click **Remember name**. It applies to that exact HEX. Use **Forget name** to restore the suggestions.

Color details and settings include RGB, speech, a broad family naming option, and an option to include HEX in copied titles. Recent picks and preferences from version 0.1 carry forward when you reload the existing installation.

## How naming works

Chrome returns the sRGB value of the one displayed pixel you click. Gradients, shadows, transparency, or the edge of a shape can produce a different value from its original fill. For an original fill, enter its HEX directly from the design tool.

The extension ranks curated swatches using color distances in OKLab. It handles exact grays separately, includes more references for muted colors, and flags close or approximate matches. Color names describe likely shades. A close call indicates competing suggestions, and the HEX remains the exact sampled sRGB value.

## Permissions and privacy

The extension uses Chrome’s side panel, local extension storage, and clipboard writing. It has no host permissions. Screen sampling starts when you click Pick, and Chrome returns the selected pixel color. Preferences, history, and saved names stay in Chrome’s local extension storage. Optional speech uses Chrome’s speech synthesis. Available voices and whether they use a network depend on your setup.

There are no external libraries or build steps. Desktop Chrome 114 or later is required.
