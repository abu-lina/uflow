#!/usr/bin/env node

/**
 * Verify VAPID Configuration
 *
 * This script checks if VAPID keys are properly configured
 */

require('dotenv').config({ path: '.env.local' });

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL;

console.log('\n🔍 VAPID Configuration Check\n');

const checks = [
  { name: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', value: publicKey },
  { name: 'VAPID_PRIVATE_KEY', value: privateKey },
  { name: 'VAPID_EMAIL', value: email },
];

let allSet = true;
for (const { name, value } of checks) {
  const present = value && value.trim() !== '';
  if (!present) allSet = false;
  console.log(`  ${present ? '✅' : '❌'} ${name}: ${present ? 'set' : 'not set'}`);
}

console.log('');
if (allSet) {
  console.log('✅ All VAPID keys are configured.');
} else {
  console.log('⚠️  Some VAPID keys are missing. Push notifications may not work.');
}
console.log('');
