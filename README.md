# SubnetCalculator

An IPv4 subnet calculator and subnetting practice tool. Plain HTML, CSS and JavaScript with no build step.

## Features

- Subnet calculator: network, broadcast, host range, usable hosts, mask, wildcard, class, address type, reverse DNS zone
- VLSM planner with an address-space map and free blocks
- Saved calculations and history, stored in your browser
- Export to CSV, Markdown, text or a printable report, and print

Number conversion, the Mask converter and Practice are kept on the `full-version` branch for now.

## Project structure

```
index.html          Page markup: sidebar, header and one <section> per tool
css/styles.css      All styles, with light and dark theme tokens at the top
js/ipv4.js          IPv4 math: parsing, masks, subnet calculation
js/helpers.js       DOM shortcuts, formatting, local storage, toast, clipboard, bit ribbon
js/storage.js       History (this browser) and saved calculations
js/export.js        Dialogs and export formats (CSV, Markdown, text, HTML report)
js/calculator.js    Subnet calculator page
js/vlsm.js          VLSM planner page
js/saved.js         Saved & history page
js/app.js           Sidebar, page header, theme, routing and start-up
```

The scripts are plain (non-module) files that share one global scope, so they must load in the order listed in `index.html`. `app.js` goes last because it starts the app.

Open `index.html` in a browser or visit the GitHub Pages site. No build step or server is needed.
