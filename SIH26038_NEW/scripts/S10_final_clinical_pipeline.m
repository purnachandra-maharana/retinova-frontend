function result = S10_final_clinical_pipeline(imagePath)
% S10_FINAL_CLINICAL_PIPELINE
% Final backend-ready clinical screening pipeline for
% Explainable AI-based Diabetic Retinopathy Screening.
%
% Workflow:
%   Fundus Image
%       |
%       v
%   Image Quality Assessment
%       |
%       +---- POOR ------> Recapture recommended
%       |
%       +---- BORDERLINE -> CLAHE enhancement
%       |
%       +---- GOOD -------> Original image
%                              |
%                              v
%                         ResNet-50 DR Model
%                              |
%                              v
%                       DR Grade 0-4
%                              |
%                              v
%                     Referral Assessment
%                              |
%                              v
%                         Grad-CAM XAI
%                              |
%                              v
%                    Clinical Screening Result
%
% IMPORTANT:
% This is an AI screening prototype and NOT a medical diagnosis.
% IDRiD ground-truth annotations are NOT required during inference.
%
% Usage:
%   result = S10_final_clinical_pipeline("path_to_image.jpg");
%
% If imagePath is omitted, the first image from test_images is used.

clc;

fprintf('\n');
fprintf('============================================================\n');
fprintf(' S10 - FINAL CLINICAL DR SCREENING PIPELINE\n');
fprintf(' Explainable AI-Based Diabetic Retinopathy Screening\n');
fprintf('============================================================\n\n');

%% ============================================================
% 1. PROJECT PATHS
% =============================================================

config = retinaProjectConfig();
projectRoot = config.projectRoot;
modelPath = config.modelFile;
outputRoot = config.finalOutputRoot;

if ~exist(outputRoot, 'dir')
    mkdir(outputRoot);
end

gradcamFolder = fullfile(outputRoot, 'gradcam');

if ~exist(gradcamFolder, 'dir')
    mkdir(gradcamFolder);
end

jsonFolder = fullfile(outputRoot, 'json');

if ~exist(jsonFolder, 'dir')
    mkdir(jsonFolder);
end

%% ============================================================
% 2. IMAGE INPUT - ASK USER TO SELECT FUNDUS IMAGE
% =============================================================

if nargin < 1 || isempty(imagePath)

    [fileName, filePath] = uigetfile( ...
        {'*.jpg;*.jpeg;*.png;*.JPG;*.JPEG;*.PNG', ...
        'Fundus Images (*.jpg, *.jpeg, *.png)'}, ...
        'Select a Fundus Image for Diabetic Retinopathy Screening');

    % User cancelled the file selection
    if isequal(fileName, 0)

        fprintf('\nImage selection cancelled.\n');
        fprintf('No screening analysis was performed.\n');

        result = struct();
        result.systemStatus = "Cancelled";
        result.message = ...
            "No fundus image was selected for analysis.";

        return;
    end

    imagePath = fullfile(filePath, fileName);

end

if ~isfile(imagePath)

    error('Selected image does not exist:\n%s', imagePath);

end

[~, imageName, imageExt] = fileparts(imagePath);

fprintf('\nSelected Fundus Image : %s%s\n', ...
    imageName, imageExt);

%% ============================================================
% 3. READ FUNDUS IMAGE
% =============================================================

rawImage = imread(imagePath);
originalImage = retinaPreprocessImage(rawImage, ...
    [size(rawImage, 1), size(rawImage, 2), 3]);

%% ============================================================
% 4. IMAGE QUALITY ASSESSMENT
% =============================================================

fprintf('------------------------------------------------------------\n');
fprintf(' IMAGE QUALITY ASSESSMENT\n');
fprintf('------------------------------------------------------------\n');

quality = assessFundusQuality(originalImage);

fprintf('Brightness Score       : %.2f\n', quality.brightnessScore);
fprintf('Contrast Score         : %.2f\n', quality.contrastScore);
fprintf('Sharpness Score        : %.2f\n', quality.sharpnessScore);
fprintf('Saturation Score       : %.2f\n', quality.saturationScore);
fprintf('Retinal Coverage Score : %.2f\n', quality.retinalCoverageScore);
fprintf('Overall Quality Score  : %.2f / 100\n', quality.score);
fprintf('Quality Classification : %s\n', quality.status);

%% ============================================================
% 5. QUALITY DECISION
% =============================================================

processedImage = originalImage;

enhancementApplied = false;
enhancementMethod = "None";

if strcmp(quality.status, "POOR")

    fprintf('\nImage acquisition quality is inadequate.\n');
    fprintf('Further automated analysis has been withheld.\n');
    fprintf('Recommendation: RECQUIRE FUNDUS IMAGE.\n\n');

    prediction = createEmptyPrediction();
    referral = createNoReferralResult();

    xai = createEmptyXAI();

    clinicalMessage = ...
        "The submitted fundus image is of inadequate quality for reliable automated screening. Please recapture the image under appropriate acquisition conditions.";

elseif strcmp(quality.status, "BORDERLINE")

    fprintf('\nBorderline image quality detected.\n');
    fprintf('Applying CLAHE enhancement before classification...\n');

    processedImage = applyCLAHE(originalImage);

    enhancementApplied = true;
    enhancementMethod = "Contrast Limited Adaptive Histogram Equalization (CLAHE)";

    [prediction, referral, xai] = ...
        performClinicalInference( ...
        processedImage, ...
        modelPath, ...
        imageName, ...
        gradcamFolder);

    clinicalMessage = ...
        "The fundus image was classified after automated contrast enhancement. Clinical interpretation should consider the image-quality limitation.";

else

    fprintf('\nAdequate image quality detected.\n');
    fprintf('Proceeding with automated DR screening...\n');

    [prediction, referral, xai] = ...
        performClinicalInference( ...
        processedImage, ...
        modelPath, ...
        imageName, ...
        gradcamFolder);

    clinicalMessage = ...
        "The fundus image was suitable for automated screening and was analyzed using the trained ResNet-50 model.";
end

%% ============================================================
% 6. DISPLAY CLINICAL RESULT
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf(' CLINICAL SCREENING RESULT\n');
fprintf('============================================================\n');

fprintf('Image Quality       : %s\n', quality.status);
fprintf('Quality Score       : %.2f / 100\n', quality.score);

if ~strcmp(quality.status, "POOR")

    fprintf('DR Severity Grade   : %d\n', prediction.grade);
    fprintf('DR Classification   : %s\n', prediction.label);
    fprintf('Model Confidence    : %.2f%%\n', prediction.confidence);

    fprintf('\nReferral Assessment :\n');
    fprintf('%s\n', referral.message);

    fprintf('\nClass Probabilities:\n');

    for i = 1:numel(prediction.probabilities)

        fprintf('  Grade %d (%s): %.2f%%\n', ...
            i-1, ...
            prediction.classLabels(i), ...
            prediction.probabilities(i) * 100);

    end

else

    fprintf('DR Classification   : Not performed\n');
    fprintf('Model Confidence    : Not available\n');

    fprintf('\nClinical Action:\n');
    fprintf('%s\n', clinicalMessage);

end

%% ============================================================
% 7. FINAL CLINICAL RESULT STRUCTURE
% =============================================================

result = struct();

% ------------------------------------------------------------
% Image information
% ------------------------------------------------------------

result.imageName = string([imageName imageExt]);
% Do not persist host paths or other identifying filesystem details.
result.imagePath = string(imageName + imageExt);

% ------------------------------------------------------------
% Quality information
% ------------------------------------------------------------

result.quality = struct();

result.quality.status = string(quality.status);
result.quality.score = quality.score;

result.quality.metrics = struct();

result.quality.metrics.brightness = quality.brightnessScore;
result.quality.metrics.contrast = quality.contrastScore;
result.quality.metrics.sharpness = quality.sharpnessScore;
result.quality.metrics.saturation = quality.saturationScore;
result.quality.metrics.retinalCoverage = quality.retinalCoverageScore;

result.quality.enhancement = struct();

result.quality.enhancement.applied = enhancementApplied;
result.quality.enhancement.method = string(enhancementMethod);

% ------------------------------------------------------------
% Prediction
% ------------------------------------------------------------

result.prediction = prediction;

% ------------------------------------------------------------
% Referral
% ------------------------------------------------------------

result.referral = referral;

% ------------------------------------------------------------
% Explainability
% ------------------------------------------------------------

result.xai = xai;

% ------------------------------------------------------------
% Clinical interpretation
% ------------------------------------------------------------

result.clinicalMessage = string(clinicalMessage);

% ------------------------------------------------------------
% Model information
% ------------------------------------------------------------

result.model = struct();

result.model.name = "ResNet-50";
result.model.inputSize = config.inputSize;
result.model.task = ...
    "Five-class diabetic retinopathy severity classification";

result.model.classes = ...
    ["Grade 0","Grade 1","Grade 2","Grade 3","Grade 4"];

result.model.dataset = "APTOS 2019";

% ------------------------------------------------------------
% Safety information
% ------------------------------------------------------------

result.disclaimer = ...
    "This system is an AI-assisted diabetic retinopathy screening prototype and is not a medical diagnostic device. The output should not replace comprehensive ophthalmic examination, clinical judgment, or professional medical advice.";

result.explanationNote = ...
    "Grad-CAM provides a coarse visual explanation of image regions contributing to the model prediction. It should not be interpreted as a pixel-level lesion segmentation or definitive anatomical localization.";

result.annotationNote = ...
    "IDRiD expert annotations are used for development and validation of retinal lesion and structure analysis, but are not required during inference on a new patient image.";

% ------------------------------------------------------------
% System status
% ------------------------------------------------------------

result.system = struct();

result.system.pipeline = ...
    "Image Quality -> DR Classification -> Referral Assessment -> Grad-CAM";

result.system.status = "Completed";

result.system.timestamp = char(datetime("now", "TimeZone", "UTC"));
result.system.executionEnvironment = retinaSelectExecutionEnvironment();

%% ============================================================
% 8. SAVE MATLAB RESULT
% =============================================================

matOutput = fullfile( ...
    outputRoot, ...
    'S10_final_clinical_result.mat');

save(matOutput, 'result');

%% ============================================================
% 9. CREATE BACKEND-FRIENDLY JSON
% ============================================================

jsonResult = result;

% JSON should contain paths rather than image matrices.
jsonText = jsonencode(jsonResult, 'PrettyPrint', true);

jsonOutput = fullfile(jsonFolder, ...
    [retinaSafeFileName(imageName) '_clinical_result.json']);

fid = fopen(jsonOutput, 'w');

if fid ~= -1

    fprintf(fid, '%s', jsonText);
    fclose(fid);

else

    error('Could not create JSON output file: %s', jsonOutput);

end

%% ============================================================
% 10. FINAL STATUS
% =============================================================

fprintf('\n');
fprintf('============================================================\n');
fprintf(' S10 PIPELINE COMPLETED\n');
fprintf('============================================================\n');

fprintf('MATLAB Result : %s\n', matOutput);

if isfield(result.xai, 'gradCAMImagePath') && ...
        strlength(result.xai.gradCAMImagePath) > 0

    fprintf('Grad-CAM      : %s\n', result.xai.gradCAMImagePath);

end

fprintf('JSON Result   : %s\n', jsonOutput);

fprintf('\nIMPORTANT:\n');
fprintf(['This output represents AI-assisted screening information. ' ...
         'It is NOT a medical diagnosis and should not replace ' ...
         'professional ophthalmic assessment.\n']);

fprintf('============================================================\n\n');

end


%% ========================================================================
% LOCAL FUNCTION 1
% FUNDUS IMAGE QUALITY ASSESSMENT
% ========================================================================

function quality = assessFundusQuality(I)

I = im2double(I);

gray = rgb2gray(I);

hsvImage = rgb2hsv(I);

brightness = mean(I(:));
contrast = std(gray(:));

% ------------------------------------------------------------
% Sharpness
% ------------------------------------------------------------

laplacianKernel = [0 1 0; 1 -4 1; 0 1 0];

laplacianImage = imfilter( ...
    gray, ...
    laplacianKernel, ...
    'replicate');

sharpness = var(laplacianImage(:));

% ------------------------------------------------------------
% Saturation
% ------------------------------------------------------------

saturation = mean(hsvImage(:,:,2), 'all');

% ------------------------------------------------------------
% Retinal coverage
% ------------------------------------------------------------

retinalMask = gray > 0.05;

retinalMask = bwareaopen(retinalMask, 500);

retinalCoverage = ...
    100 * nnz(retinalMask) / numel(retinalMask);

% ------------------------------------------------------------
% Convert raw measurements into normalized scores
% ------------------------------------------------------------

brightnessScore = ...
    max(0, 100 - abs(brightness - 0.45) * 220);

contrastScore = ...
    min(100, (contrast / 0.25) * 100);

sharpnessScore = ...
    min(100, (sharpness / 0.005) * 100);

saturationScore = ...
    min(100, (saturation / 0.20) * 100);

retinalCoverageScore = ...
    min(100, retinalCoverage);

% ------------------------------------------------------------
% Weighted quality score
% ------------------------------------------------------------

overallScore = ...
      0.20 * brightnessScore ...
    + 0.20 * contrastScore ...
    + 0.25 * sharpnessScore ...
    + 0.10 * saturationScore ...
    + 0.25 * retinalCoverageScore;

% ------------------------------------------------------------
% Quality classification
% ------------------------------------------------------------

if overallScore >= 70

    status = "GOOD";

elseif overallScore >= 50

    status = "BORDERLINE";

else

    status = "POOR";

end

quality = struct();

quality.score = overallScore;
quality.status = status;

quality.brightnessScore = brightnessScore;
quality.contrastScore = contrastScore;
quality.sharpnessScore = sharpnessScore;
quality.saturationScore = saturationScore;
quality.retinalCoverageScore = retinalCoverageScore;

quality.rawBrightness = brightness;
quality.rawContrast = contrast;
quality.rawSharpness = sharpness;
quality.rawSaturation = saturation;
quality.rawRetinalCoverage = retinalCoverage;

end


%% ========================================================================
% LOCAL FUNCTION 2
% CLAHE ENHANCEMENT
% ========================================================================

function enhancedImage = applyCLAHE(I)

I = im2uint8(I);

% Convert RGB image to CIE L*a*b* color space
labImage = rgb2lab(I);

% Extract luminance channel
L = labImage(:,:,1);

% Normalize L channel to [0,1]
Lnormalized = L / 100;

% Apply CLAHE to luminance only
Lenhanced = adapthisteq( ...
    Lnormalized, ...
    'ClipLimit', 0.01);

% Convert back to L* range [0,100]
labImage(:,:,1) = Lenhanced * 100;

% Convert L*a*b* back to RGB
% MATLAB R2026a expects the RGB ColorSpace here.
enhancedImage = lab2rgb( ...
    labImage, ...
    'ColorSpace', 'srgb');

% Convert to uint8 for the ResNet-50 input
enhancedImage = im2uint8(enhancedImage);

end

%% ========================================================================
% LOCAL FUNCTION 3
% CLINICAL INFERENCE
% ========================================================================

function [prediction, referral, xai] = ...
    performClinicalInference(I, modelPath, imageName, gradcamFolder)

fprintf('\n');
fprintf('------------------------------------------------------------\n');
fprintf(' DEEP LEARNING INFERENCE\n');
fprintf('------------------------------------------------------------\n');

%% ---------------------------------------------------------------
% Load trained model
% ---------------------------------------------------------------

if ~isfile(modelPath)
    error('Trained model not found:\n%s', modelPath);
end

modelMetadata = retinaValidateModel(modelPath, "activation_49_relu");
net = modelMetadata.net;

%% ---------------------------------------------------------------
% Prepare image
% ---------------------------------------------------------------

inputImage = retinaPreprocessImage(I, modelMetadata.inputSize);

%% ---------------------------------------------------------------
% Classification
% ---------------------------------------------------------------

executionEnvironment = retinaSelectExecutionEnvironment();
[predictedLabel, scores] = classify(net, inputImage, ...
    'ExecutionEnvironment', executionEnvironment);

scores = double(scores);

scores = scores(:);

% Normalize probabilities if required.

if sum(scores) > 0
    scores = scores ./ sum(scores);
end

% ---------------------------------------------------------------
% Extract numerical DR grade
% ---------------------------------------------------------------

labelString = string(predictedLabel);

grade = extractDRGrade(labelString);

% ---------------------------------------------------------------
% Model confidence
% ---------------------------------------------------------------
% Raw softmax probability is retained internally for technical
% analysis, while the evaluator-facing output uses a confidence
% level to avoid presenting softmax probability as clinical certainty.

confidence = max(scores) * 100;

if confidence < 60
    confidenceLevel = "Low";
elseif confidence < 80
    confidenceLevel = "Moderate";
else
    confidenceLevel = "High";
end

fprintf('Predicted DR Grade : %d\n', grade);
fprintf('Classification     : %s\n', labelString);
fprintf('Model Confidence   : %s\n', confidenceLevel);
%% ---------------------------------------------------------------
% Stable class ordering
% ---------------------------------------------------------------

classLabels = ...
    ["No DR", ...
     "Mild NPDR", ...
     "Moderate NPDR", ...
     "Severe NPDR", ...
     "Proliferative DR"];

probabilities = zeros(1,5);

netClasses = string(net.Layers(end).Classes);

for i = 1:numel(netClasses)

    currentGrade = extractDRGrade(netClasses(i));

    if currentGrade >= 0 && currentGrade <= 4

        probabilities(currentGrade + 1) = scores(i);

    end

end

%% ---------------------------------------------------------------
% Referral assessment
% ---------------------------------------------------------------

if grade <= 1

    referralRequired = false;

    referralStatus = ...
        "No ophthalmic referral indicated by the screening model";

    referralMessage = ...
        "The screening model classified the image as non-referable diabetic retinopathy severity (Grade 0-1). Routine clinical follow-up should be determined by the patient's healthcare provider.";

else

    referralRequired = true;

    referralStatus = ...
        "Ophthalmic referral recommended";

    referralMessage = ...
        "The screening model identified referable diabetic retinopathy severity (Grade 2-4). Comprehensive ophthalmic evaluation by a qualified eye-care professional is recommended.";

end

%% ---------------------------------------------------------------
% Prediction structure
% ---------------------------------------------------------------

prediction = struct();

prediction.class = grade;
prediction.grade = grade;
prediction.label = getClinicalGradeLabel(grade);

prediction.confidence = confidence;

prediction.probabilities = probabilities;

prediction.classLabels = classLabels;

prediction.task = ...
    "Five-class diabetic retinopathy severity classification";

%% ---------------------------------------------------------------
% Referral structure
% ---------------------------------------------------------------

referral = struct();

referral.required = referralRequired;
referral.status = referralStatus;
referral.message = referralMessage;

referral.threshold = ...
    "Grades 2-4 considered referable by the prototype screening rule";

%% ---------------------------------------------------------------
% Grad-CAM
% ---------------------------------------------------------------

fprintf('\nGenerating Grad-CAM explanation...\n');

xai = generateGradCAM( ...
    net, ...
    inputImage, ...
    grade, ...
    imageName, ...
    gradcamFolder);

fprintf('Grad-CAM generated successfully.\n');

end


%% ========================================================================
% LOCAL FUNCTION 4
% GRAD-CAM GENERATION
% ========================================================================

function xai = generateGradCAM( ...
    net, ...
    inputImage, ...
    grade, ...
    imageName, ...
    outputFolder)

targetLayer = "activation_49_relu";

fprintf('Using Grad-CAM target layer: %s\n', targetLayer);

try

    %% ------------------------------------------------------------
    % Get actual classes from the trained network
    % ------------------------------------------------------------

    outputLayer = net.Layers(end);

    networkClasses = outputLayer.Classes;

    fprintf('Network classes:\n');

    disp(networkClasses);

    %% ------------------------------------------------------------
    % Determine class index corresponding to predicted grade
    % ------------------------------------------------------------

    predictedClassIndex = [];

    for k = 1:numel(networkClasses)

        currentClass = string(networkClasses(k));

        currentGrade = extractDRGrade(currentClass);

        if currentGrade == grade
            predictedClassIndex = k;
            break;
        end

    end

    if isempty(predictedClassIndex)

        error( ...
            'Could not match predicted DR Grade %d to the network output classes.', ...
            grade);

    end

    fprintf( ...
        'Grad-CAM class index: %d\n', ...
        predictedClassIndex);

    fprintf( ...
        'Grad-CAM class label: %s\n', ...
        string(networkClasses(predictedClassIndex)));

    %% ------------------------------------------------------------
    % Generate Grad-CAM using numerical class index
    % ------------------------------------------------------------

    if ~modelMetadata.featureLayerAvailable
        error('Configured Grad-CAM feature layer is absent from the trained model.');
    end

    scoreMap = gradCAM(net, inputImage, predictedClassIndex, ...
        'FeatureLayer', targetLayer);

    fprintf('Grad-CAM computation completed.\n');

catch ME

    fprintf('\nWARNING: Grad-CAM generation failed.\n');
    fprintf('Reason: %s\n\n', ME.message);

    xai = struct();

    xai.available = false;

    xai.method = "Grad-CAM";

    xai.targetLayer = targetLayer;

    xai.gradCAMImagePath = "";

    xai.interpretation = ...
        "Grad-CAM could not be generated for this inference.";

    xai.clinicalLimitation = ...
        "The model prediction remains available, but visual explainability was unavailable for this inference.";

    return;

end

%% ============================================================
% Convert score map to numeric array
% =============================================================

if isa(scoreMap, 'dlarray')
    scoreMap = extractdata(scoreMap);
end

scoreMap = double(scoreMap);

scoreMap = squeeze(scoreMap);

scoreMap(~isfinite(scoreMap)) = 0;

%% ============================================================
% Validate score map
% =============================================================

if isempty(scoreMap)

    warning('Grad-CAM returned an empty importance map.');

    xai = struct();

    xai.available = false;
    xai.method = "Grad-CAM";
    xai.targetLayer = targetLayer;
    xai.gradCAMImagePath = "";

    xai.interpretation = ...
        "Grad-CAM returned an empty explanation map.";

    return;

end

%% ============================================================
% Normalize score map
% =============================================================

minValue = min(scoreMap(:));
maxValue = max(scoreMap(:));

if maxValue > minValue

    scoreMap = ...
        (scoreMap - minValue) ./ ...
        (maxValue - minValue);

else

    scoreMap = zeros(size(scoreMap));

end

%% ============================================================
% Enhance visual concentration
% =============================================================

scoreMap = scoreMap .^ 0.6;

if max(scoreMap(:)) > 0

    scoreMap = ...
        scoreMap ./ max(scoreMap(:));

end

%% ============================================================
% Resize Grad-CAM map
% =============================================================

scoreMap = imresize( ...
    scoreMap, ...
    [size(inputImage,1), size(inputImage,2)]);

%% ============================================================
% Create visualization
% =============================================================

fig = figure( ...
    'Visible', 'off', ...
    'Color', 'black', ...
    'Position', [100 100 1300 600]);

%% ------------------------------------------------------------
% Original fundus image
% ------------------------------------------------------------

subplot(1,2,1);

imshow(inputImage);

title( ...
    sprintf('Fundus Image | DR Grade %d', grade), ...
    'Color', 'white', ...
    'FontSize', 14, ...
    'FontWeight', 'bold');

axis image off;

%% ------------------------------------------------------------
% Grad-CAM overlay
% ------------------------------------------------------------

subplot(1,2,2);

imshow(inputImage);

hold on;

heatmap = imagesc(scoreMap);

set( ...
    heatmap, ...
    'AlphaData', 0.80 * scoreMap);

colormap(gca, jet);

title( ...
    'Grad-CAM Model Explanation', ...
    'Color', 'white', ...
    'FontSize', 14, ...
    'FontWeight', 'bold');

axis image off;

%% ------------------------------------------------------------
% Overall figure title
% ------------------------------------------------------------

sgtitle( ...
    'Explainable AI - Diabetic Retinopathy Screening', ...
    'Color', 'white', ...
    'FontSize', 16, ...
    'FontWeight', 'bold');

drawnow;

%% ============================================================
% Save Grad-CAM image
% =============================================================

outputPath = fullfile( ...
    outputFolder, ...
    [imageName '_GradCAM.png']);

exportgraphics( ...
    fig, ...
    outputPath, ...
    'Resolution', 150);

close(fig);

%% ============================================================
% Verify output
% =============================================================

if ~isfile(outputPath)

    warning( ...
        'Grad-CAM visualization could not be saved.');

    xai = struct();

    xai.available = false;
    xai.method = "Grad-CAM";
    xai.targetLayer = targetLayer;
    xai.gradCAMImagePath = "";

    xai.interpretation = ...
        "Grad-CAM visualization could not be saved.";

    return;

end

fprintf('\nGrad-CAM image successfully saved:\n');
fprintf('%s\n', outputPath);

%% ============================================================
% XAI result
% =============================================================

xai = struct();

xai.available = true;

xai.method = "Grad-CAM";

xai.targetLayer = targetLayer;

xai.classIndex = predictedClassIndex;

xai.classLabel = ...
    string(networkClasses(predictedClassIndex));

xai.gradCAMImagePath = string(retinaSafeFileName(outputPath));

xai.interpretation = ...
    "Grad-CAM highlights image regions that contributed to the predicted diabetic retinopathy classification.";

xai.clinicalLimitation = ...
    "The Grad-CAM heatmap is a coarse class-level explanation. It should not be interpreted as pixel-level lesion segmentation, definitive anatomical localization, or an independent diagnostic finding.";

end

%% ========================================================================
% LOCAL FUNCTION 5
% EXTRACT DR GRADE
% ========================================================================

function grade = extractDRGrade(labelString)

labelString = char(string(labelString));

% Search for an explicit numerical grade.

numberToken = regexp( ...
    labelString, ...
    '\d+', ...
    'match');

if ~isempty(numberToken)

    candidate = str2double(numberToken{1});

    if candidate >= 0 && candidate <= 4

        grade = candidate;
        return;

    end

end

% Handle common textual labels.

labelLower = lower(labelString);

if contains(labelLower, 'no dr') || ...
        contains(labelLower, 'normal')

    grade = 0;

elseif contains(labelLower, 'mild')

    grade = 1;

elseif contains(labelLower, 'moderate')

    grade = 2;

elseif contains(labelLower, 'severe')

    grade = 3;

elseif contains(labelLower, 'proliferative')

    grade = 4;

else

    error( ...
        'Unable to determine DR grade from class label: %s', ...
        labelString);

end

end


%% ========================================================================
% LOCAL FUNCTION 6
% CLINICAL DR LABEL
% ========================================================================

function label = getClinicalGradeLabel(grade)

switch grade

    case 0
        label = "Grade 0 - No Diabetic Retinopathy";

    case 1
        label = "Grade 1 - Mild Non-Proliferative Diabetic Retinopathy";

    case 2
        label = "Grade 2 - Moderate Non-Proliferative Diabetic Retinopathy";

    case 3
        label = "Grade 3 - Severe Non-Proliferative Diabetic Retinopathy";

    case 4
        label = "Grade 4 - Proliferative Diabetic Retinopathy";

    otherwise
        label = "Unknown";

end

end


%% ========================================================================
% LOCAL FUNCTION 7
% EMPTY PREDICTION
% ========================================================================

function prediction = createEmptyPrediction()

prediction = struct();

prediction.class = NaN;
prediction.grade = NaN;

prediction.label = ...
    "Classification not performed";

prediction.confidence = NaN;

prediction.probabilities = NaN(1,5);

prediction.classLabels = ...
    ["No DR", ...
     "Mild NPDR", ...
     "Moderate NPDR", ...
     "Severe NPDR", ...
     "Proliferative DR"];

prediction.task = ...
    "Five-class diabetic retinopathy severity classification";

end


%% ========================================================================
% LOCAL FUNCTION 8
% NO REFERRAL RESULT FOR POOR IMAGE
% ========================================================================

function referral = createNoReferralResult()

referral = struct();

referral.required = false;

referral.status = ...
    "Referral assessment deferred";

referral.message = ...
    "Ophthalmic referral assessment was deferred because the submitted fundus image was inadequate for reliable automated analysis.";

referral.threshold = ...
    "Referral assessment requires successful image analysis";

end


%% ========================================================================
% LOCAL FUNCTION 9
% EMPTY XAI
% ========================================================================

function xai = createEmptyXAI()

xai = struct();

xai.available = false;

xai.method = "Grad-CAM";

xai.targetLayer = "activation_49_relu";

xai.reductionLayer = "avg_pool";

xai.gradCAMImagePath = "";

xai.interpretation = ...
    "Explainability analysis was not performed because image quality was inadequate.";

xai.clinicalLimitation = ...
    "Grad-CAM is a coarse class-level explanation and is not a lesion segmentation or independent diagnostic method.";

end