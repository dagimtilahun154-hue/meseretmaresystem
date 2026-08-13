# Decision Log

- **ADR-001: Curve Extraction Method**
  - *Decision:* Tabular performance specs extracted from PDF tables will be used instead of computer vision graph plotting to avoid Groq model visual limitations.
- **ADR-002: Leaflet z-index fix**
  - *Decision:* Renders modals on top of maps by defining leaflet layer z-index at 10.
