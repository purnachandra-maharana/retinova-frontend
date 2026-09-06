
%% S06_prediction_pipeline.m
% Complete DR Prediction Pipeline
% SIH 26038 - Explainable AI for Diabetic Retinopathy Screening
%
% Workflow:
%   Image -> Quality Assessment
%          -> GOOD       -> Original Image -> DR Prediction
%          -> BORDERLINE -> CLAHE (memory only) -> DR Prediction
%          -> POOR       -> Stop + Recapture Message
%
% No enhanced image is saved to disk.

clear;
clc;
close all;

%% ================================================================
% 1. PATHS
% ================================================================

projectRoot = 'C:\Users\Aditya\OneDrive\Documents\MATLAB\DR FOLDER IMP\DATASETS\SIH26038_NEW';

modelPath = fullfile(projectRoot, 'models', ...
    'DR_ResNet50_SIH26038.mat');

testFolder = fullfile(projectRoot, 'test_images');

outputFolder = fullfile(projectRoot, 'output', 'predictions');

if ~exist(outputFolder, 'dir')
    mkdir(outputFolder);
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
    error(['No test image found in: ' newline testFolder]);
end

% Use the first available image
imageName = imageFiles(1).name;
imagePath = fullfile(testFolder, imageName);

fprintf('\n============================================================\n');
fprintf('      SIH 26038 - DR PREDICTION PIPELINE\n');
fprintf('============================================================\n');

fprintf('\nInput Image: %s\n', imageName);

%% ================================================================
% 3. LOAD IMAGE
% ================================================================

I = imread(imagePath);

% Convert grayscale to RGB if required
if size(I,3) == 1
    I = repmat(I, [1 1 3]);
end

% Convert to uint8 for consistent processing
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

% ------------------------------------------------
% Brightness
% ------------------------------------------------

brightness = mean(Igray(:)) / 255;

% ------------------------------------------------
% Contrast
% ------------------------------------------------

contrast = std(double(Igray(:))) / 255;

% ------------------------------------------------
% Sharpness
% ------------------------------------------------

laplacianKernel = [0 1 0; 1 -4 1; 0 1 0];

laplacianImage = imfilter(double(Igray), ...
    laplacianKernel, ...
    'replicate');

sharpness = var(laplacianImage(:));

% ------------------------------------------------
% Saturation
% ------------------------------------------------

hsvImage = rgb2hsv(I);

saturation = mean(hsvImage(:,:,2), 'all');

% ------------------------------------------------
% Retinal Coverage
% ------------------------------------------------

% Detect non-dark retinal region
grayDouble = im2double(Igray);

retinaMask = grayDouble > 0.05;

% Remove very small regions
retinaMask = bwareaopen(retinaMask, 500);

retinalCoverage = 100 * nnz(retinaMask) / numel(retinaMask);

%% ================================================================
% 5. NORMALIZED QUALITY SCORES
% ================================================================

% Brightness score
brightnessScore = max(0, ...
    100 * (1 - abs(brightness - 0.45) / 0.45));

brightnessScore = min(brightnessScore, 100);

% Contrast score
contrastScore = min(100, ...
    100 * contrast / 0.25);

% Sharpness score
sharpnessScore = min(100, ...
    100 * sharpness / 0.005);

% Saturation score
saturationScore = min(100, ...
    100 * saturation / 0.20);

% Retinal coverage score
retinalCoverageScore = min(100, retinalCoverage);

% Overall quality score
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

%% ================================================================
% 7. DISPLAY QUALITY RESULTS
% ================================================================

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
% 8. POOR IMAGE -> STOP
% ================================================================

if ~classificationAllowed

    fprintf('\n============================================================\n');
    fprintf('CLASSIFICATION STOPPED\n');
    fprintf('============================================================\n');

    feedback = ...
        'Image quality is poor. Please recapture the fundus image. ' + ...
        'Ensure proper focus, adequate illumination, minimal blur, ' + ...
        'and that the retina is properly centered.';

    fprintf('\n%s\n', feedback);

    % Structured result
    result = struct();

    result.imageName = imageName;
    result.imageQualityScore = qualityScore;
    result.imageQualityStatus = char(qualityStatus);

    result.enhancementApplied = false;
    result.enhancementMethod = char(enhancementMethod);

    result.classificationAllowed = false;

    result.predictedGrade = [];
    result.severity = "";
    result.confidence = [];

    result.classProbabilities = [];
    result.classLabels = [];

    result.referralStatus = "";
    result.referralReason = "";

    result.modelName = "ResNet-50";

    result.feedback = feedback;

    result.disclaimer = ...
        "AI screening prototype only. This result is not a medical diagnosis.";

    save(fullfile(outputFolder, ...
        'S06_prediction_result.mat'), 'result');

    fprintf('\nResult saved without classification.\n');

    return;
end

%% ================================================================
% 9. BORDERLINE IMAGE -> CLAHE IN MEMORY
% ================================================================

if qualityStatus == "BORDERLINE"

    fprintf('\n------------------------------------------------------------\n');
    fprintf('BORDERLINE IMAGE DETECTED\n');
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

    % Convert back to uint8
    enhancedImage = im2uint8(enhancedImage);

    % IMPORTANT:
    % enhancedImage exists only in MATLAB memory.
    % It is NOT saved to disk.

    processedImage = enhancedImage;

    fprintf('CLAHE enhancement completed.\n');
    fprintf('Enhanced image kept in memory only.\n');

else

    %% ============================================================
    % 10. GOOD IMAGE -> USE ORIGINAL
    % ============================================================

    fprintf('\n------------------------------------------------------------\n');
    fprintf('GOOD QUALITY IMAGE\n');
    fprintf('------------------------------------------------------------\n');

    fprintf('Using original image for classification.\n');

    processedImage = I;

end

%% ================================================================
% 11. LOAD TRAINED RESNET-50 MODEL
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('LOADING DR MODEL\n');
fprintf('------------------------------------------------------------\n');

if ~isfile(modelPath)
    error(['Model file not found: ' newline modelPath]);
end

load(modelPath, 'trainedNet', 'classNames');

fprintf('Model loaded successfully.\n');
fprintf('Model: ResNet-50\n');

%% ================================================================
% 12. PREPARE IMAGE FOR RESNET-50
% ================================================================

modelImage = imresize(processedImage, [224 224]);

% Ensure RGB
if size(modelImage,3) == 1
    modelImage = repmat(modelImage, [1 1 3]);
end

%% ================================================================
% 13. DR CLASSIFICATION
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('DR CLASSIFICATION\n');
fprintf('------------------------------------------------------------\n');

[predictedLabel, scores] = classify( ...
    trainedNet, ...
    modelImage);

% Find predicted class index
predictedIndex = find(classNames == predictedLabel);

if isempty(predictedIndex)
    error('Could not determine predicted class index.');
end

% Model confidence
confidence = scores(predictedIndex);

% Convert categorical label to number
predictedGrade = str2double(string(predictedLabel));

%% ================================================================
% 14. SEVERITY MAPPING
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
% 15. REFERRAL DECISION
% ================================================================

if predictedGrade <= 1

    referralStatus = "NON-REFERABLE";

    referralReason = ...
        "Predicted DR grade is 0-1. Routine monitoring is suggested.";

else

    referralStatus = "REFER TO OPHTHALMOLOGIST";

    referralReason = ...
        "Predicted DR grade is 2-4 and is classified as referable.";

end

%% ================================================================
% 16. DISPLAY PREDICTION
% ================================================================

fprintf('\n============================================================\n');
fprintf('                DR SCREENING RESULT\n');
fprintf('============================================================\n');

fprintf('\nPredicted Grade    : %d\n', predictedGrade);
fprintf('Severity           : %s\n', severity);
fprintf('Model Confidence   : %.2f %%\n', confidence * 100);

fprintf('\n------------------------------------------------------------\n');
fprintf('CLASS PROBABILITIES\n');
fprintf('------------------------------------------------------------\n');

for i = 1:numel(classNames)

    gradeNumber = str2double(string(classNames(i)));

    fprintf( ...
        'Grade %d (%s) : %.2f %%\n', ...
        gradeNumber, ...
        severityNames(gradeNumber + 1), ...
        scores(i) * 100);

end

fprintf('\n------------------------------------------------------------\n');
fprintf('REFERRAL DECISION\n');
fprintf('------------------------------------------------------------\n');

fprintf('Status             : %s\n', referralStatus);
fprintf('Reason             : %s\n', referralReason);

%% ================================================================
% 17. STRUCTURED RESULT
% ================================================================

result = struct();

% Image information
result.imageName = imageName;

% Quality information
result.imageQualityScore = qualityScore;
result.imageQualityStatus = char(qualityStatus);

result.enhancementApplied = enhancementApplied;
result.enhancementMethod = char(enhancementMethod);

result.classificationAllowed = classificationAllowed;

if qualityStatus == "BORDERLINE"
    result.processedImageSource = ...
        "CLAHE enhanced image (memory only)";
else
    result.processedImageSource = "Original image";
end

% Prediction
result.predictedGrade = predictedGrade;
result.severity = char(severity);

% Confidence
result.confidence = confidence;

% Probabilities
result.classProbabilities = scores;
result.classLabels = classNames;

% Referral
result.referralStatus = char(referralStatus);
result.referralReason = char(referralReason);

% Model
result.modelName = "ResNet-50";

% Feedback
result.feedback = "";

% Disclaimer
result.disclaimer = ...
    "AI screening prototype only. This result is not a medical diagnosis.";

%% ================================================================
% 18. SAVE RESULT
% ================================================================

resultFile = fullfile( ...
    outputFolder, ...
    'S06_prediction_result.mat');

save(resultFile, 'result');

%% ================================================================
% 19. FINAL OUTPUT
% ================================================================

fprintf('\n============================================================\n');
fprintf('S06 PREDICTION PIPELINE COMPLETED\n');
fprintf('============================================================\n');

fprintf('\nQuality Status     : %s\n', qualityStatus);
fprintf('Quality Score      : %.2f / 100\n', qualityScore);
fprintf('Enhancement        : %s\n', enhancementMethod);

fprintf('\nPredicted Grade    : %d\n', predictedGrade);
fprintf('Severity           : %s\n', severity);
fprintf('Confidence         : %.2f %%\n', confidence * 100);

fprintf('\nReferral Status     : %s\n', referralStatus);

fprintf('\nResult saved to:\n%s\n', resultFile);

fprintf('\nDISCLAIMER:\n');
fprintf('%s\n', result.disclaimer);

fprintf('\n============================================================\n');

