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
import {expect} from "chai";
import jwt from 'jsonwebtoken';
import sinon from 'sinon';
import sinonTest from 'sinon-test';

import StarfishService from '../lib/starfish';

sinon.test = sinonTest.configureTest(sinon);
sinon.testCase = sinonTest.configureTestCase(sinon);

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

function buildDeviceTemplates() {
  var response = {
    "deviceTemplates": [
      {
        "id": "00000000-0000-0000-0000-000000000000",
        "name": "test-templateName",
        "sensors": ["gps", "temperature", "humidity"]
      }
    ]
  };
  return response;
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

  before(() => {
    sinon.stub(global, 'fetch');
  })


  beforeEach(() => {
    rpCallCount = 0;
    rpOptions = [];
    host = "http://localhost:3000";
    token = jwt.sign({exp: Date.now() + 1000}, 'secret');
    starfishResponses = [];
    isSuccess = undefined;
    starfishErrorResponse = new Error("No devices found");
    fetch.reset();
  });

  after(function() {
    fetch.restore();
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
      const service = new StarfishService(host, solution, token);
      const expectedResponse = buildDevices();

      fetch.onFirstCall().returns(Promise.resolve(new Response(JSON.stringify(expectedResponse))));

      service.getDevices((error, response) => {
        expect(error).to.be.null;
        expect(response).to.deep.have.members(expectedResponse.devices);
        done();
      });
    });

    it('should return error if devices undefined', (done) => {
      const service = new StarfishService(host, solution, token);

      fetch.onFirstCall().returns(Promise.resolve(new Response('{}')))

      service.getDevices((err, devices) => {
        expect(devices).to.be.null;
        expect(err).to.not.be.null;
        expect(err.message).to.equal("No devices found");
        done();
      });
    });

    it('should respond with error if no devices returned', (done) => {
      const service = new StarfishService(host, solution, token);
      const expected = buildDevices();
      expected.devices = []

      fetch.onFirstCall().returns(Promise.resolve(new Response(JSON.stringify(expected))))

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
      let service = new StarfishService(host, solution, token);

      fetch.onFirstCall().returns(Promise.resolve(new Response("{}")))

      service.postDeviceObservation("deviceid", buildObservations(), (err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.deep.equal({});
        done();
      });
    });

    it('should return error if post to starfish observation api has failed.', (done) => {
      const service = new StarfishService(host, solution, token);
      const expectedError = new Error("boo hoo")


      fetch.onFirstCall().returns(Promise.reject(expectedError))

      service.postDeviceObservation("deviceid", buildObservations(), (err, response) => {
        expect(response).to.not.exist;
        expect(err).to.not.be.null;
        expect(err).to.equal(expectedError);
        done();
      });
    });
  });
  describe('postDevice', () => {
    it('should return success if post to devices api is success.', (done) => {
      let service = new StarfishService(host, solution, token);
      const expected = {"id": "123"};
      fetch.onFirstCall().resolves(new Response(JSON.stringify(expected)));

      const testDevice = {"deviceType": "test", "domainInfo": {}}
      service.postDevice(testDevice, (err, response) => {
        expect(err).to.not.exist;
        expect(response).to.not.be.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });

    it('should return error if post to starfish devices api has failed.', (done) => {
      let service = new StarfishService(host, solution, token);

      const theError = new Error("bad mojo")
      fetch.onFirstCall().rejects(theError)


      const testdevice = {"devicetype": "test", "domaininfo": {}}
      service.postDevice(testdevice, (err, response) => {
        expect(response).to.not.exist;
        expect(err).to.be.not.null;
        expect(err).to.equal(theError);
        done();
      });
    });
  });

  describe('deleteDevice', () => {
    it('should return success if delete to device api is success.', (done) => {
      const service = new StarfishService(host, solution, token);
      const expected = {};
      fetch.onFirstCall().resolves(new Response(JSON.stringify(expected)));

      service.deleteDevice("1234", (err, response) => {
        expect(err).to.not.exist;
        expect(response).to.be.not.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });

    it('should return error if delete to device api has failed.', (done) => {
      const service = new StarfishService(host, solution, token);
      const theError = new Error("bad mojo")
      fetch.onFirstCall().rejects(theError)

      service.deleteDevice("not-found-device-id", (err, response) => {
        expect(response).to.not.exist;
        expect(err).to.be.not.null;
        expect(err).to.equal(theError);
        done();
      });
    });
  });

  describe('getDeviceTemplates', () => {
    it('should return devicetemplates retrieved from Starfish', (done) => {
      const service = new StarfishService(host, solution, token);
      const expectedResponse = buildDeviceTemplates();
      fetch.onFirstCall().returns(Promise.resolve(new Response(JSON.stringify(expectedResponse))));
      service.getDeviceTemplates((error, response) => {
        expect(error).to.be.null;
        expect(response).to.deep.equal(expectedResponse);
        done();
      });
    });
    it('should return error if devicetemplates undefined', (done) => {
      const service = new StarfishService(host, solution, token);
      fetch.onFirstCall().returns(Promise.resolve(new Response('{}')))
      service.getDeviceTemplates((err, response) => {
        expect(response).to.be.null;
        expect(err).to.not.be.null;
        expect(err.message).to.equal("No device templates found");
        done();
      });
    });
    it('should respond with error if no devicetemplates returned', (done) => {
      const service = new StarfishService(host, solution, token);
      const expected = {
        'deviceTemplates': []
      }
      fetch.onFirstCall().returns(Promise.resolve(new Response(JSON.stringify(expected))));
      service.getDeviceTemplates((err, response) => {
        expect(response).to.be.null;
        expect(err).to.not.be.null;
        expect(err.message).to.equal("No device templates found");
        done();
      });
    });
    it("should respond with error if error obtained while fetching devicetemplates", (done) => {
      const service = new StarfishService(host, solution, token);
      const expectedError = new Error("Error");
      fetch.onFirstCall().returns(Promise.reject(expectedError));
      service.getDeviceTemplates((err, response) => {
        expect(response).to.be.null;
        expect(err).to.not.be.null;
        expect(err).to.equal(expectedError);
        done();
      });
    });
  });

  describe("postDeviceTemplate", () => {
    it("should call the api with POST method", () => {
      let service = new StarfishService(host, solution, token);
      const testDeviceTemplate = {"name": "templateName", "sensors": ["some", "sensor"]}
      fetch.onFirstCall().resolves(new Response('{}'));
      service.postDeviceTemplate(testDeviceTemplate, (err, response) => {
        expect(fetch.firstCall.args[1].method).to.equal('POST');
        done();
      });
    });
    it('should return success if post to devicetemplates api is success.', (done) => {
      let service = new StarfishService(host, solution, token);
      const testDeviceTemplate = {"name": "templateName", "sensors": ["some", "sensor"]}
      const expected = Object.assign({"id": "templateid"}, testDeviceTemplate);
      fetch.onFirstCall().resolves(new Response(JSON.stringify(expected)));
      service.postDeviceTemplate(testDeviceTemplate, (err, response) => {
        expect(err).to.not.exist;
        expect(response).to.not.be.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });
    it('should return error if post to starfish devicetemplates api has failed.', (done) => {
      let service = new StarfishService(host, solution, token);
      const theError = new Error("Error")
      fetch.onFirstCall().rejects(theError)
      const testDeviceTemplate = {"name": "templateName", "sensors": ["some", "sensor"]}
      service.postDeviceTemplate(testDeviceTemplate, (err, response) => {
        expect(response).to.not.exist;
        expect(err).to.be.not.null;
        expect(err).to.equal(theError);
        done();
      });
    });
  });

  describe("putDeviceTemplate", () => {
    it("should call the api with PUT method", () => {
      let service = new StarfishService(host, solution, token);
      const testDeviceTemplate = {"id": "existingid", "name": "templateName", "sensors": ["some", "sensor"]}
      fetch.onFirstCall().resolves(new Response('{}'));
      service.putDeviceTemplate(testDeviceTemplate, (err, response) => {
        expect(fetch.firstCall.args[1].method).to.equal('PUT');
        done();
      });
    });
    it('should return success if put to devicetemplates api is success.', (done) => {
      let service = new StarfishService(host, solution, token);
      const testDeviceTemplate = {"id": "existingid", "name": "templateName", "sensors": ["some", "sensor"]}
      fetch.onFirstCall().resolves(new Response(JSON.stringify(testDeviceTemplate)));
      service.putDeviceTemplate(testDeviceTemplate, (err, response) => {
        expect(err).to.not.exist;
        expect(response).to.not.be.null;
        expect(response).to.deep.equal(testDeviceTemplate);
        done();
      });
    });
    it('should return error if put to starfish devicetemplates api has failed.', (done) => {
      let service = new StarfishService(host, solution, token);
      const theError = new Error("Error")
      fetch.onFirstCall().rejects(theError)
      const testDeviceTemplate = {"id": "existingid", "name": "templateName", "sensors": ["some", "sensor"]}
      service.putDeviceTemplate(testDeviceTemplate, (err, response) => {
        expect(response).to.not.exist;
        expect(err).to.be.not.null;
        expect(err).to.equal(theError);
        done();
      });
    });
  });

  describe('getObservations', () => {
    it("should return the api response", (done) => {
      let service = new StarfishService(host, solution, token);
      const observations = [buildObservations()];
      const expected = {data: observations };
      fetch.onFirstCall().resolves(new Response(JSON.stringify(observations)));

      service.getObservations((err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });
    it("should respond with empty array if no device observations", (done) => {
      let service = new StarfishService(host, solution, token);
      const observations = [];
      const expected = {data: observations};
      fetch.onFirstCall().resolves(new Response(JSON.stringify(observations)));

      service.getObservations((err, response) => {
        expect(response.data).to.be.an('array').that.is.empty;
        done();
      });
    });
    it("should error if response is null", (done) => {
      let service = new StarfishService(host, solution, token);
      const expected = null;
      fetch.onFirstCall().resolves(new Response(JSON.stringify(expected)));

      service.getObservations((err, response) => {
        expect(err.message).to.equal("No observations found");
        expect(response).to.not.exist;
        done();
      });
    });
    it("should error if get request fails", (done) => {
      let service = new StarfishService(host, solution, token);
      const expected = new Error("something bad");

      fetch.onFirstCall().rejects(expected);

      service.getObservations((err, response) => {
        expect(err).to.equal(expected);
        expect(response).to.not.exist;
        done();
      });
    });
    it("should call callback with next_page if response header has it", (done) => {
      let service = new StarfishService(host, solution, token);
      const response = new Response(JSON.stringify([]));
      response.headers.set("next_page", "http://somepage.com");
      const expected = {next_page: "http://somepage.com", data: [] };
      fetch.onFirstCall().resolves(response);

      service.getObservations((err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });
  });
  describe('getDeviceObservations', () => {
    it("should include the deviceid in the uri", (done) => {
      let service = new StarfishService(host, solution, token);
      const observations = [buildObservations()];
      const expected = {data: observations};
      fetch.onFirstCall().resolves(new Response(JSON.stringify(observations)));
      const deviceid = '1234'

      service.getDeviceObservations(deviceid, (err, response) => {
        expect(fetch.calledWithMatch(new RegExp(".*devices\/" + deviceid + "\/observations$"))).to.be.true
        done();
      });
    });
    it("should include the solution in the uri", (done) => {
      let service = new StarfishService(host, solution, token);
      const expected = [buildObservations()];
      fetch.onFirstCall().resolves(new Response(JSON.stringify(expected)));

      service.getDeviceObservations('1234', (err, response) => {
        expect(fetch.calledWithMatch(new RegExp(".*solutions\/" + solution + "\/devices"))).to.be.true
        done();
      });
    });
    it("should return the api response", (done) => {
      let service = new StarfishService(host, solution, token);
      const observations = [buildObservations()];
      const expected = {data: observations};
      fetch.onFirstCall().resolves(new Response(JSON.stringify(observations)));

      service.getDeviceObservations('1234', (err, response) => {
        expect(err).to.not.exist;
        expect(response).to.be.not.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });
    it("should respond with empty array if no device observations", (done) => {
      let service = new StarfishService(host, solution, token);
      const observations = [];
      const expected = {data: observations};
      fetch.onFirstCall().resolves(new Response(JSON.stringify(observations)));

      service.getDeviceObservations('1234', (err, response) => {
        expect(response.data).to.be.an('array').that.is.empty;
        done();
      });
    });
    it("should error if response is null", (done) => {
      let service = new StarfishService(host, solution, token);
      const expected = null;
      fetch.onFirstCall().resolves(new Response(JSON.stringify(expected)));

      service.getDeviceObservations('1234', (err, response) => {
        expect(err.message).to.equal("No observations found");
        expect(response).to.not.exist;
        done();
      });
    });
    it("should error if get request fails", (done) => {
      let service = new StarfishService(host, solution, token);
      const theError = new Error("wubba lubba dubba")
      fetch.onFirstCall().rejects(theError);

      service.getDeviceObservations('1234', (err, response) => {
        expect(err).to.equal(theError);
        expect(response).to.not.exist;
        done();
      });
    });
    it("should call callback with next_page if response header has it", (done) => {
      let service = new StarfishService(host, solution, token);
      const response = new Response(JSON.stringify([]));
      response.headers.set("next_page", "http://somepage.com");
      const expected = {next_page: "http://somepage.com", data: [] };
      fetch.onFirstCall().resolves(response);

      service.getDeviceObservations('1234', (err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });
  });
  describe('getToken', () => {
    const now = 1475175515;
    const expiredToken = jwt.sign({exp: now - 1}, 'secret');
    const freshToken = jwt.sign({exp: now + 1}, 'secret');
    const clientId = "expectedclientId";
    const secret = "expectedsecret";
    let service

    let clock;
    before(() => {
      clock = sinon.useFakeTimers(now * 1000);
    });
    after(() => {
      clock.restore();
    })

    beforeEach(() => {
      service = new StarfishService(host, solution, clientId, secret);
    });

    it("should call callback with error", done => {
      const theError = new Error("thwap");
      fetch.onFirstCall().rejects(theError);

      const expected = "expectederror";
      service.getToken("", "", (error, result) => {
        expect(error).to.equal(theError);
        done();
      });
    });

    [
      {method: "getObservations", args: [], response: {}},
      {method: "getDevices", args: [], response: {devices: []}},
      {method: "queryDevices", args: [{deviceType: 'ap'}], response: {}},
      {method: "queryObservations", args: [{from: 'x', to: 'y'}], response: {}},
      {method: "queryDeviceObservations", args: ["did", {from: 'x', to: 'y'}], response: {}},
      {method: "postDeviceObservation", args: ["did", {}], response: {}},
      {method: "getDeviceObservations", args: ["did"], response: {}},
      {method: "postDevice", args: [{}], response: {}},
      {method: "deleteDevice", args: ["did"], response: {}},
      {method: "getDeviceTemplates", args: [], response: {}},
      {method: "postDeviceTemplate", args: [{}], response: {}},
      {method: "putDeviceTemplate", args: [{}], response: {}}

    ].forEach(scenario => {
      const call = callback => {
        const method = service[scenario.method];
        const args = scenario.args.concat([callback]);
        return method.apply(service, args);
      };

      context(scenario.method, () => {
        it("should auto get token with clientId and secret first call", done => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify({accessToken: freshToken})))
          fetch.onSecondCall().resolves(new Response(JSON.stringify(scenario.response)))

          call((error, result) => {
            const tokenResponse = JSON.parse(fetch.firstCall.args[1].body)
            expect(tokenResponse).to.have.deep.property('clientId', clientId);
            expect(tokenResponse).to.have.deep.property('clientSecret', secret);
            expect(service.token).to.equal(freshToken);
            done();
          });
        });
        it("should get a new token if the current token is expired", done => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify({accessToken: freshToken})))
          fetch.onSecondCall().resolves(new Response(JSON.stringify(scenario.response)))

          service.token = expiredToken;

          call((error, result) => {
            const tokenResponse = JSON.parse(fetch.firstCall.args[1].body)
            expect(tokenResponse).to.have.deep.property('clientId', clientId);
            expect(tokenResponse).to.have.deep.property('clientSecret', secret);
            expect(service.token).to.equal(freshToken);
            done();
          });
        });
        it("should call callback with error if token is not valid", done => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify({accessToken: freshToken})))
          fetch.onSecondCall().resolves(new Response(JSON.stringify(scenario.response)))

          service.token = "not a valid token";

          call((error, result) => {
            expect(error).to.be.an.instanceOf(Error);
            expect(result).to.not.exist;
            done();
          });

        })
        it("should not call getToken if the token is fresh", sinon.test(function(done)  {
          fetch.onFirstCall().resolves(new Response(JSON.stringify(scenario.response)))

          this.spy(service, 'getToken');
          service.token = freshToken;

          call((error, result) => {
            expect(service.getToken.called).to.be.false;
            done();
          });
        }));
        it("should call callback with error if withToken fails", done => {
          const expected = new Error("oh gosh!");
          fetch.onFirstCall().rejects(expected);
          service.token = expiredToken;

          call((error, result) => {
            expect(error).to.equal(expected);
            done();
          });
        });

        it('should use the credentials defined in options', done => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify({accessToken: freshToken})))
          fetch.onSecondCall().resolves(new Response(JSON.stringify(scenario.response)))
          const expectedClientId = "aGreatClientId";
          const expectedClientSecret = "theBestClientSecret";
          service = new StarfishService({
            credentials: {
              clientId: expectedClientId,
              clientSecret: expectedClientSecret
            }
          });
          call((error, result) => {
            const body = JSON.parse(fetch.firstCall.args[1].body);
            expect(body.clientId).to.equal(expectedClientId);
            expect(body.clientSecret).to.equal(expectedClientSecret);
            done();
          });
        })

        it('should use the solution defined in options', (done) => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify(scenario.response)))
          const expectedSolution = 'testSolution'
          const options = {
            'endpoint' : 'https://starfishendpoint.com',
            'token': 'someToken',
            'solution' : expectedSolution
          }
          service = new StarfishService(options)
          call((error, result) => {
            const uri = fetch.firstCall.args[0];
            expect(uri).to.match(new RegExp(".*\/solutions\/" + expectedSolution));
            done();
          })
        })
        it('should use sandbox as solution if not defined in options', (done) => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify(scenario.response)))
          const expectedSolution = 'sandbox'
          const options = {
            'endpoint' : 'https://starfishendpoint.com',
            'token': 'someToken'
          }
          service = new StarfishService(options)

          call((error, result) => {
            expect(fetch.firstCall.args[0]).to.match(new RegExp(".*\/solutions\/" + expectedSolution));
            done();
          })
        })
        it('should use the endpoint defined in options', (done) => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify(scenario.response)))
          const expectedEndpoint = "https://example.com"
          const options = {
            endpoint: expectedEndpoint,
            'token': 'someToken'
          }
          service = new StarfishService(options)
          call((error, result) => {
            expect(fetch.firstCall.args[0]).has.match(new RegExp("^" + expectedEndpoint));
            done();
          })
        })

        it('should use the default endpoint if not defined in options', (done) => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify(scenario.response)))
          const expectedEndpoint = "https://api.data-platform.developer.ssni.com"
          const options = {
            'token': 'someToken'
          }
          service = new StarfishService(options)
          call((error, result) => {
            expect(fetch.firstCall.args[0]).has.match(new RegExp("^" + expectedEndpoint));
            done();
          })
        })
        it("should use the token if defined in options", (done) => {
          fetch.onFirstCall().resolves(new Response(JSON.stringify(scenario.response)))
          const expectedToken = "myToken"
          const options = {
            token: expectedToken
          }
          service = new StarfishService(options)
          call((error, result) => {
            expect(fetch.firstCall.args[1].headers.Authorization).to.equal(expectedToken);
            done();
          })
        })
      });
    });
  });
  describe('querystring', () => {
    describe('queryDevices', () => {
      it("should use the querystring if passed", (done) => {
        const qs = {param1:'value1'};
        const expectedQueryString = "?param1=value1";

        const service = new StarfishService(host, solution, token);
        fetch.onFirstCall().returns(Promise.resolve(new Response('{}')));

        service.queryDevices(qs, (error, response) => {
          expect(fetch.firstCall.args[0]).has.match(new RegExp("^.*" + expectedQueryString + "$"));
          done();
        });
      });
      it("should not add any querystring if not passed", (done) => {
        const service = new StarfishService(host, solution, token);
        fetch.onFirstCall().returns(Promise.resolve(new Response('{}')));

        service.queryDevices(null, (error, response) => {
          expect(fetch.firstCall.args[0]).has.match(new RegExp("^.*devices$"));
          done();
        });
      });
      it('should return error if Starfish observation api has failed.', (done) => {
        const service = new StarfishService(host, solution, token);
        const expectedError = new Error("boo hoo")

        fetch.onFirstCall().returns(Promise.reject(expectedError))

        service.queryDevices({}, (err, response) => {
          expect(response).to.not.exist;
          expect(err).to.not.be.null;
          expect(err).to.equal(expectedError);
          done();
        });
      });
    });
    describe('queryObservations', () => {
      it("should use the querystring if passed", (done) => {
        const qs = {param1:'value1', param2:'value2'};
        const expectedQueryString = "?param1=value1&param2=value2";

        const service = new StarfishService(host, solution, token);
        fetch.onFirstCall().returns(Promise.resolve(new Response('{}')));

        service.queryObservations(qs, (error, response) => {
          expect(fetch.firstCall.args[0]).has.match(new RegExp("^.*" + expectedQueryString + "$"));
          done();
        });
      });
      it("should not add any querystring if not passed", (done) => {
        const service = new StarfishService(host, solution, token);
        fetch.onFirstCall().returns(Promise.resolve(new Response('{}')));

        service.queryObservations(null, (error, response) => {
          expect(fetch.firstCall.args[0]).has.match(new RegExp("^.*observations$"));
          done();
        });
      });
    });
    describe('queryDeviceObservations', () => {
      it("should use the querystring if passed", (done) => {
        const qs = {param1:'value1', param2:'value2'};
        const expectedQueryString = "?param1=value1&param2=value2";

        const service = new StarfishService(host, solution, token);
        fetch.onFirstCall().returns(Promise.resolve(new Response('{}')));

        service.queryDeviceObservations("did", qs, (error, response) => {
          expect(fetch.firstCall.args[0]).has.match(new RegExp("^.*" + expectedQueryString + "$"));
          done();
        });
      });
      it("should not add any querystring if not passed", (done) => {
        const service = new StarfishService(host, solution, token);
        fetch.onFirstCall().returns(Promise.resolve(new Response('{}')));

        service.queryDeviceObservations("did", null, (error, response) => {
          expect(fetch.firstCall.args[0]).has.match(new RegExp("^.*observations$"));
          done();
        });
      });
    });
  });
  describe('getNextPage', () => {
    const now = 1475175515;
    const expiredToken = jwt.sign({exp: now - 1}, 'secret');
    const freshToken = jwt.sign({exp: now + 1}, 'secret');
    const clientId = "expectedclientId";
    const secret = "expectedsecret";
    let service;
    let next_page = 'https://nextpage.com';
    let response = {data:[]};
    let clock;
    before(() => {
      clock = sinon.useFakeTimers(now * 1000);
    });
    after(() => {
      clock.restore();
    })

    beforeEach(() => {
      service = new StarfishService(host, solution, clientId, secret);
    });

    it("should call callback with error", done => {
      const theError = new Error("thwap");
      fetch.onFirstCall().rejects(theError);

      const expected = "expectederror";
      service.getToken("", "", (error, result) => {
        expect(error).to.equal(theError);
        done();
      });
    });
    it("should auto get token with clientId and secret first call", done => {
      fetch.onFirstCall().resolves(new Response(JSON.stringify({accessToken: freshToken})))
      fetch.onSecondCall().resolves(new Response(JSON.stringify(response)))

      service.getNextPage(next_page, (error, result) => {
        const tokenResponse = JSON.parse(fetch.firstCall.args[1].body)
        expect(tokenResponse).to.have.deep.property('clientId', clientId);
        expect(tokenResponse).to.have.deep.property('clientSecret', secret);
        expect(service.token).to.equal(freshToken);
        done();
      });
    });
    it("should get a new token if the current token is expired", done => {
      fetch.onFirstCall().resolves(new Response(JSON.stringify({accessToken: freshToken})))
      fetch.onSecondCall().resolves(new Response(JSON.stringify(response)))

      service.token = expiredToken;

      service.getNextPage(next_page, (error, result) => {
        const tokenResponse = JSON.parse(fetch.firstCall.args[1].body)
        expect(tokenResponse).to.have.deep.property('clientId', clientId);
        expect(tokenResponse).to.have.deep.property('clientSecret', secret);
        expect(service.token).to.equal(freshToken);
        done();
      });
    });
    it("should call callback with error if token is not valid", done => {
      fetch.onFirstCall().resolves(new Response(JSON.stringify({accessToken: freshToken})))
      fetch.onSecondCall().resolves(new Response(JSON.stringify(response)))

      service.token = "not a valid token";

      service.getNextPage(next_page, (error, result) => {
        expect(error).to.be.an.instanceOf(Error);
        expect(result).to.not.exist;
        done();
      });

    })
    it("should not call getToken if the token is fresh", sinon.test(function(done)  {
      fetch.onFirstCall().resolves(new Response(JSON.stringify(response)))

      this.spy(service, 'getToken');
      service.token = freshToken;

      service.getNextPage(next_page, (error, result) => {
        expect(service.getToken.called).to.be.false;
        done();
      });
    }));
    it("should call callback with error if withToken fails", done => {
      const expected = new Error("oh gosh!");
      fetch.onFirstCall().rejects(expected);
      service.token = expiredToken;

      service.getNextPage(next_page, (error, result) => {
        expect(error).to.equal(expected);
        done();
      });
    });
    it('should use the credentials defined in options', done => {
      fetch.onFirstCall().resolves(new Response(JSON.stringify({accessToken: freshToken})))
      fetch.onSecondCall().resolves(new Response(JSON.stringify(response)))
      const expectedClientId = "aGreatClientId";
      const expectedClientSecret = "theBestClientSecret";
      service = new StarfishService({
        credentials: {
          clientId: expectedClientId,
          clientSecret: expectedClientSecret
        }
      });
      service.getNextPage(next_page, (error, result) => {
        const body = JSON.parse(fetch.firstCall.args[1].body);
        expect(body.clientId).to.equal(expectedClientId);
        expect(body.clientSecret).to.equal(expectedClientSecret);
        done();
      });
    })
    it('should call the callback with error if next_page is empty', (done) => {
      const expected = "next_page not found";
      service = new StarfishService(host, solution, token);

      service.getNextPage("", (error, result) => {
        expect(error.message).to.equal(expected);
        done();
      })
    })
    it('should use next_page argument as url', (done) => {
      fetch.onFirstCall().resolves(new Response(JSON.stringify(response)))
      const options = {
        'endpoint' : 'https://starfishendpoint.com',
        'token': 'someToken'
      }
      service = new StarfishService(options)

      service.getNextPage(next_page, (error, result) => {
        expect(fetch.firstCall.args[0]).to.match(/nextpage.com/);
        done();
      })
    })
    it("should use the token if defined in options", (done) => {
      fetch.onFirstCall().resolves(new Response(JSON.stringify(response)))
      const expectedToken = "myToken"
      const options = {
        token: expectedToken
      }
      service = new StarfishService(options)
      service.getNextPage(next_page, (error, result) => {
        expect(fetch.firstCall.args[1].headers.Authorization).to.equal(expectedToken);
        done();
      })
    })
    it("should return the api response", (done) => {
      let service = new StarfishService(host, solution, token);
      const observations = [buildObservations()];
      const expected = {data: observations };
      fetch.onFirstCall().resolves(new Response(JSON.stringify(observations)));

      service.getNextPage(next_page, (err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });
    it("should respond with empty array if no device observations", (done) => {
      let service = new StarfishService(host, solution, token);
      const observations = [];
      const expected = {data: observations};
      fetch.onFirstCall().resolves(new Response(JSON.stringify(observations)));

      service.getNextPage(next_page, (err, response) => {
        expect(response.data).to.be.an('array').that.is.empty;
        done();
      });
    });
    it("should error if response is null", (done) => {
      let service = new StarfishService(host, solution, token);
      const expected = null;
      fetch.onFirstCall().resolves(new Response(JSON.stringify(expected)));

      service.getNextPage(next_page, (err, response) => {
        expect(err.message).to.equal("next_page not found");
        expect(response).to.not.exist;
        done();
      });
    });
    it("should error if get request fails", (done) => {
      let service = new StarfishService(host, solution, token);
      const expected = new Error("something bad");

      fetch.onFirstCall().rejects(expected);

      service.getNextPage(next_page, (err, response) => {
        expect(err).to.equal(expected);
        expect(response).to.not.exist;
        done();
      });
    });
    it("should call callback with next_page if response header has it", (done) => {
      let service = new StarfishService(host, solution, token);
      const response = new Response(JSON.stringify([]));
      response.headers.set("next_page", "http://somepage.com");
      const expected = {next_page: "http://somepage.com", data: [] };
      fetch.onFirstCall().resolves(response);

      service.getNextPage(next_page, (err, response) => {
        expect(err).to.be.null;
        expect(response).to.be.not.null;
        expect(response).to.deep.equal(expected);
        done();
      });
    });
  });
});
