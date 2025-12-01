import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://uat.ummahflow.com';
const API_BASE_URL = `${BASE_URL}/api`;
const TEST_API_KEY = __ENV.TEST_API_KEY || null;

console.log('BASE_URL:', BASE_URL);
console.log('API_BASE_URL:', API_BASE_URL);  
console.log('TEST_API_KEY:', TEST_API_KEY ? TEST_API_KEY.substring(0, 10) + '...' : 'NOT SET');

export default function () {
  const email = 'test-user-11@example.com';
  const password = 'TestPassword123!';
  
  const url = `${API_BASE_URL}/auth/login`;
  const payload = JSON.stringify({ email, password });
  
  const headers = { 'Content-Type': 'application/json' };
  if (TEST_API_KEY) {
    headers['X-Test-API-Key'] = TEST_API_KEY;
  }
  
  console.log('Making request to:', url);
  console.log('Headers:', JSON.stringify(headers));
  console.log('Payload:', payload);
  
  const response = http.post(url, payload, {
    headers,
    tags: { name: 'login' },
  });
  
  console.log('Response status:', response.status);
  console.log('Response body:', response.body);
  
  check(response, {
    'login successful': (r) => r.status === 200,
  });
}
