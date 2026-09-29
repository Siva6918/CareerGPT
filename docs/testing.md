# Testing & Quality Assurance

CareerGPT ensures robust Agentic loop behavior through automated tests and continuous integration.

## 1. Unit & Integration Testing
- Local tests can be run using Pytest.
- Tests rely on SQLite (`careergpt_test.db`) and the `MockLLMProvider` preventing accidental API usage.
- Endpoint validation tests (`tests/`) ensure schemas remain strictly typed.

## 2. End-to-End Simulation
The `backend/tests/demo_end_to_end.py` script provides a full smoke-test of the Agentic AI Mentoring flow:
- Authenticates a test profile.
- Mocks a resume upload.
- Asserts Competency Graph baseline.
- Initiates an Interview and Submits an Answer.
- Asserts dynamic Graph Updates and recalculation of Placement Readiness.

## 3. GitHub Actions CI/CD
On every Pull Request to `main`:
- Checks out code.
- Provisions a Python 3.10 environment.
- Executes `pip install`.
- Validates the backend via simulated test steps.
- Builds the React frontend to catch any Vite bundling or typing errors.
