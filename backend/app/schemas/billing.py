from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class BillItemCreate(BaseModel):
    item_description: str
    unit_price: float
    quantity: int = 1

class BillCreateRequest(BaseModel):
    master_patient_id: int
    encounter_id: Optional[int] = None
    bill_type: str = "OPD_CONSULTATION"  # OPD_CONSULTATION, LABORATORY, PHARMACY, COMPOSITE
    items: List[BillItemCreate]
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    notes: Optional[str] = None

class PaymentProcessRequest(BaseModel):
    bill_id: int
    amount: float
    payment_method: str = "SANDBOX_GATEWAY"  # CASH, UPI, CREDIT_CARD, DEBIT_CARD, SANDBOX_GATEWAY
    notes: Optional[str] = "Sandbox transaction verified"

class BillItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_description: str
    unit_price: float
    quantity: int
    total_price: float

class PaymentTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transaction_ref: str
    bill_id: int
    amount: float
    payment_method: str
    payment_status: str
    receipt_number: str
    is_verified: bool
    notes: Optional[str] = None
    created_at: datetime

class BillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bill_number: str
    master_patient_id: int
    patient_name: Optional[str] = None
    patient_national_id: Optional[str] = None
    encounter_id: Optional[int] = None
    bill_type: str
    total_amount: float
    discount_amount: float
    tax_amount: float
    net_payable: float
    amount_paid: float
    balance_due: float
    status: str
    notes: Optional[str] = None
    created_at: datetime
    items: List[BillItemResponse] = []
    payments: List[PaymentTransactionResponse] = []
