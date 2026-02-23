from __future__ import annotations
from pydantic import BaseModel, Field


class Price(BaseModel):
    value: str = ""
    currency: str = "USD"


class Image(BaseModel):
    imageUrl: str = ""


class Seller(BaseModel):
    username: str = ""
    feedbackPercentage: str = ""
    feedbackScore: int = 0


class ShippingOption(BaseModel):
    shippingCostType: str = ""
    shippingCost: Price | None = None


class ItemSummary(BaseModel):
    """Represents an item from the Browse API search results."""

    itemId: str = ""
    title: str = ""
    price: Price | None = None
    image: Image | None = None
    itemWebUrl: str = ""
    seller: Seller | None = None
    condition: str = ""
    conditionId: str = ""
    itemLocation: dict | None = None
    shippingOptions: list[ShippingOption] = Field(default_factory=list)
    buyingOptions: list[str] = Field(default_factory=list)
    itemGroupHref: str | None = None
    itemGroupType: str | None = None
    categories: list[dict] = Field(default_factory=list)
    listingMarketplaceId: str = ""

    @property
    def price_value(self) -> float:
        if self.price and self.price.value:
            try:
                return float(self.price.value)
            except ValueError:
                return 0.0
        return 0.0

    @property
    def shipping_cost_value(self) -> float:
        if self.shippingOptions:
            opt = self.shippingOptions[0]
            if opt.shippingCost and opt.shippingCost.value:
                try:
                    return float(opt.shippingCost.value)
                except ValueError:
                    return 0.0
        return 0.0

    @property
    def total_cost(self) -> float:
        return self.price_value + self.shipping_cost_value

    @property
    def image_url(self) -> str:
        return self.image.imageUrl if self.image else ""

    @property
    def seller_name(self) -> str:
        return self.seller.username if self.seller else ""

    @property
    def seller_feedback(self) -> str:
        if self.seller:
            return f"{self.seller.feedbackPercentage}% ({self.seller.feedbackScore})"
        return ""

    def to_dict(self) -> dict:
        return {
            "itemId": self.itemId,
            "title": self.title,
            "price": self.price_value,
            "currency": self.price.currency if self.price else "USD",
            "shippingCost": self.shipping_cost_value,
            "totalCost": self.total_cost,
            "imageUrl": self.image_url,
            "itemUrl": self.itemWebUrl,
            "condition": self.condition,
            "sellerName": self.seller_name,
            "sellerFeedback": self.seller_feedback,
            "sellerFeedbackScore": self.seller.feedbackScore if self.seller else 0,
            "buyingOptions": self.buyingOptions,
            "location": self.itemLocation,
        }


class SearchResponse(BaseModel):
    """Parsed Browse API search response."""

    href: str = ""
    total: int = 0
    next_page: str = Field(default="", alias="next")
    prev_page: str = Field(default="", alias="prev")
    limit: int = 0
    offset: int = 0
    itemSummaries: list[ItemSummary] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class ItemDetail(BaseModel):
    """Full item details from getItem endpoint."""

    itemId: str = ""
    title: str = ""
    price: Price | None = None
    image: Image | None = None
    itemWebUrl: str = ""
    seller: Seller | None = None
    condition: str = ""
    conditionId: str = ""
    description: str = ""
    shortDescription: str = ""
    shippingOptions: list[ShippingOption] = Field(default_factory=list)
    buyingOptions: list[str] = Field(default_factory=list)
    eligibleForInlineCheckout: bool = False
    itemLocation: dict | None = None
    returnTerms: dict | None = None
    quantityLimitPerBuyer: int = 0
    estimatedAvailabilities: list[dict] = Field(default_factory=list)
