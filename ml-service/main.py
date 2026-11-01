from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import scoring

app = FastAPI(title="ReliefHub Risk Service")


class Camp(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    capacity: Optional[int] = None
    current_families: Optional[int] = None
    status: Optional[str] = None


class Need(BaseModel):
    id: Optional[str] = None
    camp_id: Optional[str] = None
    inventory_item_id: Optional[str] = None
    required_quantity: Optional[int] = 0
    fulfilled_quantity: Optional[int] = 0
    priority: Optional[str] = None


class Dispatch(BaseModel):
    id: Optional[str] = None
    camp_id: Optional[str] = None
    need_id: Optional[str] = None
    quantity: Optional[int] = 0
    status: Optional[str] = None


class AssessRequest(BaseModel):
    camp: Camp
    needs: List[Need] = []
    inventory: Dict[str, Any] = {}
    dispatches: List[Dispatch] = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/assess")
def assess(req: AssessRequest):
    payload = req.model_dump()
    return scoring.score_camp(payload)


@app.post("/assess-all")
def assess_all(items: List[AssessRequest]):
    return [scoring.score_camp(i.model_dump()) for i in items]
