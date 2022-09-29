import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.contractOwner = null;
        this.airlines = [];
        this.passengers = [];
    }

    async initialize(callback) {
        try {
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            this.owner = accounts[0];
            console.log('Account changed to : ' + accounts[0]);

            this.web3.eth.getAccounts((error, accts) => {
            

                let counter = 1;
                
                while(this.airlines.length < 5) {
                    this.airlines.push(accts[counter++].toLocaleLowerCase());
                }

                while(this.passengers.length < 5) {
                    this.passengers.push(accts[counter++].toLocaleLowerCase());
                }

                this.flightSuretyApp.methods.getContractOwner().call({ from: self.owner}, (error, result) => {
                    this.contractOwner = result;
                    console.log('contrct.js '+this.contractOwner);
                    callback();
                });
        

            });
        } catch (error) {
            console.error(error);
        }
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(airlineCode, flightCode, timeString, callback) {
        let self = this;
        let time = new Date(timeString).getTime();
        let payload = {
            airline: airlineCode,
            flight: flightCode,
            timestamp: time
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
     
     isRegistered(address, callback) {
        let self = this;
        self.flightSuretyApp.methods
             .isRegistered(address)
             .call({ from: self.owner}, (error, result) => {
                callback(result);
            });
     }     
 
     isFunded(address, callback) {
        let self = this;
        self.flightSuretyApp.methods
             .isFunded(address)
             .call({ from: self.owner}, (error, result) => {
                callback(result);
            });
     }

     registerAirline(address, callback) {
        let self = this;
        self.flightSuretyApp.methods
             .registerAirline(address).send({from : self.owner, gas: 5000000}).then((result) => {
                callback(false, result);
             }).catch((error) => {
                callback(error, false);
             });         
     }
 
     fund(address, value, callback) {
        let self = this;
        self.flightSuretyApp.methods
             .fund(address)
             .send({ from: self.owner, value: value}, callback);
     }

     registerFlight(airlineCode, flightCode, timeString, callback) {
        let self = this;
        let timestamp = new Date(timeString).getTime();
        self.flightSuretyApp.methods
             .registerFlight(airlineCode, flightCode, timestamp)
             .send({ from: self.owner}, callback);
     }

     isFlightRegistered(airlineCode, flightCode, timeString, callback) {
        let self = this;
        let timestamp = new Date(timeString).getTime();
        self.flightSuretyApp.methods
             .isFlightRegistered(airlineCode, flightCode, timestamp)
             .call({ from: self.owner}, callback);
     }

     calcFlightKey(airlineCode, flightCode, timeString, callback) {
        let self = this;
        let timestamp = new Date(timeString).getTime();
        self.flightSuretyApp.methods
             .getFlightKey(airlineCode, flightCode, timestamp)
             .call({ from: self.owner}, (error, result) => {
                callback(result);
            });
     }

     buy(airlineCode, flightCode, timeString, value, callback) {
        let self = this;
        let timestamp = new Date(timeString).getTime();
        self.flightSuretyApp.methods
             .buy(airlineCode, flightCode, timestamp)
             .send({ from: self.owner, value: value}, callback);
     }

     hasInsurance(airlineCode, flightCode, timeString, callback) {
        let self = this;
        let timestamp = new Date(timeString).getTime();
        self.flightSuretyApp.methods
             .hasInsurance(airlineCode, flightCode, timestamp)
             .call({ from: self.owner}, callback);
     }     

     //REMOVE IT!!!!!!!!!!
     viewAirlineBalance(address, callback) {
        let self = this;
        self.flightSuretyApp.methods
             .viewAirlineBalance(address)
             .call({ from: self.owner}, (error, result) => {
                callback(result);
            });
     }

     getVotersCount(callback) {
        let self = this;
        self.flightSuretyApp.methods
             .getVotersCount()
             .call({ from: self.owner}, (error, result) => {
                callback(result);
            });
     }     

     setOperatingStatus(mode, callback) {
        let self = this;
        self.flightSuretyData.methods.setOperatingStatus(mode).send({ from: self.owner }, callback);
     }

     appContract() {
         return this.flightSuretyApp;
     }

     getFlightStatus(airlineCode, flightCode, timeString, callback) {
        let self = this;
        let timestamp = new Date(timeString).getTime();
        self.flightSuretyApp.methods
             .getFlightStatus(airlineCode, flightCode, timestamp)
             .call({ from: self.owner}, callback);
     }     

     claim(airlineCode, flightCode, timeString, callback) {
        let self = this;
        let timestamp = new Date(timeString).getTime();
        self.flightSuretyApp.methods
             .claim(airlineCode, flightCode, timestamp)
             .call({ from: self.owner}, (error, result) => {
                 if (error) {
                     callback(error, null);
                 } else {
                     let elValue = result;
                    self.flightSuretyApp.methods
                    .claim(airlineCode, flightCode, timestamp).send({ from: self.owner, gas: 5000000}, (error, value) => {
                    callback(null, this.web3.utils.fromWei(elValue, 'ether'));
                    });
                 }
            });
     }

    getCredit(callback) {
        let self = this;
        self.flightSuretyApp.methods
             .getCredit()
             .call({ from: self.owner}, (error, result) => {
                callback(this.web3.utils.fromWei(result, 'ether'));
            });
    }

    payout(callback) {
        let self = this;
        self.flightSuretyApp.methods
             .payout()
             .send({ from: self.owner, gas: 5000000}, callback);
    }

}