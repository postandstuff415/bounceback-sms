const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const apiPath = path.join(projectRoot, 'src', 'app', 'api');
const backupPath = path.join(projectRoot, 'api-backup');
const intakePath = path.join(projectRoot, 'src', 'app', 'intake');
const intakeBackupPath = path.join(projectRoot, 'intake-backup');

console.log('Starting mobile static build pipeline...');

let apiMoved = false;
let intakeMoved = false;

try {
  // 1. Move src/app/api to api-backup
  if (fs.existsSync(apiPath)) {
    console.log(`Temporarily moving API routes from ${apiPath} to ${backupPath}...`);
    fs.renameSync(apiPath, backupPath);
    apiMoved = true;
  } else {
    console.log('API routes directory not found, skipping move.');
  }

  // 1b. Move src/app/intake to intake-backup to avoid dynamic static-export compilation issues
  if (fs.existsSync(intakePath)) {
    console.log(`Temporarily moving intake routes from ${intakePath} to ${intakeBackupPath}...`);
    fs.renameSync(intakePath, intakeBackupPath);
    intakeMoved = true;
  } else {
    console.log('Intake routes directory not found, skipping move.');
  }

  // 2. Run next build with EXPORT_MODE=true
  console.log('Running Next.js static export build...');
  execSync('npx next build', {
    env: { ...process.env, EXPORT_MODE: 'true' },
    stdio: 'inherit'
  });

  // 3. Run capacitor sync/copy
  console.log('Syncing assets with Capacitor native platforms...');
  execSync('npx cap sync', { stdio: 'inherit' });

  console.log('Mobile build and sync completed successfully!');
} catch (error) {
  console.error('Error during mobile build:', error.message);
  process.exitCode = 1;
} finally {
  // 4. Restore src/app/api
  if (apiMoved && fs.existsSync(backupPath)) {
    console.log(`Restoring API routes from ${backupPath} to ${apiPath}...`);
    fs.renameSync(backupPath, apiPath);
  }
  // 4b. Restore src/app/intake
  if (intakeMoved && fs.existsSync(intakeBackupPath)) {
    console.log(`Restoring intake routes from ${intakeBackupPath} to ${intakePath}...`);
    fs.renameSync(intakeBackupPath, intakePath);
  }
}
