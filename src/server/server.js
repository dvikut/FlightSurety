import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
const cors = require('cors');
const NOO = 30; // 25 oracles

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

var indexes = {};

const registration = async () => {

  // register the oracles
  const accounts = await web3.eth.getAccounts();
  let registrationFee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  for(let i = 0; i < NOO; i++) {
    let account = accounts[i+11]; //leave 11 accounts for owner + airlines + passengers
    await flightSuretyApp.methods.registerOracle().send({ from: account, value : registrationFee, gas: 5000000 });
    let myIndexes = await flightSuretyApp.methods.getMyIndexes().call({from: account});
    console.log('myIndexes ' + JSON.stringify(myIndexes));
    for (let index of myIndexes) {
      if (!(index in indexes)) indexes[index] = {};
      indexes[index][account] = true;
    }
  }
};

registration();


  flightSuretyApp.events.OracleRequest({
      fromBlock: "latest"
    }, function (error, event) {
      if (error) {
        console.log(error)
      } else {
        let values = event.returnValues;
        let index = values.index;
        console.log('server in : ' + index + ' ' + JSON.stringify(indexes));
        if (index in indexes) {
          for (let acc in indexes[index]) {
            console.log('OracleRequest acc: ' + acc);
            let status = 10; // 20%
            let fortuna = Math.floor(Math.random() * 10);
            if (1 < fortuna && fortuna < 6) {
              status = 20; // 40%
            }
            switch (fortuna) {
              case 6:
                status = 0; // 10%
              break;
              case 7:
                status = 30 // 10%
              break;
              case 8:
                status = 40 // 10%
              break;
              case 9:
                status = 50 // 10%
            }
            console.log('server out : ' + index);
            flightSuretyApp.methods.submitOracleResponse(index, values.airline, values.flight, values.timestamp, status).send({ from: acc, gas: 5000000}, (error, result) => {
              if (error) console.log(error);
              console.log('OracleRequest result ' + result);
            });
          }
        }
        console.log(event)
      }
  });


  const app = express();
  app.use(cors({origin: 'http://localhost:8000'}));

  app.get('/api', (req, res) => {
      res.send({
        message: 'An API for use with your Dapp!'
      })
  })

  app.get('/airlines', (req, res) => {
    res.send([
      {
        "code": "UAE",
        "name": "Emirates"
      },
      {
        "code": "DLH",
        "name": "Lufthansa"
      },
      {
        "code": "RYR",
        "name": "Ryanair"
      },
      {
        "code": "TVS",
        "name": "Smartwings"
      },
      {
        "code": "WZZ",
        "name": "Wizz Air"
      }
    ])
})
app.get('/flights', (req, res) => {
  res.send([
    {
      "flightCode": "TVS2265",
      "airline": "TVS",
      "time": "2022-08-30T16:45:00+03:00",
      "description": "HERAKLION -> PARDUBICE"
    },
    {
      "flightCode": "DLH2CA",
      "airline": "DLH",
      "time": "2022-08-30T16:35:00+02:00",
      "description": "FRANKFURT -> BUDAPEST"
    },
    {
      "flightCode": "UAE82WA",
      "airline": "UAE",
      "time": "2022-08-30T14:20:00+01:00",
      "description": "DUBLIN -> DUBAI"
    },
    {
      "flightCode": "RYR7ZG",
      "airline": "RYR",
      "time": "2022-08-30T18:00:00+03:00",
      "description": "KAUNAS -> BUDAPEST"
    },
    {
      "flightCode": "WZZ3349",
      "airline": "WZZ",
      "time": "2022-08-30T15:55:00+02:00",
      "description": "NAPLES -> BUDAPEST"
    }
  ])
})

/*
app.listen(8100, () => {
  console.log(`Server started`);
});
*/

  export default app;


