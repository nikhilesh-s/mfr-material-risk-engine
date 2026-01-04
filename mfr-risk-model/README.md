# material fire risk (mfr) — phase 1

this repository contains the phase 1 engineering prototype for a material fire risk estimation system.

the goal of phase 1 is to demonstrate that an end-to-end machine learning pipeline can ingest real experimental fire testing data, process it into structured features, and produce interpretable fire risk estimates through a modular and reproducible architecture.

this phase focuses on technical viability and correctness, not on final validation or deployment.

---

## what this system does

given material fire testing properties, the system outputs:
- a numerical fire risk score (0–100)
- a categorical risk class (low / medium / high)
- a resistance index (inverse of risk score)
- a short natural-language interpretation of the result

these outputs are designed to be interpretable and ui-ready, enabling early-stage comparison between materials under similar fire exposure conditions.

---

## phase 1 scope

phase 1 establishes the core engineering foundation of the system.

it includes:
- ingestion and validation of a real experimental fire properties dataset (718 materials)
- a structured data cleaning and feature engineering pipeline
- implementation of a proxy fire risk score derived from physically motivated fire properties
- training and evaluation of an ml model on the cleaned real dataset
- unified training and inference logic implemented in reusable source modules
- a notebook that runs end-to-end on real data with no synthetic execution
- a runnable ui scaffold that consumes ui-ready inference outputs
- verified separation between the ml pipeline and the ui layer

phase 1 demonstrates that the system works end-to-end and produces stable, interpretable outputs from real data.

---

## important limitations (phase 1)

the phase 1 system intentionally makes conservative claims.

specifically:
- the fire risk score is a proxy metric, not a definitive measure of real-world fire safety
- model outputs reflect relative risk under lab-scale experimental conditions
- the system does not model full-scale fires, building assemblies, or regulatory compliance
- ui integration is scaffold-level and not yet connected to a live backend

these limitations are explicit and will be addressed in phase 2.

---

## phase 2 preview

phase 2 will focus on validation, interpretability, and usability.

planned phase 2 work includes:
- validating and refining the proxy fire risk score
- improving interpretability through feature analysis and visual explanations
- stratifying model behavior across material classes (polymers, composites, etc.)
- integrating the ui with the live model via a lightweight api
- documenting assumptions, limitations, and intended use cases more formally

phase 2 shifts the project from a functional prototype to a credible analytical and decision-support tool.

---

## repository structure

- `data/` — raw and processed datasets
- `src/` — data cleaning, modeling, and inference logic
- `notebooks/` — end-to-end execution and analysis
- `ui/` — phase 1 ui scaffold

---

## status

current status: **phase 1 complete**

next milestone: **phase 2 — validation and integration**

---

## Phase 2 — Validation, Interpretability, and Live Integration

Phase 2 builds on the Phase 1 engineering foundation by focusing on scientific credibility, interpretability, and practical usability.

While Phase 1 demonstrated that an end-to-end material fire risk estimation pipeline could exist and run reliably on real experimental data, Phase 2 evaluates whether the system’s outputs are meaningful, stable, and appropriate for early-stage material comparison.

### Phase 2 Objectives

The primary goals of Phase 2 were to:
- validate the proxy fire risk score introduced in Phase 1
- understand which physical properties most strongly drive model predictions
- assess model behavior across different material classes
- integrate the trained model into a live, user-facing interface

### What Was Completed

**1. Proxy Risk Score Validation**
- Performed exploratory data analysis (EDA) to evaluate correlations between the proxy risk score and measurable fire behavior indicators.
- Verified strong alignment with expected physical relationships:
  - strong positive correlation with heat flux
  - moderate negative correlation with time to ignition
- Compared alternative proxy formulations (PCA-based, regression-based) and justified retaining the Phase 1 weighted proxy based on interpretability and stability.

**2. Material-Class Analysis**
- Stratified model performance across polymers, composites, and generic materials.
- Identified higher variance in polymer predictions and documented appropriate caution for interpretation.
- Confirmed stable behavior for composites and generic materials.

**3. Model Interpretability**
- Generated global feature importance rankings, confirming heat flux and surface area as dominant drivers.
- Produced local, per-material explanations to support user-facing interpretations.
- Translated technical explanations into UI-readable language.

**4. Live API Integration**
- Implemented a lightweight FastAPI backend to serve predictions.
- Ensured the model is trained once at startup and reused for inference.
- Preserved all Phase 1 modeling logic without modification.

**5. UI → API → Model Integration**
- Connected the UI to the live prediction API.
- Verified dynamic predictions change meaningfully with different inputs.
- Added loading and error states without redesigning UI components.

### Phase 2 Outcome

Phase 2 demonstrates that the system is not only functional, but also interpretable, scientifically grounded, and usable in real time. The project now operates as a credible decision-support tool for early-stage material fire risk comparison, with clearly documented assumptions and limitations.

The system does not claim to provide definitive regulatory fire ratings; instead, it is intended to support comparative analysis and informed material selection under specified exposure conditions.
