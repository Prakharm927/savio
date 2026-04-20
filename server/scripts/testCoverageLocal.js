// server/scripts/testCoverageLocal.js
const axios = require('axios');
const h3 = require('h3-js');

const API = process.env.API || 'http://localhost:3000';

async function testLatLng(lat, lng) {
  const cell = h3.geoToH3(lat, lng, Number(process.env.H3_RESOLUTION || 8));
  const r = await axios.get(`${API}/api/coverage`, { params: { cell } });
  console.log('Cell:', cell, '\nResponse sample:', JSON.stringify(r.data.data, null, 2));
}

(async () => {
  await testLatLng(12.934533, 77.619061);
  await testLatLng(12.971891, 77.641154);
})();
