import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Note: intentionally not wrapped in StrictMode — its dev-only double mount
// re-initializes the WebGL context and game loop, which fights with the
// imperative Three.js setup in Game.jsx.
createRoot(document.getElementById('root')).render(<App />);
