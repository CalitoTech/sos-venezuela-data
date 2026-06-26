from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class MissingPerson:
    full_name: str
    source: str
    source_url: str
    scraped_at: datetime = field(default_factory=datetime.utcnow)
    age: Optional[int] = None
    gender: Optional[str] = None
    last_seen_location: Optional[str] = None
    last_seen_date: Optional[str] = None
    description: Optional[str] = None
    contact_info: Optional[str] = None
    photo_url: Optional[str] = None
    status: str = "missing"  # missing | found | deceased


class BaseScraper(ABC):
    def __init__(self, source_name: str, base_url: str):
        self.source_name = source_name
        self.base_url = base_url

    @abstractmethod
    def scrape(self) -> list[MissingPerson]:
        """Fetch and parse records from the source. Returns a list of MissingPerson."""
        ...

    def run(self) -> list[MissingPerson]:
        print(f"[{self.source_name}] Scraping {self.base_url} ...")
        results = self.scrape()
        print(f"[{self.source_name}] {len(results)} records found.")
        return results
