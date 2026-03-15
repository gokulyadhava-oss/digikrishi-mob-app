#!/usr/bin/env node
/**
 * Run Android release build with .env loaded so EXPO_PUBLIC_* are inlined in the JS bundle.
 * When you run ./gradlew assembleRelease directly, Gradle's bundle step does not load
 * the project .env, so the app gets process.env.EXPO_PUBLIC_API_URL === undefined and
 * falls back to localhost. This script loads .env, then runs Gradle so the bundle step
 * sees the same environment and the release APK uses your backend URL.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const envLocalPath = path.join(projectRoot, '.env.local');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const comment = value.indexOf('#');
    if (comment >= 0) value = value.slice(0, comment).trim();
    value = value.replace(/^["']|["']$/g, '');
    if (key) process.env[key] = value;
  }
}

// Load .env and .env.local (local overrides)
loadEnv(envPath);
loadEnv(envLocalPath);
process.env.NODE_ENV = 'production';

const androidDir = path.join(projectRoot, 'android');
const isWin = process.platform === 'win32';
const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');

const child = spawn(gradlew, ['assembleRelease'], {
  cwd: androidDir,
  env: process.env,
  stdio: 'inherit',
  shell: isWin,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
