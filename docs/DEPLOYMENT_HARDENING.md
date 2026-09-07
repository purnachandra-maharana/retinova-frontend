# Deployment and MATLAB hardening

## MATLAB runtime

Run scripts from any checkout; paths are resolved by
`SIH26038_NEW/scripts/retinaProjectConfig.m`. Do not restore developer-specific
absolute paths. The trained artifact remains the real
`models/DR_ResNet50_SIH26038.mat` model and is checked before inference for a
supported network, five output classes, valid input dimensions, and the
configured Grad-CAM feature layer.

Training, evaluation, and inference prefer an available GPU and explicitly
fall back to CPU through `retinaSelectExecutionEnvironment.m`. Preprocessing
should use `retinaPreprocessImage.m` so grayscale/RGB conversion and resizing
remain consistent.

Required MATLAB capabilities are Image Processing Toolbox, Deep Learning
Toolbox, and (for GPU execution) Parallel Computing Toolbox plus a compatible
CUDA-enabled GPU. CPU fallback does not make GPU-only performance claims.

## Output privacy

Clinical JSON no longer stores host filesystem paths. It stores only the input
file name and generated artifact file name. Do not commit patient uploads,
Grad-CAM images, reports, MAT results, or MATLAB build caches. These paths are
ignored in `.gitignore`; existing generated files should be removed from a
working checkout with:

```matlab
cleanupGeneratedArtifacts(true)
```

Only reproducible output and cache directories are removed by that helper.
Review retention and access controls before exposing generated reports from a
service or object store.

## Simulink safety

`buildRetinaSafeSimulink.m` resolves the model beside the script, closes any
already-loaded copy without saving, creates a one-time `.prebuild.bak.slx`
backup, and saves only that known model path. Review the generated model before
using it in a deployment build.

## Deployment limitations

The MATLAB service still requires a separately installed MATLAB runtime or
MATLAB executable and a configured backend integration. This repository does
not provide a medical-device validation, calibration, audit trail, or
production PHI retention policy. The system remains an AI-assisted screening
prototype and is not a diagnosis.
