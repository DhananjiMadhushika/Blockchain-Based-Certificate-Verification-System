// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateRegistry is Ownable {
    
    struct Certificate {
        string ipfsHash;
        string dataHash;
        string recipientName;
        string courseName;
        uint256 issueDate;
        address issuer;
        bool isValid;
    }
    
    mapping(string => Certificate) public certificates;
    mapping(address => bool) public authorizedIssuers;
    
    // Array to store all certificate IDs
    string[] public certificateIds;
    
    event CertificateIssued(
        string indexed certificateId,
        string ipfsHash,
        string recipientName,
        address indexed issuer
    );
    
    event CertificateRevoked(string indexed certificateId);
    event IssuerAuthorized(address indexed issuer);
    
    constructor() Ownable(msg.sender) {
        authorizedIssuers[msg.sender] = true;
    }
    
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not authorized");
        _;
    }
    
    function authorizeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }
    
    function issueCertificate(
        string memory _certificateId,
        string memory _ipfsHash,
        string memory _dataHash,
        string memory _recipientName,
        string memory _courseName
    ) external onlyAuthorizedIssuer {
        require(bytes(certificates[_certificateId].dataHash).length == 0, 
                "Certificate already exists");
        
        certificates[_certificateId] = Certificate({
            ipfsHash: _ipfsHash,
            dataHash: _dataHash,
            recipientName: _recipientName,
            courseName: _courseName,
            issueDate: block.timestamp,
            issuer: msg.sender,
            isValid: true
        });
        
        certificateIds.push(_certificateId);
        
        emit CertificateIssued(_certificateId, _ipfsHash, _recipientName, msg.sender);
    }
    
    function getCertificate(string memory _certificateId) 
        external 
        view 
        returns (
            string memory ipfsHash,
            string memory dataHash,
            string memory recipientName,
            string memory courseName,
            uint256 issueDate,
            address issuer,
            bool isValid
        ) 
    {
        Certificate memory cert = certificates[_certificateId];
        return (
            cert.ipfsHash,
            cert.dataHash,
            cert.recipientName,
            cert.courseName,
            cert.issueDate,
            cert.issuer,
            cert.isValid
        );
    }
    
    function revokeCertificate(string memory _certificateId) 
        external 
        onlyAuthorizedIssuer 
    {
        require(bytes(certificates[_certificateId].dataHash).length > 0, 
                "Certificate does not exist");
        certificates[_certificateId].isValid = false;
        emit CertificateRevoked(_certificateId);
    }
    
    function getTotalCertificates() external view returns (uint256) {
        return certificateIds.length;
    }
    
    function getCertificateIdByIndex(uint256 index) external view returns (string memory) {
        require(index < certificateIds.length, "Index out of bounds");
        return certificateIds[index];
    }
}