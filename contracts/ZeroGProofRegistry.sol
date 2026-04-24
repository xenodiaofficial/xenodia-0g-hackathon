// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ZeroGProofRegistry
/// @notice Minimal 0G hackathon registry for provider identity, capability publication,
/// receipt batches, and settlement batches.
/// @dev The contract stores hashes and URIs only. Private execution, LLM routing,
/// payment settlement, and raw logs stay off-chain.
contract ZeroGProofRegistry {
    enum ProofKind {
        Unknown,
        CapabilityManifest,
        ReceiptBatch,
        SettlementBatch
    }

    struct ProviderIdentity {
        bytes32 profileHash;
        string profileURI;
        string zeroGDomain;
        uint64 rank;
        bool active;
        uint64 updatedAt;
    }

    struct ProofRecord {
        ProofKind kind;
        address provider;
        bytes32 subjectId;
        bytes32 contentHash;
        string storageURI;
        uint256 itemCount;
        uint64 anchoredAt;
    }

    address public owner;

    mapping(address => ProviderIdentity) public providerIdentities;
    mapping(bytes32 => ProofRecord) public proofRecords;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProviderIdentityUpdated(
        address indexed provider,
        bytes32 indexed profileHash,
        string profileURI,
        string zeroGDomain,
        uint64 rank,
        bool active
    );
    event CapabilityManifestPublished(
        bytes32 indexed proofId,
        address indexed provider,
        bytes32 indexed capabilityId,
        string version,
        bytes32 manifestHash,
        string storageURI
    );
    event ReceiptBatchAnchored(
        bytes32 indexed proofId,
        address indexed provider,
        bytes32 indexed batchId,
        bytes32 receiptRoot,
        string storageURI,
        uint256 receiptCount
    );
    event SettlementBatchAnchored(
        bytes32 indexed proofId,
        address indexed provider,
        bytes32 indexed batchId,
        bytes32 settlementRoot,
        string storageURI,
        uint256 settlementCount
    );

    error NotOwner();
    error ZeroAddress();
    error EmptyHash();
    error ProofAlreadyExists(bytes32 proofId);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function updateProviderIdentity(
        address provider,
        bytes32 profileHash,
        string calldata profileURI,
        string calldata zeroGDomain,
        uint64 rank,
        bool active
    ) external onlyOwner {
        _requireProviderAndHash(provider, profileHash);

        providerIdentities[provider] = ProviderIdentity({
            profileHash: profileHash,
            profileURI: profileURI,
            zeroGDomain: zeroGDomain,
            rank: rank,
            active: active,
            updatedAt: uint64(block.timestamp)
        });

        emit ProviderIdentityUpdated(provider, profileHash, profileURI, zeroGDomain, rank, active);
    }

    function publishCapabilityManifest(
        address provider,
        bytes32 capabilityId,
        string calldata version,
        bytes32 manifestHash,
        string calldata storageURI
    ) external onlyOwner returns (bytes32 proofId) {
        _requireProviderAndHash(provider, manifestHash);
        if (capabilityId == bytes32(0)) revert EmptyHash();

        proofId = keccak256(
            abi.encodePacked("xenodia.0g.capability", provider, capabilityId, version, manifestHash)
        );
        _writeProof(proofId, ProofKind.CapabilityManifest, provider, capabilityId, manifestHash, storageURI, 1);

        emit CapabilityManifestPublished(proofId, provider, capabilityId, version, manifestHash, storageURI);
    }

    function anchorReceiptBatch(
        address provider,
        bytes32 batchId,
        bytes32 receiptRoot,
        string calldata storageURI,
        uint256 receiptCount
    ) external onlyOwner returns (bytes32 proofId) {
        _requireProviderAndHash(provider, receiptRoot);
        if (batchId == bytes32(0)) revert EmptyHash();

        proofId = keccak256(abi.encodePacked("xenodia.0g.receipts", provider, batchId, receiptRoot));
        _writeProof(proofId, ProofKind.ReceiptBatch, provider, batchId, receiptRoot, storageURI, receiptCount);

        emit ReceiptBatchAnchored(proofId, provider, batchId, receiptRoot, storageURI, receiptCount);
    }

    function anchorSettlementBatch(
        address provider,
        bytes32 batchId,
        bytes32 settlementRoot,
        string calldata storageURI,
        uint256 settlementCount
    ) external onlyOwner returns (bytes32 proofId) {
        _requireProviderAndHash(provider, settlementRoot);
        if (batchId == bytes32(0)) revert EmptyHash();

        proofId = keccak256(abi.encodePacked("xenodia.0g.settlements", provider, batchId, settlementRoot));
        _writeProof(
            proofId,
            ProofKind.SettlementBatch,
            provider,
            batchId,
            settlementRoot,
            storageURI,
            settlementCount
        );

        emit SettlementBatchAnchored(proofId, provider, batchId, settlementRoot, storageURI, settlementCount);
    }

    function hasProof(bytes32 proofId) external view returns (bool) {
        return proofRecords[proofId].anchoredAt != 0;
    }

    function _writeProof(
        bytes32 proofId,
        ProofKind kind,
        address provider,
        bytes32 subjectId,
        bytes32 contentHash,
        string calldata storageURI,
        uint256 itemCount
    ) internal {
        if (proofRecords[proofId].anchoredAt != 0) revert ProofAlreadyExists(proofId);

        proofRecords[proofId] = ProofRecord({
            kind: kind,
            provider: provider,
            subjectId: subjectId,
            contentHash: contentHash,
            storageURI: storageURI,
            itemCount: itemCount,
            anchoredAt: uint64(block.timestamp)
        });
    }

    function _requireProviderAndHash(address provider, bytes32 contentHash) internal pure {
        if (provider == address(0)) revert ZeroAddress();
        if (contentHash == bytes32(0)) revert EmptyHash();
    }
}

