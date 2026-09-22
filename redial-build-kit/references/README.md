# Original Claude Design references

All five supplied files are preserved byte-for-byte in `claude-design/`; their hashes are in `../research/original-files.sha256.json`.

These are reference prototypes. Their sample customers, provider status, prices, metrics, endpoint addresses and actions are not production data or verified capabilities. In particular, do not deploy the original gate-code script or use sample provider endpoints as credentials/configuration.

To inspect the originals locally, serve this folder on localhost with an ordinary static web server. `support.js` loads external React/Babel resources as needed, and its JSX import uses HTTP fetch, so opening individual files with `file://` may not work. This preservation step did not browser-test or modify the original runtime. Reimplement the selected designs as normal React components rather than embedding this runtime into the production app.
