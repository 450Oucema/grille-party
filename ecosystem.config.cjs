module.exports = {
  apps: [
    {
      name: 'grille-party',
      cwd: '/home/oucema/labs/grille-party/server',
      script: 'dist/index.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3035',
        SOCKET_PATH: '/g/grille-party/socket.io',
      },
      max_memory_restart: '300M',
      time: true,
    },
  ],
}
