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

const preparePagingResponse = (response) => {
  const pagingResponse = {data: response.body};
  if(response.headers && response.headers.next_page)
    pagingResponse.next_page = response.headers.next_page;
  return pagingResponse;
}

const queryParams = (params) => {
   return Object.keys(params)
     .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
     .join('&');
}

const rp = ({uri, qs, method, headers, body, resolveWithFullResponse}) => {
  headers = Object.assign({}, headers, {"Content-Type": "application/json"})
  const options = {method, headers};
  if (qs) {
    uri += (uri.indexOf('?') === -1 ? '?' : '&') + queryParams(qs);
  }
  if (method === 'POST' || method === 'PUT') {
    options.body = JSON.stringify(body)
  }
  if (resolveWithFullResponse) {
    let response = {};
    return fetch(uri, options).then((res) => {
        response = {
          headers: {next_page: res.headers.get('next_page')},
        };
        return res.json();
      }).then(function (json) {
        response.body = json;
        return response;
      });
  }
  return fetch(uri, options).then(response => response.json())
};


const tokenHasExpired = token => {
  const body = JSON.parse(new Buffer(token.split('.')[1], 'base64'));
  const exp = new Date(body.exp * 1000);
  const now = new Date();
  return exp < now;
};

const DEFAULT_SOLUTION = 'sandbox';
const DEFAULT_ENDPOINT = 'https://api.data-platform.developer.ssni.com';

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
      let expired = true;
      return !this.token || tokenHasExpired(this.token);
    }
    return false;
  }

  withToken(callback) {
    let needsRefresh;
    try {
      needsRefresh = this._shouldRefreshToken()
    } catch (error) {
      return callback(new Error(`Token Error: ${error.message}`))
    }
    if (needsRefresh) {
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
    return this.queryDevices({}, callback);
  }

  queryDevices(querystring, callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'GET',
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + "/devices",
          qs: querystring,
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

  getNextPage(next_page, callback) {
    if (!next_page)
      callback(new Error("next_page not found"));

    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'GET',
          uri: next_page,
          headers: {
              'Authorization': token
          },
          resolveWithFullResponse: true, //To include response headers
          json: true // Automatically stringifies the body to JSON
        };
        console.log("GET Next Page Options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then((response) => {
            console.log('Get Next Page Response:' + JSON.stringify(response, null, 2));
            if(response && response.body) {
              callback(null, preparePagingResponse(response))
            } else {
              callback(new Error("next_page not found"));
            }
          })
          .catch(function (err) {
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
          resolveWithFullResponse: true, //To include response headers
          json: true // Automatically stringifies the body to JSON
        };
        console.log("GET observations Options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then((response) => {
            console.log('Get Observations Response:' + JSON.stringify(response, null, 2));
            if(response && response.body) {
              callback(null, preparePagingResponse(response))
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

  queryDeviceObservations(deviceId, querystring, callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'GET',
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + '/devices/' + deviceId + "/observations",
          qs: querystring,
          headers: {
              'Authorization': token
          },
          resolveWithFullResponse: true, //To include response headers
          json: true // Automatically stringifies the body to JSON
        };
        console.log("GET device observations options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then((response) => {
            console.log('Get Device Observations Response:' + JSON.stringify(response, null, 2));
            if(response && response.body) {
              callback(null, preparePagingResponse(response))
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
    return this.queryDeviceObservations(deviceId, null, callback);
  }

  getObservations(callback) {
    return this.queryObservations(null, callback);
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
            callback(err);
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
            callback(err);
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
            callback(err);
          });
      }
    });
  }

  getDeviceTemplates(callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'GET',
          uri: this.apiBaseUrl + '/api/solutions/' + this.solution + "/devicetemplates",
          headers: {
              'Authorization': token
          },
          json: true // Automatically parses the JSON string in the response
        };
        console.log("Get Device Templates Options: " + JSON.stringify(options, null, 2));
        rp(options)
          .then((response) => {
              console.log('Get Device Templates Response:' + JSON.stringify(response, null, 2));
              if(response.deviceTemplates && response.deviceTemplates.length > 0) {
                return callback(null, response);
              }
              callback(new Error("No device templates found"), null);
          })
          .catch((err) => {
             console.log(err);
             callback(err, null);
          });
      }
    });
  }

  getStaticTemplates(callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method: 'GET',
          uri: this.apiBaseUrl + '/api/tenants/systemTenant/devicetemplates',
          headers: {
            'Authorization': token
          },
          json: true // Automatically parses the JSON string in the response
        };
      }
      console.log("Get Static Templates Options: " + JSON.stringify(options, null, 2));
      rp(options)
      .then((response) => {
        console.log('Get Static Templates Response:' + JSON.stringify(response, null, 2));
        return callback(null, response);
      })
      .catch((err) => {
        console.log(err);
        callback(err, null);
      });
    })
  }

  postDeviceTemplate(deviceTemplate, callback) {
    var url = this.apiBaseUrl + '/api/solutions/' + this.solution + "/devicetemplates"
    this.addOrUpdateDeviceTemplate(deviceTemplate, url, 'POST', callback)
  }

  putDeviceTemplate(templateId, deviceTemplate, callback) {
    var url = this.apiBaseUrl + '/api/solutions/' + this.solution + "/devicetemplates/" + templateId
    this.addOrUpdateDeviceTemplate(deviceTemplate, url, 'PUT', callback)
  }

  addOrUpdateDeviceTemplate(deviceTemplate, url, method, callback) {
    this.withToken((error, token) => {
      if (error) {
        callback(error);
      } else {
        var options = {
          method,
          body: deviceTemplate,
          uri: url,
          headers: {
              'Authorization': token
          },
          json: true // Automatically stringifies the body to JSON
        };
        console.log("Device Templates Options:" + JSON.stringify(options, null, 2));
        rp(options)
          .then(function (response) {
            callback(null, response);
          })
          .catch(function (err) {
            callback(err);
          });
      }
    });
  }
}

module.exports = StarfishService;
