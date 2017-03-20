'use strict';

import {expect} from "chai";
import mockery from "mockery";
import jwt from 'jsonwebtoken';
import sinon from 'sinon';
import StarfishService from 'starfish-sdk';

const foobar = "01:02:03:04:05:06";
const foobar2 = "ab:cd:ef:gh:ij:kl";

function buildDevices() {
  var response = {
    "devices": [
      {
        "id": "00000000-0000-0000-0000-000000000000",
        "deviceType" : "test-device",
        "domainInfo" : {
            "fookey" : foobar
        }
      },
      {
        "id": "10000000-0000-0000-0000-000000000000",
        "deviceType" : "test-device-2",
        "domainInfo" : {
            "fookey" : foobar2
        }
      }
    ]
  };
  return response;
}

function buildObservations() {
  var observations = {
    "observations": [{
      "timestamp": "2016-08-15T21:53:31.238Z",
      "temperature": 37.5,
      "acceleration": {
        "x": 0.02,
        "y": 0.05,
        "z": 1.25
      },
      "humidity": 123,
      "batteryLevel": 82
    }]
  };
  return observations;
}

describe('StarfishService', () =>  {
  let host;
  let token;
  let starfishResponses;
  let starfishErrorResponse;
  let isSuccess;
  let rpOptions;
  let rpCallCount;
  let solution = 'TEST';


  before(function () {
    mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
    });
    mockery.registerMock('request-promise-native', options => {
      rpOptions.push(options);
      return new Promise((resolve, reject) => {
        if(isSuccess) {
          resolve(starfishResponses[rpCallCount++]);
        } else {
          reject(starfishErrorResponse);
        }
      });
    });
  });

  beforeEach(() => {
    rpCallCount = 0;
    rpOptions = [];
    host = "http://localhost:3000";
    token = "tokenissecret";
    starfishResponses = [];
    isSuccess = undefined;
    starfishErrorResponse = new Error("No devices found");
  });

  after(function() {
    mockery.disable();
    mockery.deregisterAll();
  });

  describe('constructor', () => {
    const options = {
      'endpoint' : 'https://starfishendpoint.com',
      'credentials' : {
        'clientId' : 'someClientId',
        'clientSecret' : 'someClientSecret'
      },
      'token' : 'someToken',
      'solution' : 'defaultsolution'
    }
    it("should throw an error if credentials and token specified", () => {
      const options = {
        credentials: {
          clientId: "someClientId",
          clientSecret: "someClientSecret"
        },
        token: "blablabla"
      }
      expect(() => {
        const service = new StarfishService(options)
      }).to.throw(Error)
    })
    context("Token Not Defined", () =>{
      it('should throw an error if credentials is not defined in options', () => {
        const options = {}
        expect(() => {
          const service = new StarfishService(options)
        }).to.throw(Error)
      })
      it('should throw an error if credentials.clientId is not defined in options',() => {
        const options = {
          credentials: {
            clientSecret: "someClientSecret"
          }
        }
        expect(() => {
          const service = new StarfishService(options)
        }).to.throw(Error)
      })
      it('should throw an error if credentials.clientSecret is not defined in options',() => {
        const options = {
          credentials: {
            clientId: "someClientId"
          }
        }
        expect(() => {
          const service = new StarfishService(options)
        }).to.throw(Error)
      })
    })
  });

  describe('getDevices', () => {

    it('should return devices retrieved from Starfish', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);

      isSuccess = true;
      starfishResponses.push(buildDevices());

      service.getDevices((error, response) => {
        expect(error).to.be.null;
        expect(response).to.have.members(starfishResponses[0].devices);
        done();
      });
    });

    it('should return error if received from Starfish', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);

      isSuccess = false;

      service.getDevices((err, devices) => {
        expect(devices).to.be.null;
        expect(err).to.not.be.null;
        expect(err.message).to.equal("No devices found");
        done();
      });
    });

    it('should respond with error if no devices returned', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);

      isSuccess = true;

      starfishResponses.push(buildDevices());
      starfishResponses[0].devices = [];

      service.getDevices((err, devices) => {
        expect(devices).to.be.null;
        expect(err).to.not.be.null;
        expect(err.message).to.equal("No devices found");
        done();
      });
    });
  });

  describe('postDeviceObservation', () => {
    it('should return success if post to starfish observation api is success.', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = "something";

      isSuccess = true;

      service.postDeviceObservation("deviceId", buildObservations(), (err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.equal(expected);
        done();
      });
    });

    it('should return error if post to starfish observation api has failed.', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);

      isSuccess = false;

      service.postDeviceObservation("deviceId", buildObservations(), (err, response) => {
        expect(response).to.be.null;
        expect(err).to.be.not.null;
        expect(err).to.equal(starfishErrorResponse);
        done();
      });
    });
  });
  describe('postDevice', () => {
    it('should return success if post to devices api is success.', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = {id: "123"};

      isSuccess = true;

      const testDevice = {"deviceType": "Test", "domainInfo": {}}
      service.postDevice(testDevice, (err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.equal(expected);
        done();
      });
    });

    it('should return error if post to starfish devices api has failed.', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);

      isSuccess = false;

      const testDevice = {"deviceType": "Test", "domainInfo": {}}
      service.postDevice(testDevice, (err, response) => {
        expect(response).to.be.null;
        expect(err).to.be.not.null;
        expect(err).to.equal(starfishErrorResponse);
        done();
      });
    });
  });

  describe('deleteDevice', () => {
    it('should return success if delete to device api is success.', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = {};

      isSuccess = true;

      service.deleteDevice("1234", (err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.equal(expected);
        done();
      });
    });

    it('should return error if delete to device api has failed.', (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);

      isSuccess = false;

      service.deleteDevice("not-found-device-id", (err, response) => {
        expect(response).to.be.null;
        expect(err).to.be.not.null;
        expect(err).to.equal(starfishErrorResponse);
        done();
      });
    });
  });
  describe('getObservations', () => {
    it("should return the api response", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = [buildObservations()];

      isSuccess = true;

      service.getObservations((err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.equal(expected);
        done();
      });
    });
    it("should respond with empty array if no device observations", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = [];

      isSuccess = true;

      service.getObservations((err, response) => {
        expect(response).to.be.an('array').that.is.empty;
        done();
      });
    });
    it("should error if response is null", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = null;

      isSuccess = true;

      service.getObservations((err, response) => {
        expect(err.message).to.equal("No observations found");
        expect(response).to.not.exist;
        done();
      });
    });
    it("should error if get request fails", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishErrorResponse = "Really Bad Error";

      isSuccess = false;

      service.getObservations((err, response) => {
        expect(err).to.equal(expected);
        expect(response).to.not.exist;
        done();
      });
    });
  });
  describe('getDeviceObservations', () => {
    it("should include the deviceId in the URI", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = [buildObservations()];
      const deviceId = '1234'

      isSuccess = true;

      service.getDeviceObservations(deviceId, (err, response) => {
        expect(rpOptions[0].uri).has.match(new RegExp(".*devices\/" + deviceId + "\/observations$"));
        done();
      });
    });
    it("should include the solution in the URI", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = [buildObservations()];

      isSuccess = true;

      service.getDeviceObservations('1234', (err, response) => {
        expect(rpOptions[0].uri).has.match(new RegExp(".*\/solutions\/" + solution + "\/devices"));
        done();
      });
    });
    it("should return the api response", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = [buildObservations()];

      isSuccess = true;

      service.getDeviceObservations('1234', (err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.equal(expected);
        done();
      });
    });
    it("should respond with empty array if no device observations", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = [];

      isSuccess = true;

      service.getDeviceObservations('1234', (err, response) => {
        expect(response).to.be.an('array').that.is.empty;
        done();
      });
    });
    it("should error if response is null", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishResponses[0] = null;

      isSuccess = true;

      service.getDeviceObservations('1234', (err, response) => {
        expect(err.message).to.equal("No observations found");
        expect(response).to.not.exist;
        done();
      });
    });
    it("should error if get request fails", (done) => {
      var StarfishService = require('../lib/starfish');
      let service = new StarfishService(host, solution, token);
      const expected = starfishErrorResponse = "Really Bad Error";

      isSuccess = false;

      service.getDeviceObservations('1234', (err, response) => {
        expect(err).to.equal(expected);
        expect(response).to.not.exist;
        done();
      });
    });
  });
  describe('getToken', () => {
    const now = 1475175515;
    const expiredToken = jwt.sign({exp: now - 1}, 'secret');
    const freshToken = jwt.sign({exp: now + 1}, 'secret');
    const clientId = "expectedClientId";
    const secret = "expectedSecret";
    let service

    let clock;
    before(() => {
      clock = sinon.useFakeTimers(now * 1000);
    });
    after(() => {
      clock.restore();
    })

    beforeEach(() => {
      const StarfishService = require('../lib/starfish');
      service = new StarfishService(host, solution, clientId, secret);
    });

    it("should call callback with error", done => {
      isSuccess = false;
      const expected = starfishErrorResponse = "expectedError";
      service.getToken("", "", (error, result) => {
        expect(error).to.equal(expected);
        done();
      });
    });

    [
      {method: "getObservations", args: [], response: {}},
      {method: "getDevices", args: [], response: {devices: []}},
      {method: "queryObservations", args: [{from: 'x', to: 'y'}], response: {}},
      {method: "postDeviceObservation", args: ["did", {}], response: {}},
      {method: "getDeviceObservations", args: ["did"], response: {}},
      {method: "postDevice", args: [{}], response: {}},
      {method: "deleteDevice", args: ["did"], response: {}}

    ].forEach(scenario => {
      const call = callback => {
        const method = service[scenario.method];
        const args = scenario.args.concat([callback]);
        return method.apply(service, args);
      };

      context(scenario.method, () => {
        it("should auto get token with clientId and secret first call", done => {
          isSuccess = true;
          starfishResponses.push({accessToken: freshToken});
          starfishResponses.push(scenario.response);

          call((error, result) => {
            expect(rpOptions[0]).to.have.deep.property('body.clientId', clientId);
            expect(rpOptions[0]).to.have.deep.property('body.clientSecret', secret);
            expect(service.token).to.equal(freshToken);
            done();
          });
        });
        it("should get a new token if the current token is expired", done => {
          isSuccess = true;
          starfishResponses.push({accessToken: freshToken});
          starfishResponses.push(scenario.response);

          service.token = expiredToken;

          call((error, result) => {
            expect(rpOptions[0]).to.have.deep.property('body.clientId', clientId);
            expect(rpOptions[0]).to.have.deep.property('body.clientSecret', secret);
            expect(service.token).to.equal(freshToken);
            done();
          });
        });
        it("should not call getToken if the token is fresh", done => {
          sinon.spy(service, 'getToken');
          isSuccess = true;
          starfishResponses.push(scenario.response);
          service.token = freshToken;

          call((error, result) => {
            expect(service.getToken.called).to.be.false;
            done();
          });
        });
        it("should call callback with error if withToken fails", done => {
          isSuccess = false;
          const expected = starfishErrorResponse = "oh gosh!";
          starfishResponses.push(scenario.response);
          service.token = expiredToken;

          call((error, result) => {
            expect(error).to.equal(expected);
            done();
          });
        });
        const expectedClientId = "aGreatClientId";
        const expectedClientSecret = "theBestClientSecret";

        it('should use the credentials defined in options', done => {
          const StarfishService = require('../lib/starfish');
          service = new StarfishService({
            credentials: {
              clientId: expectedClientId,
              clientSecret: expectedClientSecret
            }
          });
          call((error, result) => {
            expect(rpOptions[0]).to.have.deep.property('body.clientId', expectedClientId);
            expect(rpOptions[0]).to.have.deep.property('body.clientSecret', expectedClientSecret);
            done();
          });
        })

        it('should use the solution defined in options', (done) => {
          const StarfishService = require("../lib/starfish");
          const expectedSolution = 'testSolution'
          const options = {
            'endpoint' : 'https://starfishendpoint.com',
            'token': 'someToken',
            'solution' : expectedSolution
          }
          service = new StarfishService(options)
          call((error, result) => {
            expect(rpOptions[0].uri).has.match(new RegExp(".*\/solutions\/" + expectedSolution));
            done();
          })
        })
        it('should use sandbox as solution if not defined in options', (done) => {
          const StarfishService = require("../lib/starfish");
          const expectedSolution = 'sandbox'
          const options = {
            'endpoint' : 'https://starfishendpoint.com',
            'token': 'someToken'
          }
          service = new StarfishService(options)
          call((error, result) => {
            expect(rpOptions[0].uri).has.match(new RegExp(".*\/solutions\/" + expectedSolution));
            done();
          })
        })
        it('should use the endpoint defined in options', (done) => {
          const StarfishService = require("../lib/starfish");
          const expectedEndpoint = "https://example.com"
          const options = {
            endpoint: expectedEndpoint,
            'token': 'someToken'
          }
          service = new StarfishService(options)
          call((error, result) => {
            expect(rpOptions[0].uri).has.match(new RegExp("^" + expectedEndpoint));
            done();
          })
        })

        it('should use the default endpoint if not defined in options', (done) => {
          const StarfishService = require("../lib/starfish");
          const expectedEndpoint = "https://poc.api.ssniot.cloud"
          const options = {
            'token': 'someToken'
          }
          service = new StarfishService(options)
          call((error, result) => {
            expect(rpOptions[0].uri).has.match(new RegExp("^" + expectedEndpoint));
            done();
          })
        })
        it("should use the token if defined in options", (done) => {
          const StarfishService = require("../lib/starfish");
          const expectedToken = "myToken"
          const options = {
            token: expectedToken
          }
          service = new StarfishService(options)
          call((error, result) => {
            expect(rpOptions[0].headers.Authorization).to.equal(expectedToken);
            done();
          })
        })
      });
    });
  });
});
