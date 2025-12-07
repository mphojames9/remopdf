const https = require('https');
const fs = require('fs');
const querystring = require('querystring');

// Input JS file
const inputFile = 'script.js';       // <-- change this to your JS file
const outputFile = 'script.min.js';  // <-- minified output

// Read JS code from file
fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  const postData = querystring.stringify({ input: data });

  const req = https.request({
    hostname: 'www.toptal.com',
    path: '/developers/javascript-minifier/api/raw',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, res => {
    let chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const minified = Buffer.concat(chunks).toString();
      fs.writeFile(outputFile, minified, err => {
        if (err) console.error('Error writing file:', err);
        else console.log(`✅ Minified JS saved to ${outputFile}`);
      });
    });
  });

  req.on('error', e => console.error('Request error:', e));
  req.write(postData);
  req.end();
});
