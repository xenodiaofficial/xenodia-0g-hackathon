package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/xenodia/myxeno/gateway-svc/service"
	"github.com/xenodia/myxeno/shared/model"
)

type AdminZeroGHandler struct {
	gatewaySvc *service.GatewayService
}

type zeroGProviderIdentityRequest struct {
	ProviderKind      string        `json:"provider_kind"`
	DisplayName       string        `json:"display_name"`
	WalletAddress     string        `json:"wallet_address"`
	ZeroGDomain       string        `json:"zero_g_domain"`
	TrustStatus       string        `json:"trust_status"`
	Status            string        `json:"status"`
	ProfileStorageURI string        `json:"profile_storage_uri"`
	ProfileHash       string        `json:"profile_hash"`
	Metadata          model.JSONMap `json:"metadata"`
}

type zeroGCapabilityPublicationRequest struct {
	CapabilitySlug     string        `json:"capability_slug"`
	CapabilityVersion  string        `json:"capability_version"`
	ProviderIdentityID *int64        `json:"provider_identity_id"`
	ManifestStorageURI string        `json:"manifest_storage_uri"`
	ChainTxHash        string        `json:"chain_tx_hash"`
	ChainNetwork       string        `json:"chain_network"`
	PublishStatus      string        `json:"publish_status"`
	Metadata           model.JSONMap `json:"metadata"`
}

func NewAdminZeroGHandler(gatewaySvc *service.GatewayService) *AdminZeroGHandler {
	return &AdminZeroGHandler{gatewaySvc: gatewaySvc}
}

func (h *AdminZeroGHandler) ListProviderIdentities(c *gin.Context) {
	items, err := h.gatewaySvc.ListZeroGProviderIdentities(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "zerog_provider_identity_list_failed", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"object": "list", "data": items, "count": len(items)})
}

func (h *AdminZeroGHandler) CreateProviderIdentity(c *gin.Context) {
	var req zeroGProviderIdentityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}
	item, err := h.gatewaySvc.CreateZeroGProviderIdentity(c.Request.Context(), service.ZeroGProviderIdentityInput{
		ProviderKind:      req.ProviderKind,
		DisplayName:       req.DisplayName,
		WalletAddress:     req.WalletAddress,
		ZeroGDomain:       req.ZeroGDomain,
		TrustStatus:       req.TrustStatus,
		Status:            req.Status,
		ProfileStorageURI: req.ProfileStorageURI,
		ProfileHash:       req.ProfileHash,
		Metadata:          req.Metadata,
	})
	if err != nil {
		respondZeroGWriteError(c, "zerog_provider_identity_create_failed", err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"object": "zerog_provider_identity", "data": item})
}

func (h *AdminZeroGHandler) GetProviderIdentity(c *gin.Context) {
	id, ok := parseZeroGIDParam(c, "id")
	if !ok {
		return
	}
	item, err := h.gatewaySvc.GetZeroGProviderIdentity(c.Request.Context(), id)
	if err != nil {
		respondZeroGReadError(c, "zerog_provider_identity_lookup_failed", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"object": "zerog_provider_identity", "data": item})
}

func (h *AdminZeroGHandler) UpdateProviderIdentity(c *gin.Context) {
	id, ok := parseZeroGIDParam(c, "id")
	if !ok {
		return
	}
	var req zeroGProviderIdentityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}
	item, err := h.gatewaySvc.UpdateZeroGProviderIdentity(c.Request.Context(), id, service.ZeroGProviderIdentityInput{
		ProviderKind:      req.ProviderKind,
		DisplayName:       req.DisplayName,
		WalletAddress:     req.WalletAddress,
		ZeroGDomain:       req.ZeroGDomain,
		TrustStatus:       req.TrustStatus,
		Status:            req.Status,
		ProfileStorageURI: req.ProfileStorageURI,
		ProfileHash:       req.ProfileHash,
		Metadata:          req.Metadata,
	})
	if err != nil {
		if errors.Is(err, service.ErrZeroGProviderIdentityNotFound) {
			respondZeroGReadError(c, "zerog_provider_identity_lookup_failed", err)
			return
		}
		respondZeroGWriteError(c, "zerog_provider_identity_update_failed", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"object": "zerog_provider_identity", "data": item})
}

func (h *AdminZeroGHandler) ListCapabilityPublications(c *gin.Context) {
	items, err := h.gatewaySvc.ListZeroGCapabilityPublications(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "zerog_capability_publication_list_failed", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"object": "list", "data": items, "count": len(items)})
}

func (h *AdminZeroGHandler) PublishCapability(c *gin.Context) {
	var req zeroGCapabilityPublicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}
	item, err := h.gatewaySvc.PublishZeroGCapabilityVersion(c.Request.Context(), service.ZeroGCapabilityPublicationInput{
		CapabilitySlug:     req.CapabilitySlug,
		CapabilityVersion:  req.CapabilityVersion,
		ProviderIdentityID: req.ProviderIdentityID,
		ManifestStorageURI: req.ManifestStorageURI,
		ChainTxHash:        req.ChainTxHash,
		ChainNetwork:       req.ChainNetwork,
		PublishStatus:      req.PublishStatus,
		Metadata:           req.Metadata,
	})
	if err != nil {
		respondZeroGWriteError(c, "zerog_capability_publication_failed", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"object": "zerog_capability_publication", "data": item})
}

func parseZeroGIDParam(c *gin.Context, name string) (int64, bool) {
	raw := strings.TrimSpace(c.Param(name))
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": "invalid id"})
		return 0, false
	}
	return id, true
}

func respondZeroGReadError(c *gin.Context, code string, err error) {
	if errors.Is(err, service.ErrZeroGProviderIdentityNotFound) || errors.Is(err, service.ErrZeroGPublicationNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "0G resource not found"})
		return
	}
	c.JSON(http.StatusBadGateway, gin.H{"error": code, "message": err.Error()})
}

func respondZeroGWriteError(c *gin.Context, code string, err error) {
	message := strings.TrimSpace(err.Error())
	lower := strings.ToLower(message)
	if strings.Contains(lower, "required") || strings.Contains(lower, "must be") || strings.Contains(lower, "not active") {
		c.JSON(http.StatusBadRequest, gin.H{"error": code, "message": message})
		return
	}
	if errors.Is(err, service.ErrCapabilityNotFound) || errors.Is(err, service.ErrZeroGProviderIdentityNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": message})
		return
	}
	c.JSON(http.StatusBadGateway, gin.H{"error": code, "message": message})
}
