# Validation Summary

## Scope

This summary describes the current validation posture for Dravix v0.3.0 as an engineering screening system.

Validation should be interpreted as evidence of behavioral alignment and useful ranking behavior, not proof of certification-grade predictive accuracy.

## Dataset

Current screening dataset scale:
- approximately 718 materials

Observed coarse material classes in the current dataset:
- polymers
- composites
- generic materials

Representative class counts in the available screening dataset:
- generic: 410
- polymer: 213
- composite: 95

## Observed Trends

The current validation set shows trends that are directionally consistent with engineering intuition for screening:
- positive correlation with external heat flux,
- negative correlation with time to ignition,
- increased concern when ignition occurs faster under comparable exposure,
- lower concern when ignition resistance indicators trend favorably.

In the local screening dataset used for proxy-score analysis, the observed correlations were approximately:
- external heat flux vs. proxy score: `+0.86`
- time to ignition vs. proxy score: `-0.58`

These values should be read as validation cues, not universal material laws.

## What Validation Demonstrates

At this release stage, validation demonstrates:
- the system is internally consistent,
- the screening signal aligns with expected directional behavior,
- the model can support relative ranking of candidate materials,
- interpretability outputs remain meaningful enough for engineering review.

## What Validation Does Not Demonstrate

Validation does not demonstrate:
- certification accuracy,
- universal transferability across all material families,
- guaranteed performance under unseen fire scenarios,
- compliance with ASTM, ISO, FAA, UL, or other standards frameworks.

## Release Interpretation

The correct interpretation of the current validation evidence is:
- behavioral alignment: yes,
- screening utility: yes,
- certification claim: no.

That distinction is central to the proper use of Dravix.
