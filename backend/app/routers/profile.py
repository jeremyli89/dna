from fastapi import APIRouter, Depends
from ..deps import get_current_user
from ..models import User
from ..schemas import UserOut

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
