[![CircleCI](https://circleci.com/gh/silverspringnetworks/starfish-js.svg?style=svg)](https://circleci.com/gh/silverspringnetworks/starfish-js)

# Starfish JS
A Javascript Wrapper for the Starfish APIs

## Install

```
npm install starfish-sdk
```

## Usage

```js
  const Starfish = require('starfish-sdk');
  const options = {
    'credentials' : {
      'clientId' : 'your-client-id',
      'clientSecret' : 'your-secret'
    }
  }
  var starfish = new Starfish(options)
```

| Argument         | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| credentials      | An object containing clientId and clientSecret                |
| token            | A valid starfish token (for when credentials aren't available)|
| solution         | A logical grouping of devices (default: "sandbox")            |
| endpoint         | Starfish Data Platform service (default: production endpoint) |


### Authentication
There are two ways to authenticate with the Starfish Data Platform

1. **Credentials**: Use the credentials in secure backend environments only as they are not meant to be exposed.  You can retrieve your clientId and secret when signing up for the Starfish Data Platform developer program.
2. **Token**: You can get a token directly from the Tokens API using valid credentials.  This token is suitable for use in a browser as it is short lived.

Specify either a credentials object or a token in the Starfish constructor (not both). If using a credentials object, the token refreshing is handled for you automatically.


## Examples
The following examples assume that you have an instance of starfish named `starfish`. See [Usage](#usage).

### Post Observation For A Known Device

```js
  const deviceId = "12345678-1234-1234-1234-0123456789ab"
  const observation = {
    observations: [
      {
        timestamp: new Date().toISOString(),
        temperature: 35,
        accelerometer: {
  	x: 0.01,
  	y: 0.5,
  	z: 1.6
        }
      }
    ]
  }

  starfish.postDeviceObservations(deviceId, observation, (err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Success")
    }
  })
```

### List Devices

```js
  starfish.getDevices((err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return devices: ", data)
    }
  })
```

### Get Device Observations

```js
 const deviceId = "12345678-1234-1234-1234-0123456789ab"

 starfish.getDeviceObservations(deviceId, (err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return device observations: ", JSON.stringify(data))
    }
  })
```

### Get All Device Observations
 This will return the latest observations for all devices

 ```js
 starfish.getObservations((err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return all device observations: ", JSON.stringify(data))
    }
  })

```
