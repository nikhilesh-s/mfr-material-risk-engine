# Phase 2 Analysis Artifacts

This folder contains the standardized Phase 2 figures and tables generated from the existing dataset, proxy risk score, and trained model behavior. Each artifact is derived-only output and does not modify any Phase 1 or Phase 2 logic.

## EDA

- `eda/fig_2_1_correlation_matrix.png`
  - Question: How does the proxy risk score correlate with numeric fire properties?
  - Takeaway: Risk aligns strongly with heat flux and inversely with ignition time, consistent with the proxy definition.

- `eda/fig_2_2_pairwise_scatter.png`
  - Question: How does risk vary against heat flux and time to ignition at the sample level?
  - Takeaway: Risk increases with higher heat flux and decreases with longer ignition times.

## Proxy Validation

- `proxy_validation/fig_2_3_proxy_comparison_table.csv`
  - Question: How do Phase 1, PCA, and regression proxies correlate with ignition indicators?
  - Takeaway: The Phase 1 weighted proxy and regression proxy align more strongly with heat flux and time-to-ignition than PCA.

- `proxy_validation/fig_2_4_proxy_stability_by_material.png`
  - Question: How stable are proxy scores across material classes?
  - Takeaway: Proxy variance differs by class, with polymers showing higher spread than composites and generics.

## Interpretability

- `interpretability/fig_2_5_global_feature_importance.png`
  - Question: Which features drive model predictions overall?
  - Takeaway: Heat flux, ignition timing, and surface-related properties dominate feature importance.

- `interpretability/fig_2_6_local_explanation_polymer.png`
  - Question: Which features most influence a representative polymer prediction?
  - Takeaway: The polymer example is driven by exposure intensity and ignition timing inputs.

- `interpretability/fig_2_7_local_explanation_composite.png`
  - Question: Which features most influence a representative composite prediction?
  - Takeaway: Composite predictions emphasize heat flux and surface area contributions.

- `interpretability/fig_2_8_local_explanation_generic.png`
  - Question: Which features most influence a representative generic material prediction?
  - Takeaway: Generic material predictions reflect a mix of thermal exposure and mass-related factors.

## Error Analysis

- `error_analysis/fig_2_9_error_by_material_class.png`
  - Question: How does prediction error vary by material class?
  - Takeaway: Error distributions are centered near zero, with polymers showing the widest spread.
