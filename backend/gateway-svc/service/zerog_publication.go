package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/xenodia/myxeno/shared/model"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrZeroGProviderIdentityNotFound = errors.New("zerog_provider_identity_not_found")
var ErrZeroGPublicationNotFound = errors.New("zerog_publication_not_found")

var zeroGWalletPattern = regexp.MustCompile(`^0x[0-9a-fA-F]{40}$`)

type ZeroGProviderIdentityInput struct {
	ProviderKind      string
	DisplayName       string
	WalletAddress     string
	ZeroGDomain       string
	TrustStatus       string
	Status            string
	ProfileStorageURI string
	ProfileHash       string
	Metadata          model.JSONMap
}

type ZeroGCapabilityPublicationInput struct {
	CapabilitySlug     string
	CapabilityVersion  string
	ProviderIdentityID *int64
	ManifestStorageURI string
	ChainTxHash        string
	ChainNetwork       string
	PublishStatus      string
	Metadata           model.JSONMap
}

type zeroGCapabilityManifest struct {
	SchemaVersion string                         `json:"schema_version"`
	Capability    zeroGManifestCapability        `json:"capability"`
	Provider      *zeroGManifestProviderIdentity `json:"provider,omitempty"`
}

type zeroGManifestCapability struct {
	Slug                 string                   `json:"slug"`
	Name                 string                   `json:"name"`
	Version              string                   `json:"version"`
	Type                 string                   `json:"type"`
	Category             string                   `json:"category,omitempty"`
	ProviderName         string                   `json:"provider_name,omitempty"`
	InvokePath           string                   `json:"invoke_path,omitempty"`
	TaskPathTemplate     string                   `json:"task_path_template,omitempty"`
	DefaultOperationSlug string                   `json:"default_operation_slug,omitempty"`
	DefaultInvokeMode    string                   `json:"default_invoke_mode,omitempty"`
	SupportsSync         bool                     `json:"supports_sync"`
	SupportsAsync        bool                     `json:"supports_async"`
	SupportsPolling      bool                     `json:"supports_polling"`
	SupportsWebhook      bool                     `json:"supports_webhook"`
	FundingModes         []string                 `json:"funding_modes,omitempty"`
	Pricing              *CapabilityPricing       `json:"pricing,omitempty"`
	InputFields          []CapabilityInputField   `json:"input_fields,omitempty"`
	OutputHighlights     []string                 `json:"output_highlights,omitempty"`
	TrustSignals         []string                 `json:"trust_signals,omitempty"`
	Operations           []zeroGManifestOperation `json:"operations,omitempty"`
}

type zeroGManifestOperation struct {
	Slug                   string                 `json:"slug"`
	Name                   string                 `json:"name"`
	Method                 string                 `json:"method,omitempty"`
	Path                   string                 `json:"path"`
	UpstreamMethod         string                 `json:"upstream_method,omitempty"`
	UpstreamPath           string                 `json:"upstream_path,omitempty"`
	Summary                string                 `json:"summary,omitempty"`
	ReadOnly               bool                   `json:"read_only,omitempty"`
	FlowStep               int                    `json:"flow_step,omitempty"`
	Pricing                *CapabilityPricing     `json:"pricing,omitempty"`
	InputFields            []CapabilityInputField `json:"input_fields,omitempty"`
	OutputHighlights       []string               `json:"output_highlights,omitempty"`
	TrustSignals           []string               `json:"trust_signals,omitempty"`
	DefaultInvokeMode      string                 `json:"default_invoke_mode,omitempty"`
	IdempotencyKeyRequired bool                   `json:"idempotency_key_required,omitempty"`
	SupportsSync           bool                   `json:"supports_sync"`
	SupportsAsync          bool                   `json:"supports_async"`
	SupportsPolling        bool                   `json:"supports_polling"`
	SupportsWebhook        bool                   `json:"supports_webhook"`
	TaskPathTemplate       string                 `json:"task_path_template,omitempty"`
}

type zeroGManifestProviderIdentity struct {
	ID            int64  `json:"id"`
	ProviderKind  string `json:"provider_kind"`
	DisplayName   string `json:"display_name"`
	WalletAddress string `json:"wallet_address"`
	ZeroGDomain   string `json:"zero_g_domain,omitempty"`
	TrustStatus   string `json:"trust_status"`
}

func (s *GatewayService) ListZeroGProviderIdentities(ctx context.Context) ([]model.ZeroGProviderIdentity, error) {
	var identities []model.ZeroGProviderIdentity
	if err := s.db.WithContext(ctx).Order("display_name ASC, id ASC").Find(&identities).Error; err != nil {
		return nil, err
	}
	return identities, nil
}

func (s *GatewayService) GetZeroGProviderIdentity(ctx context.Context, id int64) (*model.ZeroGProviderIdentity, error) {
	var identity model.ZeroGProviderIdentity
	if err := s.db.WithContext(ctx).First(&identity, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrZeroGProviderIdentityNotFound
		}
		return nil, err
	}
	return &identity, nil
}

func (s *GatewayService) CreateZeroGProviderIdentity(ctx context.Context, input ZeroGProviderIdentityInput) (*model.ZeroGProviderIdentity, error) {
	identity, err := buildZeroGProviderIdentity(input)
	if err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Create(identity).Error; err != nil {
		return nil, err
	}
	return identity, nil
}

func (s *GatewayService) UpdateZeroGProviderIdentity(ctx context.Context, id int64, input ZeroGProviderIdentityInput) (*model.ZeroGProviderIdentity, error) {
	identity, err := s.GetZeroGProviderIdentity(ctx, id)
	if err != nil {
		return nil, err
	}
	updated, err := buildZeroGProviderIdentity(input)
	if err != nil {
		return nil, err
	}
	identity.ProviderKind = updated.ProviderKind
	identity.DisplayName = updated.DisplayName
	identity.WalletAddress = updated.WalletAddress
	identity.ZeroGDomain = updated.ZeroGDomain
	identity.TrustStatus = updated.TrustStatus
	identity.Status = updated.Status
	identity.ProfileStorageURI = updated.ProfileStorageURI
	identity.ProfileHash = updated.ProfileHash
	identity.MetadataJSON = updated.MetadataJSON
	if err := s.db.WithContext(ctx).Save(identity).Error; err != nil {
		return nil, err
	}
	return identity, nil
}

func (s *GatewayService) ListZeroGCapabilityPublications(ctx context.Context) ([]model.ZeroGCapabilityPublication, error) {
	var publications []model.ZeroGCapabilityPublication
	if err := s.db.WithContext(ctx).
		Preload("ProviderIdentity").
		Order("updated_at DESC, id DESC").
		Find(&publications).Error; err != nil {
		return nil, err
	}
	return publications, nil
}

func (s *GatewayService) PublishZeroGCapabilityVersion(ctx context.Context, input ZeroGCapabilityPublicationInput) (*model.ZeroGCapabilityPublication, error) {
	slug := strings.TrimSpace(input.CapabilitySlug)
	if slug == "" {
		return nil, fmt.Errorf("capability_slug is required")
	}
	descriptor, err := s.GetCapability(ctx, slug)
	if err != nil {
		return nil, err
	}
	version := firstNonEmpty(strings.TrimSpace(input.CapabilityVersion), strings.TrimSpace(descriptor.DefaultVersion))
	if version == "" {
		return nil, fmt.Errorf("capability_version is required")
	}

	var providerIdentity *model.ZeroGProviderIdentity
	if input.ProviderIdentityID != nil {
		providerIdentity, err = s.GetZeroGProviderIdentity(ctx, *input.ProviderIdentityID)
		if err != nil {
			return nil, err
		}
		if !strings.EqualFold(providerIdentity.Status, "active") {
			return nil, fmt.Errorf("provider identity is not active")
		}
	}

	manifestRaw, manifestHash, err := buildZeroGManifest(*descriptor, version, providerIdentity)
	if err != nil {
		return nil, err
	}
	metadataJSON, err := marshalZeroGJSON(input.Metadata)
	if err != nil {
		return nil, err
	}

	status, err := normalizeZeroGPublicationStatus(input.PublishStatus, input.ManifestStorageURI, input.ChainTxHash)
	if err != nil {
		return nil, err
	}
	chainNetwork := firstNonEmpty(strings.TrimSpace(input.ChainNetwork), "0g-mainnet")
	now := time.Now().UTC()
	var publishedAt *time.Time
	if status == "storage_uploaded" || status == "chain_anchored" {
		publishedAt = &now
	}

	record := model.ZeroGCapabilityPublication{
		CapabilitySlug:     descriptor.Slug,
		CapabilityVersion:  version,
		ProviderIdentityID: input.ProviderIdentityID,
		ManifestHash:       manifestHash,
		ManifestStorageURI: strings.TrimSpace(input.ManifestStorageURI),
		ChainTxHash:        strings.TrimSpace(input.ChainTxHash),
		ChainNetwork:       chainNetwork,
		PublishStatus:      status,
		ManifestJSON:       datatypes.JSON(manifestRaw),
		MetadataJSON:       metadataJSON,
		PublishedAt:        publishedAt,
	}

	if err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "capability_slug"}, {Name: "capability_version"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"provider_identity_id",
			"manifest_hash",
			"manifest_storage_uri",
			"chain_tx_hash",
			"chain_network",
			"publish_status",
			"manifest_json",
			"metadata_json",
			"published_at",
			"updated_at",
		}),
	}).Create(&record).Error; err != nil {
		return nil, err
	}

	var saved model.ZeroGCapabilityPublication
	if err := s.db.WithContext(ctx).
		Preload("ProviderIdentity").
		Where("capability_slug = ? AND capability_version = ?", descriptor.Slug, version).
		First(&saved).Error; err != nil {
		return nil, err
	}
	return &saved, nil
}

func buildZeroGProviderIdentity(input ZeroGProviderIdentityInput) (*model.ZeroGProviderIdentity, error) {
	walletAddress := normalizeZeroGWalletAddress(input.WalletAddress)
	if walletAddress == "" {
		return nil, fmt.Errorf("wallet_address must be a 0x-prefixed EVM address")
	}
	displayName := strings.TrimSpace(input.DisplayName)
	if displayName == "" {
		return nil, fmt.Errorf("display_name is required")
	}
	providerKind, err := normalizeZeroGProviderKind(input.ProviderKind)
	if err != nil {
		return nil, err
	}
	trustStatus, err := normalizeZeroGTrustStatus(input.TrustStatus)
	if err != nil {
		return nil, err
	}
	status, err := normalizeZeroGProviderStatus(input.Status)
	if err != nil {
		return nil, err
	}
	metadataJSON, err := marshalZeroGJSON(input.Metadata)
	if err != nil {
		return nil, err
	}

	return &model.ZeroGProviderIdentity{
		ProviderKind:      providerKind,
		DisplayName:       displayName,
		WalletAddress:     walletAddress,
		ZeroGDomain:       strings.TrimSpace(input.ZeroGDomain),
		TrustStatus:       trustStatus,
		Status:            status,
		ProfileStorageURI: strings.TrimSpace(input.ProfileStorageURI),
		ProfileHash:       strings.TrimSpace(input.ProfileHash),
		MetadataJSON:      metadataJSON,
	}, nil
}

func buildZeroGManifest(descriptor CapabilityDescriptor, version string, provider *model.ZeroGProviderIdentity) ([]byte, string, error) {
	manifest := zeroGCapabilityManifest{
		SchemaVersion: "xenodia.zerog.capability.v1",
		Capability: zeroGManifestCapability{
			Slug:                 descriptor.Slug,
			Name:                 descriptor.Name,
			Version:              version,
			Type:                 descriptor.Type,
			Category:             descriptor.Category,
			ProviderName:         descriptor.ProviderName,
			InvokePath:           descriptor.InvokePath,
			TaskPathTemplate:     descriptor.TaskPathTemplate,
			DefaultOperationSlug: descriptor.DefaultOperationSlug,
			DefaultInvokeMode:    descriptor.DefaultInvokeMode,
			SupportsSync:         descriptor.SupportsSync,
			SupportsAsync:        descriptor.SupportsAsync,
			SupportsPolling:      descriptor.SupportsPolling,
			SupportsWebhook:      descriptor.SupportsWebhook,
			FundingModes:         append([]string(nil), descriptor.FundingModes...),
			Pricing:              cloneCapabilityPricing(descriptor.Pricing),
			InputFields:          append([]CapabilityInputField(nil), descriptor.InputFields...),
			OutputHighlights:     append([]string(nil), descriptor.OutputHighlights...),
			TrustSignals:         append([]string(nil), descriptor.TrustSignals...),
			Operations:           buildZeroGManifestOperations(descriptor.Operations),
		},
	}
	if provider != nil {
		manifest.Provider = &zeroGManifestProviderIdentity{
			ID:            provider.ID,
			ProviderKind:  provider.ProviderKind,
			DisplayName:   provider.DisplayName,
			WalletAddress: provider.WalletAddress,
			ZeroGDomain:   provider.ZeroGDomain,
			TrustStatus:   provider.TrustStatus,
		}
	}

	raw, err := json.Marshal(manifest)
	if err != nil {
		return nil, "", err
	}
	sum := sha256.Sum256(raw)
	return raw, hex.EncodeToString(sum[:]), nil
}

func buildZeroGManifestOperations(operations []CapabilityOperationDescriptor) []zeroGManifestOperation {
	if len(operations) == 0 {
		return nil
	}
	manifestOperations := make([]zeroGManifestOperation, 0, len(operations))
	for _, operation := range operations {
		manifestOperations = append(manifestOperations, zeroGManifestOperation{
			Slug:                   operation.Slug,
			Name:                   operation.Name,
			Method:                 operation.Method,
			Path:                   operation.Path,
			UpstreamMethod:         operation.UpstreamMethod,
			UpstreamPath:           operation.UpstreamPath,
			Summary:                operation.Summary,
			ReadOnly:               operation.ReadOnly,
			FlowStep:               operation.FlowStep,
			Pricing:                cloneCapabilityPricing(operation.Pricing),
			InputFields:            append([]CapabilityInputField(nil), operation.InputFields...),
			OutputHighlights:       append([]string(nil), operation.OutputHighlights...),
			TrustSignals:           append([]string(nil), operation.TrustSignals...),
			DefaultInvokeMode:      operation.DefaultInvokeMode,
			IdempotencyKeyRequired: operation.IdempotencyKeyRequired,
			SupportsSync:           operation.SupportsSync,
			SupportsAsync:          operation.SupportsAsync,
			SupportsPolling:        operation.SupportsPolling,
			SupportsWebhook:        operation.SupportsWebhook,
			TaskPathTemplate:       operation.TaskPathTemplate,
		})
	}
	return manifestOperations
}

func normalizeZeroGWalletAddress(value string) string {
	trimmed := strings.TrimSpace(value)
	if !zeroGWalletPattern.MatchString(trimmed) {
		return ""
	}
	return strings.ToLower(trimmed)
}

func normalizeZeroGProviderKind(value string) (string, error) {
	normalized := firstNonEmpty(strings.TrimSpace(strings.ToLower(value)), "team")
	switch normalized {
	case "agent", "mcp", "api", "team", "app":
		return normalized, nil
	default:
		return "", fmt.Errorf("provider_kind must be one of agent, mcp, api, team, app")
	}
}

func normalizeZeroGTrustStatus(value string) (string, error) {
	normalized := firstNonEmpty(strings.TrimSpace(strings.ToLower(value)), "unverified")
	switch normalized {
	case "unverified", "verified", "preferred", "suspended":
		return normalized, nil
	default:
		return "", fmt.Errorf("trust_status must be one of unverified, verified, preferred, suspended")
	}
}

func normalizeZeroGProviderStatus(value string) (string, error) {
	normalized := firstNonEmpty(strings.TrimSpace(strings.ToLower(value)), "active")
	switch normalized {
	case "active", "disabled":
		return normalized, nil
	default:
		return "", fmt.Errorf("status must be one of active, disabled")
	}
}

func normalizeZeroGPublicationStatus(value, storageURI, chainTxHash string) (string, error) {
	normalized := strings.TrimSpace(strings.ToLower(value))
	if normalized == "" {
		switch {
		case strings.TrimSpace(chainTxHash) != "":
			normalized = "chain_anchored"
		case strings.TrimSpace(storageURI) != "":
			normalized = "storage_uploaded"
		default:
			normalized = "local_ready"
		}
	}
	switch normalized {
	case "local_ready", "storage_uploaded", "chain_anchored", "failed":
		return normalized, nil
	default:
		return "", fmt.Errorf("publish_status must be one of local_ready, storage_uploaded, chain_anchored, failed")
	}
}

func marshalZeroGJSON(value model.JSONMap) (datatypes.JSON, error) {
	if value == nil {
		return datatypes.JSON([]byte("{}")), nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(raw), nil
}
