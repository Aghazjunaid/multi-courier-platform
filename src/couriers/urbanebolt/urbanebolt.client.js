const axios = require('axios');

const client = axios.create({
  baseURL: process.env.URBANEBOLT_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

module.exports = client;
