// 快速启动脚本
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动 Teleflow Desktop...\n');

// 启动 Vite 开发服务器
const vite = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  shell: true,
  stdio: 'inherit'
});

// 等待 Vite 启动后再启动 Electron
setTimeout(() => {
  console.log('\n⚡ 启动 Electron...\n');
  
  const electron = spawn(
    path.join(__dirname, 'node_modules', '.bin', 'electron'),
    ['.'],
    {
      cwd: __dirname,
      shell: true,
      stdio: 'inherit'
    }
  );

  electron.on('close', (code) => {
    console.log('\n👋 Electron 已关闭');
    vite.kill();
    process.exit(code);
  });
}, 3000);

vite.on('error', (err) => {
  console.error('❌ Vite 启动失败:', err);
  process.exit(1);
});
