var request = require("request");

var options = { method: 'GET',
  url: 'https://api.servicem8.com/custom_fields_1.0' };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});
