module.exports = {
  apps: [
    {
      name: 'linguocast',
      script: 'dist/main.js',
      watch: true,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
