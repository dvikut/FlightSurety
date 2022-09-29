
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import Web3 from 'web3';

var contract;
var eAir = {};
var eFly = {};
const OWN = 'Owner';
const AIR = 'Airline';
const PASS = 'Passenger';
var role = PASS;

(async() => {

    let result = null;

    contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            //display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
            refresh();
        });
    

        /*
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                //display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        });
        */

        contract.appContract().events.OracleReport({fromBlock: "latest"}, async function (error, event) {
            if (error){
              console.log('OracleReport '+ error);
            }else{
              console.log('OracleReport event :' + JSON.stringify(event.returnValues));
            }
        });

        contract.appContract().events.FlightStatusInfo({fromBlock: "latest"}, async function (error, event) {
            if (error){
              console.log('FlightStatusInfo '+ error);
            }else{
                let values = event.returnValues;
                let status = parseInt(values.status);
    
              console.log('FlightStatusInfo event :' + JSON.stringify(values));
            }
        });

        contract.appContract().events.FlightStatusUpdate({fromBlock: "latest"}, async function (error, event) {
            if (error){
              console.log('FlightStatusUpdate '+ error);
            }else{
                let values = event.returnValues;
                let status = parseInt(values.status);
    
              console.log('FlightStatusUpdate event :' + JSON.stringify(values));
            }
        });

    });


    

})();

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}

function shortenAddress(address) {
    return address.substr(2, 4) + '..' + address.substr(-4, 4);
}

function enrichAirlinesAddress(airlines) {
    airlines.map(function(al, i) {
        al.address = contract.airlines[i];
    });
    return airlines;
}

function enrichAirlineRegistered(airline) {
    return new Promise((resolve, reject) => {
        contract.isRegistered(airline.address, function(response) {
            resolve(response);
        })
    });
}

function enrichAirlinesRegistered(airlines) {
    let promises = airlines.map(function(al) {
        return enrichAirlineRegistered(al).then((result) => {
            al.isRegistered = result;
            //console.log('enrichAirlinesRegistered' + ' ' + al.address + ' ' + al.isRegistered);
            return al;
        })
    });
    return Promise.all(promises);
}

function enrichAirlineFunded(airline) {
    return new Promise((resolve, reject) => {
        contract.isFunded(airline.address, function(response) {
            resolve(response);
        })
    });
}

function enrichAirlinesFunded(airlines) {
    let promises = airlines.map(function(al) {
        return enrichAirlineFunded(al).then((result) => {
            al.isFunded = result;
            //console.log('enrichAirlinesFunded' + ' ' + al.address + ' ' + al.isFunded);
            return al;
        })
    });
    return Promise.all(promises);
}

async function refreshAirlines() {
    await fetch('http://localhost:3000/airlines')
        .then((response) => response.json())
        .then((jsonarray) => enrichAirlinesAddress(jsonarray))
        .then((airlines) => enrichAirlinesRegistered(airlines))
        .then((airlines) => enrichAirlinesFunded(airlines))
        .then((eAirlines) => { 
            //console.log('eAirlines run');
                var r = new Array(), j = -1;
                r[++j] = '<h3>Airlines</h3>';
                r[++j] = '<table><tr class="row-title">';
                r[++j] = '<td>Airline</td><td>Code</td><td>Address</td><td>Registration</td><td>Fund</td></tr>';
                for (var i=0; i<eAirlines.length; i++) {
                    let al = eAirlines[i];
                    eAir[al.code] = al;
                    r[++j] ='<tr><td>';
                    r[++j] = al.name;
                    r[++j] = '</td><td>';
                    r[++j] = al.code;
                    r[++j] = '</td><td>';
                    r[++j] = shortenAddress(al.address);
                    r[++j] = '</td><td>';
                    if (al.isRegistered) {
                        r[++j] = 'Registered';
                    } else {
                        r[++j] = '<btn class="btn btn-primary regbutton" id="reg_'+al.address+'">Register</btn>';
                    } 
                    r[++j] = '</td><td>';
                    if (al.isFunded) {
                        r[++j] = 'Funded';
                    } else {
                        if (al.isRegistered) {
                            r[++j] = '<input class="fundvalue" id="fundval_'+al.address+'"><label for="fundval_'+al.address+'">ether</label> <btn class="btn btn-primary fundbutton" id="fund_'+al.address+'">Fund</btn>';
                        } else {
                            r[++j] = 'Not registered';
                        }
                    } 
                    r[++j] = '</td></tr>';
                }
                r[++j] = '</table>';
                if (isOwner() || isAirline()) {
                    document.getElementById('airlines-wrapper').innerHTML = r.join('');
                    for (const regbutton of document.getElementsByClassName('regbutton')) {
                        regbutton.addEventListener('click', (event) => {
                            let address = event.target.id.substr(4);
                            //console.log('Register ' + address);
                            contract.registerAirline(address, (error, result) => {
                                if (error) {
                                    alertUser(error);
                                }
                                //console.log(result);
                                contract.getVotersCount((result) => {
                                    console.log('Voters count: ' + result);
                                });
                                refreshAirlines();
                            });
                            
                        });
                    }
                    for (const fundbutton of document.getElementsByClassName('fundbutton')) {
                        fundbutton.addEventListener('click', (event) => {
                            let address = event.target.id.substr(5);
                            let ehterValue = document.getElementById('fundval_' + address).value;
                            let value = Web3.utils.toWei(ehterValue, 'ether');
                            //console.log('Fund ' + address + ' ' + ehterValue + ' ether');
                            if (confirm('You are about to fund ' + shortenAddress(address) + ' by ' + ehterValue + ' ether')) {
                                contract.fund(address, value, (error, result) => {
                                    if (error) {
                                        alertUser(error);
                                    } else {
                                        alert('Airline funded');
                                    }
                                    //console.log(result);
                                    refreshAirlines();
                                    /*
                                    contract.viewAirlineBalance(address, (result) => {
                                        console.log('Balance of ' + address + ' is ' + result);
                                    });
                                    */
                                });
                            }
                        });
                    }
                } else {
                    document.getElementById('airlines-wrapper').innerHTML = '';
                }
            }
    );
}

function enrichFlightRegistered(flight) {
    return new Promise((resolve, reject) => {
        contract.isFlightRegistered(flight.airlineAddress, flight.flightCode, flight.time, function(error, response) {
            if (error) reject(error);
            resolve(response);
        })
    });
}

function enrichFlightsRegistered(flights) {
    let promises = flights.map(function(fl) {
        fl.airlineAddress = eAir[fl.airline].address;
        return enrichFlightRegistered(fl).then((result) => {
            //console.log('enrichFlightsRegistered ' + fl.flightCode + ' ' + result);
            fl.isRegistered = result;
            return fl;
        })
    });
    return Promise.all(promises);
}

function enrichFlightInsured(flight) {
    return new Promise((resolve, reject) => {
        contract.hasInsurance(flight.airlineAddress, flight.flightCode, flight.time, function(error, response) {
            if (error) reject(error);
            resolve(response);
        })
    });
}

function enrichFlightsInsured(flights) {
    let promises = flights.map(function(fl) {
        return enrichFlightInsured(fl).then((result) => {
            //console.log('enrichFlightInsured ' + fl.flightCode + ' ' + result);
            fl.isInsured = result;
            return fl;
        })
    });
    return Promise.all(promises);
}

function enrichFlightStatus(flight) {
    return new Promise((resolve, reject) => {
        contract.getFlightStatus(flight.airlineAddress, flight.flightCode, flight.time, function(error, response) {
            if (error) reject(error);
            resolve(response);
        })
    });
}

function enrichFlightsStatus(flights) {
    let promises = flights.map(function(fl) {
        return enrichFlightStatus(fl).then((result) => {
            //console.log('enrichFlightsStatus ' + fl.flightCode + ' ' + result);
            fl.status = parseInt(result);
            return fl;
        })
    });
    return Promise.all(promises);
}

function enrichFlightKey(flight) {
    return new Promise((resolve, reject) => {
        contract.calcFlightKey(flight.airlineAddress, flight.flightCode, flight.time, function(response) {
            resolve(response);
        })
    });
}

function enrichFlightsKey(flights) {
    let promises = flights.map(function(fl) {
        return enrichFlightKey(fl).then((result) => {
            fl.key = result;
            return fl;
        })
    });
    return Promise.all(promises);
}

/*
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;*/
function statusToText(status) {
    switch(status) {
        case 1:
            return "Registered";
        case 10:
            return "On time";
        case 20:
            return "Late - airline";
        case 30:
            return "Late - weather";
        case 40:
            return "Late - technical";
        case 50:
            return "Late - other";
    }
    return "Unknown";
}

function generateFlightRow(fl) {
    var r = new Array(), j = -1;
    if (fl.isRegistered || isAirline()) {
        r[++j] ='<tr><td>';
        r[++j] = fl.airlineName;
        r[++j] = '</td><td>';
        r[++j] = fl.description;
        r[++j] = '</td><td>';
        r[++j] = fl.flightCode;
        r[++j] = '</td><td>';
        let date =  new Date(fl.time); //fl.time;
        r[++j] = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        r[++j] = '</td><td>';
        if (fl.isRegistered) {
            r[++j] = 'Registered';
        } else {
            r[++j] = '<btn class="btn btn-primary regflightbutton" id="regfl_'+fl.key+'">Register</btn>';
        } 
        r[++j] = '</td><td>';
        if (fl.isRegistered && fl.status < 10) {
            r[++j] = '<input class="buyvalue" id="buyval_'+fl.key+'"><label for="buyval_'+fl.key+'">ether</label> <btn class="btn btn-primary buybutton" id="buy_'+fl.key+'">Buy</btn>';
        } else {
            if (fl.isInsured) {
                if (fl.status == 20) {
                    r[++j] = '<btn class="btn btn-primary claimbutton" id="regfl_'+fl.key+'">Claim</btn>';
                } else {
                    r[++j] = 'Insured';
                }
            } else {
                r[++j] = 'Not available';
            }
        }
        r[++j] = '</td><td>';
        if (fl.isInsured) {
            if (fl.status < 10) {
                r[++j] = '<btn class="btn btn-primary fetchbutton" id="fetch_'+fl.key+'">Fetch</btn>';
            } else {
                r[++j] = statusToText(fl.status);
            }
        } else {
            if (fl.status > 1) {
                r[++j] = statusToText(fl.status);
            } else {
                r[++j] = ' ';
            }
        }
        r[++j] = '</td></tr>';
    }
    return r.join('');
}

function addFlightEvents() {
    for (const regflbutton of document.getElementsByClassName('regflightbutton')) {
        regflbutton.addEventListener('click', (event) => {
            let key = event.target.id.substr(6);
            console.log('Register flight ' + key);
            let flight = eFly[key];
            console.log('registerFlight ' + JSON.stringify(flight));
            contract.registerFlight(flight.airlineAddress, flight.flightCode, flight.time, (error, result) => {
                if (error) {
                    alertUser(error);
                }
                console.log(result);
                refresh();
            });
            
        });
    }
    for (const buybutton of document.getElementsByClassName('buybutton')) {
        buybutton.addEventListener('click', (event) => {
            let key = event.target.id.substr(4);
            console.log('Assure flight ' + key);
            let flight = eFly[key];
            let ehterValue = document.getElementById('buyval_' + key).value;
            let value = Web3.utils.toWei(ehterValue, 'ether');
            if (confirm('You are about to buy insurance to flight ' + flight.flightCode + ' for ' + ehterValue + ' ether')) {
                contract.buy(flight.airlineAddress, flight.flightCode, flight.time, value, (error, result) => {
                    if (error) {
                        alertUser(error);
                    } else {
                        alert('Insurance done');
                        console.log(result);
                    }
                    refresh();
                });
            }
        });
    }
    for (const fetchbutton of document.getElementsByClassName('fetchbutton')) {
        fetchbutton.addEventListener('click', (event) => {
            let key = event.target.id.substr(6);
            let flight = eFly[key];
            contract.fetchFlightStatus(flight.airlineAddress, flight.flightCode, flight.time, (error, result) => {
                if (error) {
                    alertUser(error);
                }
                console.log(result);
                refresh();
            });
            
        });
    }
    for (const claimbutton of document.getElementsByClassName('claimbutton')) {
        claimbutton.addEventListener('click', (event) => {
            let key = event.target.id.substr(6);
            let flight = eFly[key];
            contract.claim(flight.airlineAddress, flight.flightCode, flight.time, (error, result) => {
                if (error) {
                    alertUser(error);
                } else {
                    alert('You are eligible for ' + result + ' ether');
                }
                console.log(result);
                refresh();
            });
            
        });
    }

    let payoutbutton = document.getElementById('payoutbutton');
    if (payoutbutton) {
        payoutbutton.addEventListener('click', (event) => {
            contract.payout((error, result) => {
                if (error) {
                    alertUser(error);
                } else {
                    alert('Payout done');
                }
                console.log(result);
                refresh();
            });
            
        });
    }

    /*
    contract.fetchFlightStatus(flight, (error, result) => {
        display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
    });
    */
}

async function refreshFlights() {
    await fetch('http://localhost:3000/flights')
        .then((response) => response.json())
        .then((flights) => enrichFlightsRegistered(flights))
        .then((flights) => enrichFlightsInsured(flights))
        .then((flights) => enrichFlightsStatus(flights))
        .then((flights) => enrichFlightsKey(flights))
        .then((eFlights) => {
                var r = new Array(), j = -1;
                r[++j] = '<table><tr class="row-title">';
                r[++j] = '<td>Airline</td><td>Flight</td><td>Code</td><td>Time</td><td>Registration</td><td>Insurance</td><td>Status</td></tr>';
                let flightSum = 0;
                for (var i=0; i<eFlights.length; i++) {
                    let fl = eFlights[i];
                    if (fl.isRegistered) flightSum++;
                    eFly[fl.key] = fl;
                    fl.isAirlineRegistered = false;
                    fl.isAirlineFunded = false;
                    if (fl.airline in eAir) {
                        fl.isAirlineRegistered = eAir[fl.airline].isRegistered;
                        fl.isAirlineFunded = eAir[fl.airline].isFunded;
                        fl.airlineName = eAir[fl.airline].name;
                    }
                    r[++j] = generateFlightRow(fl);
                }
                if (flightSum == 0) {
                    r[++j] = '<tr><td colspan="7">No flights registered yet..</td></tr>';
                }
                r[++j] = '</table>';
                document.getElementById('flights-wrapper').innerHTML = r.join('');
                addFlightEvents();
            }
        );
}

function refreshOperation() {
    contract.isOperational((error, result) => {
        if (error) {
            document.getElementById('operation-wrapper').innerHTML = 'Unable to retrive contract status<br>';
        } else {
            let mode;
            let operWrapper = '';
            let modeTxt;
            if (result) {
                operWrapper = 'Contract is operational. ';
                mode = false;
                modeTxt = 'Disable';
            } else {
                operWrapper = 'Contract is disabled. ';
                mode = true;
                modeTxt = 'Enable';
            }
            if (isOwner()) {
                operWrapper += '<btn class="btn btn-primary" id="operation_button">' + modeTxt + '</btn><br>';
            }
            document.getElementById('operation-wrapper').innerHTML = operWrapper;
            if (document.getElementById('operation_button')) {
                document.getElementById('operation_button').addEventListener('click', (event) => {
                    contract.setOperatingStatus(mode, (error, result) => {
                        if (error) {
                            alertUser(error);
                        }
                        console.log(result);
                        refresh();
                    });
                });
            }
        }
    });
}

function refreshBalance() {
    contract.getCredit((result) => {
        let balance = parseFloat(result);
        let balanceText = '';
        if (balance > 0) {
            balanceText += 'You are eligible for <b>' + result + '</b> ether';
            balanceText += ' <btn class="btn btn-primary" id="payoutbutton">Payout</btn>';
        }
        document.getElementById('balance-wrapper').innerHTML = balanceText;
    });
}

function refresh() {
    role = PASS;
    if (contract.airlines.includes(contract.owner.toLowerCase())) role = AIR;
    if (contract.owner.toLowerCase() === contract.contractOwner.toLowerCase()) role = OWN;
    document.getElementById('welcome').innerHTML = 'Welcome <span class="field-value">' + role + '</span> (' + shortenAddress(contract.owner.toLowerCase()) + ')';
    refreshOperation();
    refreshBalance();
    refreshAirlines().then(refreshFlights);
}

function isOwner() {
    return(role === OWN);
}

function isAirline() {
    return(role === AIR);
}

function alertUser(error) {
    console.log(JSON.stringify(error));
    var keys = Object.keys(error.data);
    window.alert(error.data[keys[0]].reason);
}


window.ethereum.on('accountsChanged', function (accounts) {
    contract.owner = accounts[0];
    console.log('Account changed to : ' + accounts[0]);
    refresh();
});            


