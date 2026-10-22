const { spawn, execSync } = require('child_process');
const electron = require('electron');

// Ensure any old lingering background electron instance is closed so singleInstanceLock doesn't block the new build
if (process.platform === 'win32') {
  try {
    execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' });
  } catch {}
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('close', () => {
  process.exit(0);
});

