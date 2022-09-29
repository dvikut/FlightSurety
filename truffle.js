//var HDWalletProvider = require("truffle-hdwallet-provider");
//make sure that ganache has enough accounts (50 should be more than enough)
var mnemonic = "very afraid chunk bean sail vanish retreat twice section parent neglect quarter";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 5000000      
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};
