/*
Copyright (c) Silver Spring Networks, Inc.

All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the ""Software""), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Except as contained in this notice, the name of Silver Spring Networks, Inc.
shall not be used in advertising or otherwise to promote the sale, use or other
dealings in this Software without prior written authorization from Silver
Spring Networks, Inc.
*/

'use strict';

import 'isomorphic-fetch';

const rp = ({uri, method, headers, body}) => {
  const options = {method, headers};

  if (method === 'POST') {
    options.body = JSON.stringify(body)
  }
  return fetch(uri, options).then(response => response.json())
};


const tokenHasExpired = token => {
  const body = JSON.parse(Buffer.from(token.split('.')[1], 'base64'));
  const exp = new Date(body.exp * 1000);
  const now = new Date();
  return exp < now;
};

const DEFAULT_SOLUTION = 'sandbox';
const DEFAULT_ENDPOINT = 'https://poc.api.ssniot.cloud';

class StarfishService
{
  constructor(options, ...args) {
    let apiBaseUrl, solution, tokenOrClientId, secret;
    if(typeof options == 'object') {
      if(options.credentials && options.token) {
        throw new Error("Specify either credentials or token, not both")
      }
      if(!options.credentials && !options.token) {
        throw new Error("Specify either credentials or token")
      }
      if(options.credentials && (!options.credentials.clientId || !options.credentials.clientSecret)) {
        throw new Error("Credentials requires clientId and clientSecret")
      }
      apiBaseUrl = options.endpoint || DEFAULT_ENDPOINT;
      solution = options.solution || DEFAULT_SOLUTION;
      if (options.token) {
        tokenOrClientId = options.token;
      }
      if (options.credentials) {
        tokenOrClientId = options.credentials.clientId;
        secret = options.credentials.clientSecret;
      }
    } else {
      apiBaseUrl = options;
      [solution, tokenOrClientId, secret] = args;
    }

    this.apiBaseUrl = apiBaseUrl;
    this.solution = solution;

    if (secret) {
      this.clientId = tokenOrClientId;
      this.secret = secret;
    } else {
      this.token = tokenOrClientId;
    }
  }

  _shouldRefreshToken() {
    if (this.secret) {
      return !this.token || tokenHasExpired(this.token);
    }
    return false;
  }

  withToken(callback) {
    if (this._shouldRefreshToken()) {
      this.getToken(this.clientId, this.secret, (error, token) => {
        if(error) {
          callback(error);
        } else {
          this.token = token;
          callback(null, token);
        }
      });
    } else {
      callback(null, this.token);
    }
  }

  getToken(clientId, secret, callback) {
    var options = {
      method: 'POST',
      uri: this.apiBaseUrl + '/tokens',
      headers: {
        'Accept': 'application/json'
      },
      body: {
        clientId: clientId,
        clientSecret: secret
      },
      json: true // Automatically parses the JSON string in the response
    };
    console.log("GetToken: " + JSON.stringify(options, null, 2));
    rp(options)
      .then(response => {
          console.log('Get Tokens Repsonse:' + JSON.stringify(response, null, 2));
          callback(null, response.accessToken);
      })
      .catch((err) => {
         console.log(err);
         callback(err, null);
      });
  }

  getDevices(callback) {
    //retreive from starfish
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'GET',
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + "/devices",
          headers: {
              'Authorization': token
          },
          json: true // Automatically parses the JSON string in the response
        };
        console.log("Get Devices Options: " + JSON.stringify(options, null, 2));
        rp(options)
          .then((response) => {
              console.log('Get Devices Response:' + JSON.stringify(response, null, 2));
              if(response.devices && response.devices.length > 0) {
                return callback(null, response.devices);
              }
              callback(new Error("No devices found"), null);
          })
          .catch((err) => {
             console.log(err);
             callback(err, null);
          });
      }
    });
  }

  queryObservations(querystring, callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'GET',
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + "/observations",
          qs: querystring,
          headers: {
              'Authorization': token
          },
          json: true // Automatically stringifies the body to JSON
        };
        console.log("GET observations Options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then((response) => {
            console.log('Get Device Observations Response:' + JSON.stringify(response, null, 2));
            if(response) {
              callback(null, response)
            } else {
              callback(new Error("No observations found"));
            }
          })
          .catch(function (err) {
            callback(err, null);
          });
      }
    });
  }

  getDeviceObservations(deviceId, callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'GET',
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + '/devices/' + deviceId + "/observations",
          headers: {
              'Authorization': token
          },
          json: true // Automatically stringifies the body to JSON
        };
        console.log("GET device observations options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then((response) => {
            console.log('Get Device Observations Response:' + JSON.stringify(response, null, 2));
            if(response) {
              callback(null, response)
            } else {
              callback(new Error("No observations found"));
            }
          })
          .catch(function (err) {
            callback(err, null);
          });
      }
    });
  }

  getObservations(callback) {
    return this.queryObservations({}, callback);
  }

  postDeviceObservation(deviceId, observation, callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'POST',
          body: observation,
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + "/devices/" + deviceId + "/observations",
          headers: {
              'Authorization': token
          },
          json: true // Automatically stringifies the body to JSON
        };
        console.log("Post Options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then(function (response) {
            callback(null, response);
          })
          .catch(function (err) {
            callback(err, null);
          });
      }
    });
  }

  postDevice(device, callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'POST',
          body: device,
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + "/devices/",
          headers: {
              'Authorization': token
          },
          json: true // Automatically stringifies the body to JSON
        };
        console.log("Post Options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then(function (response) {
            callback(null, response);
          })
          .catch(function (err) {
            callback(err, null);
          });
      }
    });
  }

  deleteDevice(deviceId, callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'DELETE',
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + "/devices/" + deviceId,
          headers: {
              'Authorization': token
          },
          json: true // Automatically stringifies the body to JSON
        };
        console.log("Delete Options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then(function (response) {
            callback(null, response);
          })
          .catch(function (err) {
            callback(err, null);
          });
      }
    });
  }
}

module.exports = StarfishService;
