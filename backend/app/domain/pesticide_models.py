"""Pydantic domain models for pesticide dosage extraction and verification."""

from typing import Literal

from pydantic import BaseModel, Field


class EvidenceField(BaseModel):
    """Field backed by explicit citation evidence."""

    value: float | str | None = None
    unit: str | None = None
    evidence_quote: str | None = Field(
        default=None,
        description="Exact sentence from the source text (max ~30 words)",
    )
    source_url: str | None = None
    publisher: str | None = None
    published_or_accessed_date: str | None = None


class ExtractedPesticideAdvisory(BaseModel):
    """Raw extraction schema for Gemini LLM extractor."""

    source_matches_question: bool = Field(
        default=True,
        description="False if the source discusses an unrelated crop, pest, or context",
    )
    product_name: EvidenceField = Field(default_factory=EvidenceField)
    active_ingredient: EvidenceField = Field(default_factory=EvidenceField)
    formulation: EvidenceField = Field(default_factory=EvidenceField)
    target_pest: EvidenceField = Field(default_factory=EvidenceField)
    dose_per_litre: EvidenceField = Field(default_factory=EvidenceField)
    dose_per_acre: EvidenceField = Field(default_factory=EvidenceField)
    water_volume_per_acre: EvidenceField = Field(default_factory=EvidenceField)
    spray_interval: EvidenceField = Field(default_factory=EvidenceField)
    max_sprays: EvidenceField = Field(default_factory=EvidenceField)
    pre_harvest_interval_days: EvidenceField = Field(default_factory=EvidenceField)
    reentry_period_hours: EvidenceField = Field(default_factory=EvidenceField)
    mode_of_action_group: EvidenceField = Field(default_factory=EvidenceField)
    safety_precautions: EvidenceField = Field(default_factory=EvidenceField)
    organic_alternative: EvidenceField = Field(default_factory=EvidenceField)


class SprayRequest(BaseModel):
    """Farmer spray recommendation request."""

    crop: str
    growth_stage: str | None = None
    soil_type: str | None = None
    problem: str
    mode: Literal["chemical", "organic"] = "chemical"
    pump_size_l: float = Field(default=15.0, ge=5.0, le=50.0)
    acres: float = Field(default=1.0, gt=0.0, le=100.0)
    state: str | None = "andhra_pradesh"
    district: str | None = None
    lat: float | None = None
    lng: float | None = None


class SprayPlanCalculation(BaseModel):
    """Pure mathematical spray calculations."""

    chemical_per_tank: str
    total_pumps: int
    total_water_l: float
    total_chemical_qty: str
    estimated_cost: float | None = None
    estimated_cost_text: str | None = None


class SourceCitation(BaseModel):
    """Citation details from an allowlisted domain."""

    publisher: str
    source_url: str
    published_or_accessed_date: str
    evidence_quote: str


class VerifiedRecommendation(BaseModel):
    """Complete verified advisory returned to farmer."""

    product: str
    formulation: str
    trade_name: str | None = None
    active_ingredient: str
    chemical_group: str
    target_pest: str
    dose_per_litre: float | None = None
    dose_per_acre: float | None = None
    dose_unit: str
    water_per_acre_l: float
    spray_interval_days: str | None = None
    max_sprays: int | None = None
    phi_days: int | None = None
    reentry_period_hours: int | None = None
    mode_of_action_group: str
    safety_precautions: str
    organic_alternative: str | None = None
    badge: Literal["Verified (expert-reviewed)", "From official source"] = (
        "Verified (expert-reviewed)"
    )
    evidence_quote: str
    source_url: str
    publisher: str
    published_or_accessed_date: str
    secondary_source_url: str | None = None
    secondary_publisher: str | None = None


class SprayAdvisoryResponse(BaseModel):
    """Final API response: verified recommendation or default abstain."""

    abstain: bool
    abstain_reason: str | None = None
    helpline_number: str = "1800-180-1551"
    sources_found: list[SourceCitation] = Field(default_factory=list)
    recommendation: VerifiedRecommendation | None = None
    spray_plan: SprayPlanCalculation | None = None
    verification_checks_passed: list[str] = Field(default_factory=list)
    verification_failures: list[str] = Field(default_factory=list)
    conflicting_sources: list[dict[str, str]] = Field(default_factory=list)


class PhotoCandidateDiagnosis(BaseModel):
    """Screening candidate from Gemini Vision for farmer confirmation."""

    problem_name: str
    category: Literal["pest", "disease", "deficiency", "weed"]
    confidence: float
    symptoms_observed: str
    what_to_verify: str


class PhotoDiagnosisRequest(BaseModel):
    """Photo upload or base64 data for visual symptom screening."""

    image_base64: str
    crop: str | None = None


class WrongRecommendationReport(BaseModel):
    """Farmer feedback on incorrect or mismatch recommendations."""

    crop: str
    problem: str
    mode: str
    reported_issue: str
    expected_advice: str | None = None
    timestamp: str | None = None
