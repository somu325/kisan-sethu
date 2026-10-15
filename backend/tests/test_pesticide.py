"""Unit tests for pesticide dosage extraction, verification layer, and API endpoints."""

from fastapi.testclient import TestClient

from app.domain.pesticide_models import (
    EvidenceField,
    ExtractedPesticideAdvisory,
)
from app.main import app
from app.pesticide.retriever import get_document_retriever
from app.pesticide.verifier import get_pesticide_verifier

client = TestClient(app)


def test_domain_allowlist_filtering() -> None:
    """Retriever must strictly accept trusted agricultural domains and reject all others."""
    retriever = get_document_retriever()

    # Trusted domains
    assert retriever.is_allowlisted_url("https://angrau.ac.in/agri-portal/chilli.html") is True
    assert (
        retriever.is_allowlisted_url("https://agritech.tnau.ac.in/crop_protection/tomato.html")
        is True
    )
    assert retriever.is_allowlisted_url("https://crida.in/crop-protection/rice.html") is True
    assert retriever.is_allowlisted_url("https://cibrc.gov.in/registered_products.pdf") is True
    assert retriever.is_allowlisted_url("https://kvk.icar.gov.in/portal/advisory.aspx") is True

    # Untrusted / Disallowed domains
    assert retriever.is_allowlisted_url("https://agri-blog.com/how-to-kill-thrips") is False
    assert retriever.is_allowlisted_url("https://pesticides-online-shop.in/buy-now") is False
    assert retriever.is_allowlisted_url("https://youtube.com/watch?v=12345") is False
    assert retriever.is_allowlisted_url("https://facebook.com/kisan-tips") is False
    assert retriever.is_allowlisted_url("") is False


def test_verifier_rejects_hallucinated_evidence_quote() -> None:
    """Verifier must reject any result where evidence quote does not literally appear in source."""
    verifier = get_pesticide_verifier()
    source_text = "Spray Thiamethoxam 25% WG at 0.33 g per litre of water for chilli thrips."

    # Fabricated quote
    ok, _ = verifier.check_a_evidence_quote_literal(
        quote="Apply 5.0 grams of magic chemical per pump",
        source_text=source_text,
        claimed_value=5.0,
    )
    assert ok is False

    # True literal quote
    ok, _ = verifier.check_a_evidence_quote_literal(
        quote="Spray Thiamethoxam 25% WG at 0.33 g per litre of water",
        source_text=source_text,
        claimed_value=0.33,
    )
    assert ok is True


def test_verifier_rejects_banned_and_unregistered_pesticides() -> None:
    """Verifier must block banned pesticides (Endosulfan) and unregistered chemicals."""
    verifier = get_pesticide_verifier()

    # Banned pesticide
    ok_banned, msg_banned, _ = verifier.check_c_registration_and_bans(
        "endosulfan", "tomato", "fruit borer"
    )
    assert ok_banned is False
    assert "BANNED" in msg_banned

    # Unregistered chemical for crop
    ok_unreg, _, _ = verifier.check_c_registration_and_bans(
        "unregistered_mystery_chemical", "tomato", "fruit borer"
    )
    assert ok_unreg is False

    # Valid CIB&RC registered chemical
    ok_reg, _, prod = verifier.check_c_registration_and_bans("thiamethoxam", "chilli", "thrips")
    assert ok_reg is True
    assert prod is not None
    assert prod.get("active_ingredient") == "thiamethoxam"


def test_verifier_rejects_insane_dosages() -> None:
    """Verifier must reject extreme dosages outside sane agronomic limits."""
    verifier = get_pesticide_verifier()

    # Sane range for Thiamethoxam 25% WG is 0.2 - 0.5 g/L
    ok_sane, _ = verifier.check_d_sane_dose_range("thiamethoxam", "25% WG", 0.33, 50.0)
    assert ok_sane is True

    # Dangerous 100x overdose hallucination (50 g/L)
    ok_overdose, _ = verifier.check_d_sane_dose_range("thiamethoxam", "25% WG", 50.0, 5000.0)
    assert ok_overdose is False


def test_verifier_rejects_invalid_units() -> None:
    """Verifier must reject vague or informal units."""
    verifier = get_pesticide_verifier()

    assert verifier.check_b_units_validity("g")[0] is True
    assert verifier.check_b_units_validity("ml")[0] is True
    assert verifier.check_b_units_validity("kg")[0] is True
    assert verifier.check_b_units_validity("litres")[0] is True

    assert verifier.check_b_units_validity("spoons")[0] is False
    assert verifier.check_b_units_validity("bottles")[0] is False
    assert verifier.check_b_units_validity(None)[0] is False


def test_full_verifier_pipeline_success() -> None:
    """A grounded, verified extraction passes all checks."""
    verifier = get_pesticide_verifier()
    source_text = (
        "ANGRAU Crop Protection Guide:\n"
        "For control of chilli thrips, spray Thiamethoxam 25% WG at the rate of "
        "0.33 g per litre of water (50 g per acre in 150 litres of water)."
    )

    advisory = ExtractedPesticideAdvisory(
        source_matches_question=True,
        product_name=EvidenceField(value="Actara", evidence_quote=source_text),
        active_ingredient=EvidenceField(value="thiamethoxam", evidence_quote=source_text),
        formulation=EvidenceField(value="25% WG", evidence_quote=source_text),
        target_pest=EvidenceField(value="thrips", evidence_quote=source_text),
        dose_per_litre=EvidenceField(
            value=0.33,
            unit="g",
            evidence_quote="spray Thiamethoxam 25% WG at the rate of 0.33 g per litre of water",
            source_url="https://angrau.ac.in/chilli.html",
            publisher="ANGRAU",
            published_or_accessed_date="2024-05-01",
        ),
        dose_per_acre=EvidenceField(value=50.0, unit="g"),
        water_volume_per_acre=EvidenceField(value=150.0),
    )

    sources = [
        {
            "source_url": "https://angrau.ac.in/chilli.html",
            "text": source_text,
            "publisher": "ANGRAU",
        }
    ]
    res = verifier.verify(advisory, sources, crop="chilli", problem="thrips", mode="chemical")
    assert res.is_valid is True
    assert res.verified_rec is not None
    assert res.verified_rec.dose_per_litre == 0.33
    assert res.verified_rec.active_ingredient == "thiamethoxam"


def test_api_recommend_endpoint_known_good() -> None:
    """API endpoint returns a verified spray plan for known crop/pest pair."""
    response = client.post(
        "/v1/pesticide/recommend",
        json={
            "crop": "chilli",
            "problem": "thrips",
            "mode": "chemical",
            "pump_size_l": 15.0,
            "acres": 1.0,
            "state": "andhra_pradesh",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["abstain"] is False
    assert data["recommendation"] is not None
    assert data["recommendation"]["dose_per_litre"] == 0.33
    assert data["spray_plan"] is not None
    assert data["spray_plan"]["total_pumps"] == 10  # 150L / 15L = 10 pumps
    assert "g" in data["spray_plan"]["chemical_per_tank"]


def test_api_recommend_endpoint_abstains_on_unknown_problem() -> None:
    """API endpoint must abstain when no verified official record exists."""
    response = client.post(
        "/v1/pesticide/recommend",
        json={
            "crop": "banana",
            "problem": "laser_fungus_fake_pest",
            "mode": "chemical",
            "pump_size_l": 15.0,
            "acres": 1.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["abstain"] is True
    assert data["helpline_number"] == "1800-180-1551"
    assert "No allowlisted source document" in data["verification_failures"][0]


def test_api_diagnose_photo_endpoint() -> None:
    """Photo diagnosis endpoint returns top 3 candidate issues without dosage."""
    response = client.post(
        "/v1/pesticide/diagnose-photo",
        json={
            "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            "crop": "chilli",
        },
    )
    assert response.status_code == 200
    candidates = response.json()
    assert len(candidates) == 3
    for cand in candidates:
        assert "problem_name" in cand
        assert "confidence" in cand
        assert 0.0 <= cand["confidence"] <= 1.0
        assert "symptoms_observed" in cand
        assert "what_to_verify" in cand


def test_api_crops_and_problems_endpoint() -> None:
    """Endpoint returns Indian crops and their diseases/pests."""
    response = client.get("/v1/pesticide/crops-and-problems")
    assert response.status_code == 200
    data = response.json()
    assert "crops" in data
    crops = data["crops"]
    assert len(crops) >= 8
    crop_ids = [c["id"] for c in crops]
    assert "chilli" in crop_ids
    assert "paddy" in crop_ids
    assert "cotton" in crop_ids
    assert "tomato" in crop_ids
