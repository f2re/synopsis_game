---
name: release-evidence
description: "Repeatable CI, visual regression and independent release signoff"
---

# release-evidence

Read `.github/workflows/`, `agents/QUALITY_GATES.md` and deploy/release scripts. Require exact SHA, test commands, screenshots for visible changes, validation logs and targeted performance measurements. Headless GPU/SwiftShader results are not proof of real-device performance. Preserve legacy2d default until H3D quality gates. A CI status or PR comment is not an independent human/art methodological signoff. Publish only when applicable reviewers report PASS.


Evidence: list tested cases and exact commands, with independent reviewer decisions when required.
