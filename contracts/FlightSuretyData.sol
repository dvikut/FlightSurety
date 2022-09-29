pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;
    using SafeMath for uint8;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint8) private authorizedContracts;
    mapping(address => Airline) private airlines;
    mapping(bytes32 => uint8) private flights;
    mapping(bytes32 => mapping(address => uint256)) private insurances; //flightKey => insuree => premium
    mapping(address => uint256) private credits;
    uint256 private airlineCount;

    struct Airline {
        mapping(address => bool) voters;
        uint256 votes;
        bool isRegistered;
        bool isFunded;
        uint256 balance;
    }

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address airline) public {
        contractOwner = msg.sender;
        airlines[airline] = Airline({votes: 0, isRegistered: true, isFunded: false, balance: 0});
        airlineCount = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    function authorizeContract
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeContract
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    function getContractOwner() external view requireIsCallerAuthorized returns(address) {
        return contractOwner;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(address airline, bool registered)
                            external
                            requireIsOperational
                            requireIsCallerAuthorized
    {
        if (!airlines[airline].isRegistered && registered) {
            airlines[airline].isRegistered = true;
            airlineCount = airlineCount.add(1);
        }
    }

    function voteAirline(address airline, address voter) 
                        external 
                        requireIsOperational
                        requireIsCallerAuthorized
                        returns (uint256)
    {
        require(!airlines[airline].voters[voter], "Already voted");
        airlines[airline].voters[voter] = true;
        airlines[airline].votes = airlines[airline].votes.add(1);
        return airlines[airline].votes;
    }

    function flagAirlineRegistered(address airline) 
                        external
                        requireIsOperational
                        requireIsCallerAuthorized 
    {
        require(!airlines[airline].isRegistered, "Already registered");
        airlines[airline].isRegistered = true;
        airlineCount = airlineCount.add(1);
    }

    function flagAirlineFunded(address airline) 
                        external
                        requireIsOperational
                        requireIsCallerAuthorized 
    {
        require(!airlines[airline].isFunded, "Already funded");
        airlines[airline].isFunded = true;
    }

    function isRegistered(address airline) external view returns(bool) {
        return airlines[airline].isRegistered;
    }

    function isFunded(address airline) external view returns(bool) {
        return airlines[airline].isFunded;
    }

    function getVotersCount() external view returns(uint256) {
        return airlineCount;
    }

    function getAirlineBalance(address airline) requireIsCallerAuthorized external view returns(uint256) {
        return airlines[airline].balance;
    }

    function getFlightStatus(bytes32 key) external view returns(uint8) {
        return flights[key];
    }

    function registerFlight
                        (
                            bytes32 key
                        )
                        external
                        requireIsOperational
                        requireIsCallerAuthorized 
    {
        require(flights[key] == 0, "Flight already registered");
        flights[key] = 1;
    }

    function isFlightRegistered
                        (
                            bytes32 key
                        )
                        external
                        view
                        requireIsOperational
                        requireIsCallerAuthorized 
                        returns(bool)
    {
        return(flights[key] > 0);
    }

    function updateFlight
                        (
                            bytes32 key,
                            uint8 status
                        )
                        external
                        requireIsOperational
                        requireIsCallerAuthorized 
    {
        require(status != 1, "Cannot reinitiate flight");
        require(flights[key] < 10, "Flight status already set");
        flights[key] = status;
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            bytes32 flightKey,
                            address insuree
                            )
                            external
                            payable
                            requireIsOperational
                            requireIsCallerAuthorized
                            returns(uint256)
    {
        insurances[flightKey][insuree] = insurances[flightKey][insuree].add(msg.value);
        return(insurances[flightKey][insuree]);
    }

    function getPaidInsuranceFee   (
                                bytes32 flightKey,
                                address insuree        
                                )
                                external
                                view
                                requireIsOperational
                                requireIsCallerAuthorized
                                returns(uint256)
    {
        return insurances[flightKey][insuree];
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                bytes32 flightKey,
                                address airline,
                                uint256 value,
                                address insuree
                                )
                                external
                                requireIsOperational
                                requireIsCallerAuthorized
    {
        airlines[airline].balance = airlines[airline].balance.sub(value);
        insurances[flightKey][insuree] = 0;
        credits[insuree] = credits[insuree].add(value);
    }

    function getCredit
                        (
                        address insuree
                        )
                        external
                        view
                        requireIsOperational
                        requireIsCallerAuthorized
                        returns(uint256)
    {
        return credits[insuree];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            address insuree
                            )
                            external
                            requireIsOperational
                            requireIsCallerAuthorized
                            returns(uint256)
    {
        uint256 amount = credits[insuree];
        credits[insuree] = 0;
        insuree.transfer(amount);
        return amount;
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                                address airline
                            )
                            public
                            payable
                            requireIsOperational
                            requireIsCallerAuthorized
                            returns(uint256)
    {
        require(msg.value > 0, "No money sent");
        airlines[airline].balance = airlines[airline].balance.add(msg.value);
        return(airlines[airline].balance);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        public
                        pure
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }


    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
    }


}

