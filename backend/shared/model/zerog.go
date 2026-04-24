package model

import (
	"time"

	"gorm.io/datatypes"
)

// ZeroGProviderIdentity represents a public capability supplier identity for
// the 0G hackathon branch. It is intentionally separate from Provider, which
// models upstream LLM routing credentials.
type ZeroGProviderIdentity struct {
	ID                int64          `gorm:"primaryKey;autoIncrement" json:"id"`
	ProviderKind      string         `gorm:"not null;default:'team'" json:"provider_kind"`
	DisplayName       string         `gorm:"not null" json:"display_name"`
	WalletAddress     string         `gorm:"not null;uniqueIndex" json:"wallet_address"`
	ZeroGDomain       string         `gorm:"column:zero_g_domain;not null;default:''" json:"zero_g_domain"`
	TrustStatus       string         `gorm:"not null;default:'unverified'" json:"trust_status"`
	Status            string         `gorm:"not null;default:'active'" json:"status"`
	ProfileStorageURI string         `gorm:"not null;default:''" json:"profile_storage_uri"`
	ProfileHash       string         `gorm:"not null;default:''" json:"profile_hash"`
	MetadataJSON      datatypes.JSON `gorm:"column:metadata_json;type:jsonb;not null;default:'{}'" json:"metadata_json"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

func (ZeroGProviderIdentity) TableName() string { return "zerog_provider_identities" }

// ZeroGCapabilityPublication records the platform-owned publication state for
// one capability version on 0G.
type ZeroGCapabilityPublication struct {
	ID                 int64                  `gorm:"primaryKey;autoIncrement" json:"id"`
	CapabilitySlug     string                 `gorm:"not null;uniqueIndex:idx_zerog_capability_publication_version" json:"capability_slug"`
	CapabilityVersion  string                 `gorm:"not null;uniqueIndex:idx_zerog_capability_publication_version" json:"capability_version"`
	ProviderIdentityID *int64                 `gorm:"index" json:"provider_identity_id,omitempty"`
	ProviderIdentity   *ZeroGProviderIdentity `gorm:"foreignKey:ProviderIdentityID" json:"provider_identity,omitempty"`
	ManifestHash       string                 `gorm:"not null;default:''" json:"manifest_hash"`
	ManifestStorageURI string                 `gorm:"not null;default:''" json:"manifest_storage_uri"`
	ChainTxHash        string                 `gorm:"not null;default:''" json:"chain_tx_hash"`
	ChainNetwork       string                 `gorm:"not null;default:'0g-mainnet'" json:"chain_network"`
	PublishStatus      string                 `gorm:"not null;default:'local_ready'" json:"publish_status"`
	ManifestJSON       datatypes.JSON         `gorm:"column:manifest_json;type:jsonb;not null;default:'{}'" json:"manifest_json"`
	MetadataJSON       datatypes.JSON         `gorm:"column:metadata_json;type:jsonb;not null;default:'{}'" json:"metadata_json"`
	PublishedAt        *time.Time             `json:"published_at,omitempty"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
}

func (ZeroGCapabilityPublication) TableName() string {
	return "zerog_capability_publications"
}
