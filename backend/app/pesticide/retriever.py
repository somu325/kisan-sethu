"""Retrieval module for official agricultural documents with strict domain allowlisting."""

import json
import logging
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"


class DocumentRetriever:
    """Retrieves source documents exclusively from allowlisted agricultural domains."""

    def __init__(self) -> None:
        self.allowed_domains: set[str] = self._load_allowlist()
        self.verified_store: dict[str, dict[str, Any]] = self._load_verified_store()
        self.registered_products: list[dict[str, Any]] = self._load_registered_products()
        self.banned_products: set[str] = self._load_banned_products()

    def _load_allowlist(self) -> set[str]:
        path = DATA_DIR / "trusted_domains.json"
        if not path.exists():
            return {"icar.gov.in", "angrau.ac.in", "pjtsau.edu.in", "tnau.ac.in", "cibrc.gov.in"}
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            return set(data.get("allowed_domains", []))

    def _load_verified_store(self) -> dict[str, dict[str, Any]]:
        path = DATA_DIR / "verified_recommendations.json"
        if not path.exists():
            return {}
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            recs = data.get("recommendations", [])
            return {cast(str, r.get("key", "")): r for r in recs if "key" in r}

    def _load_registered_products(self) -> list[dict[str, Any]]:
        path = DATA_DIR / "registered_products.json"
        if not path.exists():
            return []
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            return cast(list[dict[str, Any]], data.get("products", []))

    def _load_banned_products(self) -> set[str]:
        path = DATA_DIR / "banned_products.json"
        if not path.exists():
            return {"endosulfan", "monocrotophos"}
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            return set(data.get("banned_active_ingredients", []))

    def is_allowlisted_url(self, url: str) -> bool:
        """Reject any URL whose domain or parent domain is not in the allowlist."""
        if not url:
            return False
        try:
            parsed = urlparse(url)
            host = parsed.netloc.lower()
            if not host:
                return False
            host = host.split(":")[0]

            for allowed in self.allowed_domains:
                if host == allowed or host.endswith(f".{allowed}"):
                    return True
            return False
        except Exception:
            return False

    def lookup_verified_store(
        self,
        crop: str,
        problem: str,
        mode: str,
        state: str | None = None,
    ) -> dict[str, Any] | None:
        """Step 0: Look up verified recommendations store for exact matches."""
        c = crop.lower().strip()
        p = problem.lower().strip()
        m = mode.lower().strip()
        st = (state or "andhra_pradesh").lower().strip()

        key = f"{c}:{p}:{m}:{st}"
        if key in self.verified_store:
            return self.verified_store[key]

        # Try without state
        for stored_key, rec in self.verified_store.items():
            parts = stored_key.split(":")
            if len(parts) >= 3 and parts[0] == c and parts[1] == p and parts[2] == m:
                return rec

        return None

    def retrieve_allowlisted_sources(
        self,
        crop: str,
        problem: str,
        mode: str,
        state: str | None = None,
    ) -> list[dict[str, Any]]:
        """Step 1: Retrieve matching document snippets only from allowlisted domains."""
        verified = self.lookup_verified_store(crop, problem, mode, state)
        sources: list[dict[str, Any]] = []

        if verified:
            url = cast(str, verified.get("source_url", ""))
            if self.is_allowlisted_url(url):
                pub = cast(str, verified.get("publisher", "Official Agriculture Department"))
                dt = cast(str, verified.get("published_or_accessed_date", "2024-01-01"))
                quote = cast(str, verified.get("evidence_quote", ""))
                ai = cast(str, verified.get("active_ingredient", ""))
                form = cast(str, verified.get("formulation", ""))
                pest = cast(str, verified.get("target_pest", problem))
                safe = cast(str, verified.get("safety_precautions", ""))
                org = cast(str, verified.get("organic_alternative", ""))
                sources.append(
                    {
                        "source_url": url,
                        "publisher": pub,
                        "published_or_accessed_date": dt,
                        "text": (
                            f"Official Crop Protection Guide for {crop.title()}.\n"
                            f"{quote}\n"
                            f"Active Ingredient: {ai} {form}.\n"
                            f"Target: {pest}.\n"
                            f"Safety: {safe}.\n"
                            f"Organic alternative: {org}."
                        ),
                        "evidence_quote": quote,
                    }
                )

        return sources


_retriever: DocumentRetriever | None = None


def get_document_retriever() -> DocumentRetriever:
    """Singleton getter for document retriever."""
    global _retriever
    if _retriever is None:
        _retriever = DocumentRetriever()
    return _retriever
