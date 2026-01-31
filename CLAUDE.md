# Figurify Development Guidelines

## Commands
- **Run App (Dev)**: `uvicorn app.main:app --reload`
- **Install Dependencies**: `pip install -r requirements.txt`

## Code Style
- **Python**: PEP 8 + Type Hints + Pydantic.
- **Python Formatter**: Isort + Black.
- **API Style**: **Pure RPC Style**. Use **POST** for almost all actions. Use **Verbs** in endpoints.
  - Examples: `/api/v1/uploadImages`, `/api/v1/saveImageEdit`, `/api/v1/generateFigure`.
- **JavaScript**: ES6 Modules + Class-based components.
- **Frontend**: Bootstrap 5 + Fabric.js (Canvas).

## Structure
- `app/api/`: RPC controllers.
- `app/services/`: Core logic.
- `static/js/components/`: Modular UI units.
