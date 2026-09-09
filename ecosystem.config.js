module.exports = {
  apps: [
    {
      name: 'kandy-cabs-production',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/kandy-cabs-error.log',
      out_file: '/var/log/pm2/kandy-cabs-out.log',
      merge_logs: true,
    },
  ],
};
