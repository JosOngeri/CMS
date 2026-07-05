import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import { ColorPaletteProvider } from './contexts/ColorPaletteContext';
import { ToastProvider } from './contexts/ToastContext';
import { createAppRouter } from './router';

const router = createAppRouter();

function App() {
  // The app starts with only the public shell. Auth, members, and gallery
  // providers are loaded inside their respective shells when needed.
  return (
    <SettingsProvider>
      <ColorPaletteProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ColorPaletteProvider>
    </SettingsProvider>
  );
}

export default App;
