const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'dev';
const extraArgs = process.argv.slice(3);

const node22Path = 'C:\\Users\\Asus\\.local\\node-v22.12.0-win-x64\\node.exe';
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);

let nodeExecutable = process.execPath;
if (nodeMajor < 20 && fs.existsSync(node22Path)) {
  nodeExecutable = node22Path;
}

const env = {
  ...process.env,
  PATH: (fs.existsSync(node22Path) ? 'C:\\Users\\Asus\\.local\\node-v22.12.0-win-x64;' : '') + (process.env.PATH || '')
};

let child;
if (target === 'dev') {
  const viteBin = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
  child = spawn(nodeExecutable, [viteBin, ...extraArgs], { stdio: 'inherit', env });
} else if (target === 'build') {
  const tscBin = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');
  const viteBin = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
  const tsc = spawn(nodeExecutable, [tscBin, '-b'], { stdio: 'inherit', env });
  tsc.on('exit', (code) => {
    if (code !== 0) process.exit(code || 1);
    const vite = spawn(nodeExecutable, [viteBin, 'build', ...extraArgs], { stdio: 'inherit', env });
    vite.on('exit', (c) => process.exit(c || 0));
  });
  return;
} else if (target === 'preview') {
  const viteBin = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
  child = spawn(nodeExecutable, [viteBin, 'preview', ...extraArgs], { stdio: 'inherit', env });
} else if (target === 'test') {
  child = spawn(nodeExecutable, ['--experimental-strip-types', '--test', 'src/tests/farmerLogic.test.ts', 'src/tests/dosageCalculator.test.ts', 'src/tests/voiceAssistant.test.ts', ...extraArgs], { stdio: 'inherit', env });
} else {
  const bin = path.join(__dirname, 'node_modules', '.bin', target);
  child = spawn(`"${bin}"`, extraArgs, { stdio: 'inherit', env, shell: true });
}

child.on('exit', (code) => {
  process.exit(code || 0);
});
