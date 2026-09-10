# # Elevator Configurator V1

Independent 3D Elevator Configurator demo.

## Architecture

- `index.html` — application shell
- `style.css` — UI
- `app.js` — Three.js 3D viewer + configurator state + Firebase/Firestore read
- `firebase/firebase-config.js` — Firebase web client configuration
- `asset-manifest.json` — stable asset catalog
- `assets/` — real demo assets, organized by category

## Asset codes

- GV-xxx = cabin
- Ixx = wall / inox
- Sxx = floor
- Txx = ceiling
- Cxx = door
- Hxx = handrail
- Pxx = COP
- Lxx = lighting

## Important

Demo assets are placeholders for the independent configurator. When real product photos are supplied later, replace matching assets/codes without changing the data model or UI architecture.

Do not commit Firebase service-account private keys or other secrets.
