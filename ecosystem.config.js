// PM2 process configuration for BounceBack SMS (Next.js server on EC2).
//
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup systemd
//
// `next start` auto-loads .env from cwd, so secrets live in /var/www/bounceback-sms/.env
// (never commit that file). After editing .env: `pm2 restart bounceback-sms`.
module.exports = {
  apps: [
    {
      name: "bounceback-sms",
      // Use Next's binary directly — more reliable under PM2 than "npm start".
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/bounceback-sms",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
