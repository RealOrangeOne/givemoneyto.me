const fs = require('fs');

export function handler(event, context, callback) {
  callback(null, {
    statusCode: 200,
    body: JSON.stringify(fs.readdirSync(__dirname))
  });
}
