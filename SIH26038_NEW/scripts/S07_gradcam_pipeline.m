
%% S07_gradcam_pipeline.m
% Grad-CAM Explainability Pipeline
% SIH 26038 - Explainable AI for Diabetic Retinopathy Screening
%
% Workflow:
%   Input Image
%       |
%       +--> Image Quality
%       |
%       +--> GOOD       -> Original Image
%       |
%       +--> BORDERLINE -> CLAHE enhanced image (memory only)
%       |
%       +--> POOR       -> No classification / No Grad-CAM
%       |
%       +--> DR Prediction
%       |
%       +--> Grad-CAM for predicted class
%
% No enhanced image is saved to disk.

clear;
clc;
close all;

%% ================================================================
% 1. PATHS
% ================================================================

projectRoot = 'C:\Users\Aditya\OneDrive\Documents\MATLAB\DR FOLDER IMP\DATASETS\SIH26038_NEW';

modelPath = fullfile( ...
    projectRoot, ...
    'models', ...
    'DR_ResNet50_SIH26038.mat');

testFolder = fullfile( ...
    projectRoot, ...
    'test_images');

gradcamFolder = fullfile( ...
    projectRoot, ...
    'output', ...
    'gradcam');

reportFolder = fullfile( ...
    projectRoot, ...
    'output', ...
    'reports');

if ~exist(gradcamFolder, 'dir')
    mkdir(gradcamFolder);
end

if ~exist(reportFolder, 'dir')
    mkdir(reportFolder);
end

%% ================================================================
% 2. FIND INPUT IMAGE
% ================================================================

imageFiles = [
    dir(fullfile(testFolder, '*.png'));
    dir(fullfile(testFolder, '*.jpg'));
    dir(fullfile(testFolder, '*.jpeg'));
];

if isempty(imageFiles)
    error(['No test image found in:' newline testFolder]);
end

imageName = imageFiles(1).name;
imagePath = fullfile(testFolder, imageName);

fprintf('\n============================================================\n');
fprintf('       SIH 26038 - GRAD-CAM EXPLAINABILITY PIPELINE\n');
fprintf('============================================================\n');

fprintf('\nInput Image: %s\n', imageName);

%% ================================================================
% 3. LOAD IMAGE
% ================================================================

I = imread(imagePath);

if size(I,3) == 1
    I = repmat(I, [1 1 3]);
end

if ~isa(I, 'uint8')
    I = im2uint8(I);
end

%% ================================================================
% 4. IMAGE QUALITY ASSESSMENT
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('IMAGE QUALITY ASSESSMENT\n');
fprintf('------------------------------------------------------------\n');

Igray = rgb2gray(I);

% Brightness
brightness = mean(Igray(:)) / 255;

% Contrast
contrast = std(double(Igray(:))) / 255;

% Sharpness
laplacianKernel = [0 1 0; 1 -4 1; 0 1 0];

laplacianImage = imfilter( ...
    double(Igray), ...
    laplacianKernel, ...
    'replicate');

sharpness = var(laplacianImage(:));

% Saturation
hsvImage = rgb2hsv(I);
saturation = mean(hsvImage(:,:,2), 'all');

% Retinal coverage
grayDouble = im2double(Igray);

retinaMask = grayDouble > 0.05;

retinaMask = bwareaopen(retinaMask, 500);

retinalCoverage = ...
    100 * nnz(retinaMask) / numel(retinaMask);

%% ================================================================
% 5. QUALITY SCORES
% ================================================================

brightnessScore = max(0, ...
    100 * (1 - abs(brightness - 0.45) / 0.45));

brightnessScore = min(brightnessScore, 100);

contrastScore = min(100, ...
    100 * contrast / 0.25);

sharpnessScore = min(100, ...
    100 * sharpness / 0.005);

saturationScore = min(100, ...
    100 * saturation / 0.20);

retinalCoverageScore = min(100, ...
    retinalCoverage);

qualityScore = mean([
    brightnessScore
    contrastScore
    sharpnessScore
    saturationScore
    retinalCoverageScore
]);

%% ================================================================
% 6. QUALITY DECISION
% ================================================================

if qualityScore >= 70

    qualityStatus = "GOOD";
    enhancementApplied = false;
    enhancementMethod = "None";
    classificationAllowed = true;

elseif qualityScore >= 50

    qualityStatus = "BORDERLINE";
    enhancementApplied = true;
    enhancementMethod = "LAB + CLAHE";
    classificationAllowed = true;

else

    qualityStatus = "POOR";
    enhancementApplied = false;
    enhancementMethod = "None";
    classificationAllowed = false;

end

fprintf('\nBrightness          : %.4f\n', brightness);
fprintf('Contrast            : %.4f\n', contrast);
fprintf('Sharpness           : %.6f\n', sharpness);
fprintf('Saturation          : %.4f\n', saturation);
fprintf('Retinal coverage    : %.2f %%\n', retinalCoverage);

fprintf('\nBrightness score    : %.2f / 100\n', brightnessScore);
fprintf('Contrast score      : %.2f / 100\n', contrastScore);
fprintf('Sharpness score     : %.2f / 100\n', sharpnessScore);
fprintf('Saturation score    : %.2f / 100\n', saturationScore);
fprintf('Retinal coverage    : %.2f / 100\n', retinalCoverageScore);

fprintf('\nIMAGE QUALITY SCORE : %.2f / 100\n', qualityScore);
fprintf('QUALITY STATUS      : %s\n', qualityStatus);

%% ================================================================
% 7. POOR IMAGE -> STOP
% ================================================================

if ~classificationAllowed

    fprintf('\n============================================================\n');
    fprintf('GRAD-CAM STOPPED\n');
    fprintf('============================================================\n');

    feedback = ...
        'Image quality is poor. Please recapture the fundus image.';

    fprintf('\n%s\n', feedback);

    result = struct();

    result.imageName = imageName;
    result.imageQualityScore = qualityScore;
    result.imageQualityStatus = char(qualityStatus);

    result.enhancementApplied = false;
    result.classificationAllowed = false;

    result.gradCAMGenerated = false;
    result.gradCAMPath = '';

    result.feedback = feedback;

    result.disclaimer = ...
        'AI screening prototype only. This result is not a medical diagnosis.';

    save( ...
        fullfile(reportFolder, 'S07_gradcam_result.mat'), ...
        'result');

    return;
end

%% ================================================================
% 8. SELECT IMAGE FOR CLASSIFICATION + GRAD-CAM
% ================================================================

if qualityStatus == "BORDERLINE"

    fprintf('\n------------------------------------------------------------\n');
    fprintf('BORDERLINE IMAGE\n');
    fprintf('------------------------------------------------------------\n');

    fprintf('Applying LAB + CLAHE enhancement in memory...\n');

    labImage = rgb2lab(I);

    L = labImage(:,:,1);

    Lnormalized = L / 100;

    Lclahe = adapthisteq( ...
        Lnormalized, ...
        'NumTiles', [8 8], ...
        'ClipLimit', 0.01, ...
        'Distribution', 'rayleigh');

    labImage(:,:,1) = Lclahe * 100;

    enhancedImage = lab2rgb(labImage);

    enhancedImage = im2uint8(enhancedImage);

    processedImage = enhancedImage;

    fprintf('CLAHE enhancement completed.\n');
    fprintf('Enhanced image kept in memory only.\n');

else

    fprintf('\n------------------------------------------------------------\n');
    fprintf('GOOD QUALITY IMAGE\n');
    fprintf('------------------------------------------------------------\n');

    fprintf('Using original image.\n');

    processedImage = I;

end

%% ================================================================
% 9. LOAD MODEL
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('LOADING DR MODEL\n');
fprintf('------------------------------------------------------------\n');

if ~isfile(modelPath)
    error(['Model file not found:' newline modelPath]);
end

load(modelPath, 'trainedNet', 'classNames');

fprintf('Model loaded successfully.\n');
fprintf('Model: ResNet-50\n');

%% ================================================================
% 10. PREPARE IMAGE
% ================================================================

modelImage = imresize(processedImage, [224 224]);

if size(modelImage,3) == 1
    modelImage = repmat(modelImage, [1 1 3]);
end

%% ================================================================
% 11. CLASSIFICATION
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('DR CLASSIFICATION\n');
fprintf('------------------------------------------------------------\n');

[predictedLabel, scores] = classify( ...
    trainedNet, ...
    modelImage);

predictedIndex = find(classNames == predictedLabel);

if isempty(predictedIndex)
    error('Predicted class index could not be determined.');
end

confidence = scores(predictedIndex);

predictedGrade = ...
    str2double(string(predictedLabel));

%% ================================================================
% 12. SEVERITY
% ================================================================

severityNames = [
    "No DR"
    "Mild DR"
    "Moderate DR"
    "Severe DR"
    "Proliferative DR"
];

severity = severityNames(predictedGrade + 1);

%% ================================================================
% 13. DISPLAY PREDICTION
% ================================================================

fprintf('\nPredicted Grade    : %d\n', predictedGrade);
fprintf('Severity           : %s\n', severity);
fprintf('Model Confidence   : %.2f %%\n', confidence * 100);

%% ================================================================
% 14. GRAD-CAM
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('GENERATING GRAD-CAM\n');
fprintf('------------------------------------------------------------\n');

% ResNet-50 Grad-CAM layers used in S03
targetLayer = 'activation_49_relu';
reductionLayer = 'avg_pool';

fprintf('Feature Layer      : %s\n', targetLayer);
fprintf('Reduction Layer    : %s\n', reductionLayer);
fprintf('Target Class       : Grade %d\n', predictedGrade);

% Generate Grad-CAM score map
scoreMap = gradCAM( ...
    trainedNet, ...
    modelImage, ...
    predictedLabel, ...
    'ReductionLayer', reductionLayer, ...
    'FeatureLayer', targetLayer);

%% ================================================================
% 15. STRENGTHEN GRAD-CAM
% ================================================================

% Convert Grad-CAM output to standard MATLAB numeric array
if isa(scoreMap, 'dlarray')
    scoreMap = extractdata(scoreMap);
end

% Convert to double
scoreMap = double(scoreMap);

% Remove singleton dimensions
scoreMap = squeeze(scoreMap);

% Ensure real values
scoreMap = real(scoreMap);

% Replace invalid values if present
scoreMap(~isfinite(scoreMap)) = 0;

% Normalize Grad-CAM map
minValue = min(scoreMap(:));
maxValue = max(scoreMap(:));

if maxValue > minValue
    scoreMap = ...
        (scoreMap - minValue) / ...
        (maxValue - minValue);
else
    scoreMap = zeros(size(scoreMap));
end

% Increase visibility of important regions
scoreMap = scoreMap .^ 0.6;

% Final normalization
minValue = min(scoreMap(:));
maxValue = max(scoreMap(:));

if maxValue > minValue
    scoreMap = ...
        (scoreMap - minValue) / ...
        (maxValue - minValue);
end

%% ================================================================
% 16. CREATE VISUALIZATION
% ================================================================

fprintf('Creating Grad-CAM visualization...\n');

figure( ...
    'Visible', 'off', ...
    'Color', 'k', ...
    'Position', [100 100 1200 600]);

% ------------------------------------------------
% Original / processed image
% ------------------------------------------------

subplot(1,2,1);

imshow(modelImage);

title( ...
    sprintf( ...
    'Input Image\nGrade %d - %s', ...
    predictedGrade, ...
    severity), ...
    'Color', 'w', ...
    'FontSize', 14, ...
    'FontWeight', 'bold');

% ------------------------------------------------
% Grad-CAM overlay
% ------------------------------------------------

subplot(1,2,2);

imshow(modelImage);

hold on;

h = imagesc(scoreMap);

h.AlphaData = 0.80 * scoreMap;

colormap jet;

title( ...
    sprintf( ...
    'Grad-CAM\nConfidence %.2f%%', ...
    confidence * 100), ...
    'Color', 'w', ...
    'FontSize', 14, ...
    'FontWeight', 'bold');

axis image off;

hold off;

%% ================================================================
% 17. SAVE GRAD-CAM IMAGE
% ================================================================

[~, baseName, ~] = fileparts(imageName);

gradcamFile = fullfile( ...
    gradcamFolder, ...
    [baseName '_GradCAM.png']);

exportgraphics( ...
    gcf, ...
    gradcamFile, ...
    'Resolution', 200);

close(gcf);

fprintf('\nGrad-CAM saved to:\n%s\n', gradcamFile);

%% ================================================================
% 18. REFERRAL DECISION
% ================================================================

if predictedGrade <= 1

    referralStatus = "NON-REFERABLE";

else

    referralStatus = "REFER TO OPHTHALMOLOGIST";

end

%% ================================================================
% 19. STRUCTURED XAI RESULT
% ================================================================

result = struct();

% Image
result.imageName = imageName;

% Quality
result.imageQualityScore = qualityScore;
result.imageQualityStatus = char(qualityStatus);

% Enhancement
result.enhancementApplied = enhancementApplied;
result.enhancementMethod = char(enhancementMethod);

if qualityStatus == "BORDERLINE"
    result.processedImageSource = ...
        "CLAHE enhanced image (memory only)";
else
    result.processedImageSource = ...
        "Original image";
end

% Classification
result.classificationAllowed = true;

result.predictedGrade = predictedGrade;
result.severity = char(severity);

result.confidence = confidence;

result.classProbabilities = scores;
result.classLabels = classNames;

% Referral
result.referralStatus = char(referralStatus);

% Grad-CAM
result.gradCAMGenerated = true;
result.gradCAMFeatureLayer = targetLayer;
result.gradCAMReductionLayer = reductionLayer;
result.gradCAMPath = gradcamFile;

% Model
result.modelName = "ResNet-50";

% XAI interpretation
result.xaiInterpretation = ...
    "Grad-CAM highlights spatial regions that contributed strongly to the predicted DR class. The visualization provides model interpretability and should not be interpreted as direct lesion detection.";

% Disclaimer
result.disclaimer = ...
    "AI screening prototype only. This result is not a medical diagnosis.";

%% ================================================================
% 20. SAVE STRUCTURED RESULT
% ================================================================

resultFile = fullfile( ...
    reportFolder, ...
    'S07_gradcam_result.mat');

save(resultFile, 'result');

%% ================================================================
% 21. FINAL OUTPUT
% ================================================================

fprintf('\n============================================================\n');
fprintf('        S07 GRAD-CAM PIPELINE COMPLETED\n');
fprintf('============================================================\n');

fprintf('\nImage              : %s\n', imageName);
fprintf('Quality             : %s\n', qualityStatus);
fprintf('Quality Score       : %.2f / 100\n', qualityScore);

fprintf('\nPredicted Grade     : %d\n', predictedGrade);
fprintf('Severity            : %s\n', severity);
fprintf('Confidence          : %.2f %%\n', confidence * 100);

fprintf('\nReferral Status     : %s\n', referralStatus);

fprintf('\nGrad-CAM Feature    : %s\n', targetLayer);
fprintf('Grad-CAM Generated  : YES\n');

fprintf('\nGrad-CAM File:\n%s\n', gradcamFile);

fprintf('\nResult File:\n%s\n', resultFile);

fprintf('\n------------------------------------------------------------\n');
fprintf('XAI INTERPRETATION\n');
fprintf('------------------------------------------------------------\n');

fprintf('%s\n', result.xaiInterpretation);

fprintf('\nDISCLAIMER:\n');
fprintf('%s\n', result.disclaimer);

fprintf('\n============================================================\n');

