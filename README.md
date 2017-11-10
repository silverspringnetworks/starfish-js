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

### Query Devices by `deviceType`

```js
  starfish.queryDevices({deviceType:'type'}, (err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return devices: ", data)
    }
  })
```

### Get Device Observations
 This will return the latest observations for specified device (upto 1MB of observations).
 
 Use `getNextPage` to paginate through the observations.

```js
 const deviceId = "12345678-1234-1234-1234-0123456789ab"

 starfish.getDeviceObservations(deviceId, (err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return device observations: ", JSON.stringify(data))
      if(response.next_page)
        starfish.getNextPage(response.next_page, .......)
    }
  })
```

### Get All Device Observations
 This will return the latest observations for all devices

 ```js
 starfish.getObservations((err, response) => {
   if(err) {
     console.log("Error:", err)
   } else {
     console.log("Return all device observations: ", JSON.stringify(response.data))
   }
 })

```
### Query Observations
 This will return all observations that matched the filter criteria (upto 1MB of observations)

Use `getNextPage` to paginate through the observations.

 Observations can be queried using:
 
 |   Query filter   | Description                                                                                 |
 |:----------------:|:--------------------------------------------------------------------------------------------|
 | limit            | This is the maximum number of objects that may be returned. A query may return fewer than the value of limit. If not specified a default limit of 1MB is applied. If specified it will be included in the next_page link header. |
 | after            | Cursor token that is used to identify the start of the page. It is provided as part of `next_page` response header.|
 | from             | Timestamp for beginning of query range in ISO-8601 format. Observations with timestamp greater than or equal than this value will be included in the result-set. Minimum resolution shall be seconds (milliseconds will be ignored). to must also be specified and shall be greater than this value. |
 | to               | Timestamp for end of query range in ISO-8601 format. Observations with timestamp less than this value will be included in the result-set. Minimum resolution shall be seconds (milliseconds will be ignored). from must also be specified and shall be less than this value. |
 | tags             | Ability to filter result-set by tags. Only one tag supported at atime. This parameter will be ignored if only latest observation is requested (no to and from are specified). |

 ```js
 const query = {limit: 10}

 starfish.queryObservations(query, (err, response) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return all device observations: ", JSON.stringify(response.data))
      if(response.next_page)
        starfish.getNextPage(response.next_page, .......)
    }
  })

 Use `queryDeviceObservations(deviceId, query, callback)` for querying device observations.
```

### Get Device Templates
This will return the list of device templates.

```js
  starfish.getDeviceTemplates((err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return devices: ", data)
    }
  })
```

Response format in case of success:

```js
  {
    deviceTemplates: [
      {
        id: 'someid',
        name: 'templateName',
        sensors: ['few', 'sensors']
      }
    ]
  }
```

### Get count of Device Templates by `count`

```js
  starfish.queryDeviceTemplates({count:true}, (err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return devices: ", data)
    }
  })
```

Response format in case of success:

```js
  {
    count: 1
  }
```

### Post Device Template

```js
  const deviceTemplate = {
    deviceTemplate: {
      name: 'templateName',
      sensors: ["few", "sensors"]
    }
  }
  starfish.postDeviceTemplate(deviceTemplate, (err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return devices: ", data)
    }
  })
```

Response format in case of success:
```js
  {
    deviceTemplates: {
        id: 'newlycreateduuid',
        name: 'templateName',
        sensors: ['few', 'sensors']
      }
  }
```

### Edit Device Template

```js
  const deviceTemplate = {
    deviceTemplate: {
      id: 'existinguuid',
      name: 'newName',
      sensors: ["different", "sensors"]
    }
  }
  starfish.putDeviceTemplate(deviceTemplate, (err, data) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return devices: ", data)
    }
  })
```

Response format in case of success:

```js
  {
    deviceTemplates: {
      id: 'existinguuid',
      name: 'newName',
      sensors: ["different", "sensors"]
    }
  }
```

### Get Next Page
 This will return the next page of data up to the limit specified in the original request or default limit of 1MB.
 Calls the callback with error if `next_page` is either empty or there is no data.

 ```js
 starfish.getNextPage(next_page, (err, response) => {
    if(err) {
      console.log("Error:", err)
    } else {
      console.log("Return next page data: ", JSON.stringify(response.data))
      if(response.next_page)
        starfish.getNextPage(reseponse.next_page, .....)
    }
  })

 ```
