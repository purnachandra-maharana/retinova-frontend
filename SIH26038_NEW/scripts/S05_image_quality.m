
%% S05 v2 - Fundus Image Quality Assessment + CLAHE
% SIH 26038 - Explainable AI for Diabetic Retinopathy Screening
%
% Workflow:
%   Fundus Image
%       |
%       v
%   Image Quality Assessment
%       |
%       +---- >= 70 ------> GOOD ------> Original Image
%       |
%       +---- 50-69.99 ---> BORDERLINE -> CLAHE Enhancement
%       |
%       +---- < 50 -------> POOR ------> STOP + RECAPTURE
%
% IMPORTANT:
%   This is an engineering image-quality screening module.
%   It is NOT a medical diagnosis.

clear;
clc;
close all;

fprintf('\n');
fprintf('============================================================\n');
fprintf(' SIH 26038 - FUNDUS IMAGE QUALITY + CLAHE\n');
fprintf('============================================================\n\n');

%% 1. PROJECT PATHS

projectRoot = ...
    'C:\Users\Aditya\OneDrive\Documents\MATLAB\DR FOLDER IMP\DATASETS\SIH26038_NEW';

testImageFolder = fullfile( ...
    projectRoot, 'test_images');

outputFolder = fullfile( ...
    projectRoot, 'output', 'reports');

enhancedFolder = fullfile( ...
    projectRoot, 'output', 'enhanced');

%% 2. CREATE OUTPUT FOLDERS

if ~exist(outputFolder, 'dir')
    mkdir(outputFolder);
end

if ~exist(enhancedFolder, 'dir')
    mkdir(enhancedFolder);
end

%% 3. FIND TEST IMAGES

imageFiles = dir(fullfile(testImageFolder, '*.*'));

validExtensions = { ...
    '.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff'};

validFiles = [];

for i = 1:numel(imageFiles)

    if imageFiles(i).isdir
        continue;
    end

    [~,~,ext] = fileparts(imageFiles(i).name);

    if any(strcmpi(ext, validExtensions))
        validFiles = [validFiles; imageFiles(i)]; %#ok<AGROW>
    end

end

if isempty(validFiles)

    fprintf('No test images found in:\n%s\n\n', ...
        testImageFolder);

    fprintf('Place one or more fundus images inside:\n');
    fprintf('%s\n\n', testImageFolder);

    return;

end

fprintf('Test images found: %d\n\n', ...
    numel(validFiles));

%% 4. QUALITY THRESHOLDS

goodThreshold = 70;
borderlineThreshold = 50;

fprintf('Quality thresholds:\n');
fprintf('  GOOD       : >= %.2f\n', goodThreshold);
fprintf('  BORDERLINE : %.2f - %.2f\n', ...
    borderlineThreshold, goodThreshold - 0.01);
fprintf('  POOR       : < %.2f\n\n', borderlineThreshold);

%% 5. RESULT STORAGE

numImages = numel(validFiles);

qualityResult = struct();

qualityResult.imageName = strings(numImages,1);

qualityResult.brightness = zeros(numImages,1);
qualityResult.contrast = zeros(numImages,1);
qualityResult.sharpness = zeros(numImages,1);
qualityResult.saturation = zeros(numImages,1);
qualityResult.retinalCoverage = zeros(numImages,1);

qualityResult.brightnessScore = zeros(numImages,1);
qualityResult.contrastScore = zeros(numImages,1);
qualityResult.sharpnessScore = zeros(numImages,1);
qualityResult.saturationScore = zeros(numImages,1);
qualityResult.retinalCoverageScore = zeros(numImages,1);

qualityResult.qualityScore = zeros(numImages,1);
qualityResult.qualityStatus = strings(numImages,1);

qualityResult.enhancementRequired = false(numImages,1);
qualityResult.enhancementMethod = strings(numImages,1);

qualityResult.classificationAllowed = false(numImages,1);

qualityResult.processedImagePath = strings(numImages,1);
qualityResult.feedback = strings(numImages,1);

%% 6. PROCESS EACH IMAGE

for k = 1:numImages

    fprintf('\n');
    fprintf('------------------------------------------------------------\n');
    fprintf('Image %d of %d\n', k, numImages);
    fprintf('------------------------------------------------------------\n');

    imagePath = fullfile( ...
        validFiles(k).folder, ...
        validFiles(k).name);

    fprintf('Image: %s\n', ...
        validFiles(k).name);

    %% Read image

    I = imread(imagePath);

    if size(I,3) == 1
        I = repmat(I,[1 1 3]);
    end

    I = im2double(I);

    qualityResult.imageName(k) = ...
        string(validFiles(k).name);

    %% ---------------------------------------------------------
    % 7. BRIGHTNESS
    % ----------------------------------------------------------

    grayImage = rgb2gray(I);

    brightness = mean(grayImage(:));

    % Ideal brightness is approximately 0.50.
    brightnessScore = ...
        max(0, ...
        100 * (1 - abs(brightness - 0.50) / 0.50));

    %% ---------------------------------------------------------
    % 8. CONTRAST
    % ----------------------------------------------------------

    contrastValue = std(grayImage(:));

    contrastScore = ...
        min(100, max(0, ...
        (contrastValue / 0.25) * 100));

    %% ---------------------------------------------------------
    % 9. SHARPNESS
    % ----------------------------------------------------------

    laplacianKernel = ...
        [0 -1 0; ...
        -1 4 -1; ...
         0 -1 0];

    laplacianImage = ...
        imfilter( ...
        grayImage, ...
        laplacianKernel, ...
        'replicate');

    sharpnessValue = ...
        var(laplacianImage(:));

    % Sharpness normalization.
    %
    % The value is intentionally capped because different
    % cameras/resolutions can produce very different values.

    sharpnessScore = ...
        min(100, max(0, ...
        (sharpnessValue / 0.005) * 100));

    %% ---------------------------------------------------------
    % 10. SATURATION
    % ----------------------------------------------------------

    hsvImage = rgb2hsv(I);

    saturationValue = ...
        mean(hsvImage(:,:,2), 'all');

    saturationScore = ...
        min(100, max(0, ...
        (saturationValue / 0.50) * 100));

    %% ---------------------------------------------------------
    % 11. RETINAL COVERAGE
    % ----------------------------------------------------------

    intensityImage = grayImage;

    retinalMask = ...
        intensityImage > 0.05;

    retinalMask = ...
        bwareaopen(retinalMask, 500);

    retinalCoverageValue = ...
        nnz(retinalMask) / numel(retinalMask);

    retinalCoverageScore = ...
        min(100, max(0, ...
        retinalCoverageValue / 0.50 * 100));

    %% ---------------------------------------------------------
    % 12. WEIGHTED QUALITY SCORE
    % ----------------------------------------------------------

    % Brightness       = 20%
    % Contrast         = 20%
    % Sharpness        = 25%
    % Saturation       = 10%
    % Retinal coverage = 25%

    qualityScore = ...
        0.20 * brightnessScore + ...
        0.20 * contrastScore + ...
        0.25 * sharpnessScore + ...
        0.10 * saturationScore + ...
        0.25 * retinalCoverageScore;

    %% Store raw metrics

    qualityResult.brightness(k) = brightness;
    qualityResult.contrast(k) = contrastValue;
    qualityResult.sharpness(k) = sharpnessValue;
    qualityResult.saturation(k) = saturationValue;
    qualityResult.retinalCoverage(k) = ...
        retinalCoverageValue;

    qualityResult.brightnessScore(k) = ...
        brightnessScore;

    qualityResult.contrastScore(k) = ...
        contrastScore;

    qualityResult.sharpnessScore(k) = ...
        sharpnessScore;

    qualityResult.saturationScore(k) = ...
        saturationScore;

    qualityResult.retinalCoverageScore(k) = ...
        retinalCoverageScore;

    qualityResult.qualityScore(k) = ...
        qualityScore;

    %% ---------------------------------------------------------
    % 13. QUALITY DECISION
    % ----------------------------------------------------------

    if qualityScore >= goodThreshold

        %% GOOD IMAGE

        qualityStatus = "GOOD";

        enhancementRequired = false;

        enhancementMethod = "NONE";

        classificationAllowed = true;

        processedImagePath = string(imagePath);

        feedback = ...
            "Image quality is good. Original image can be used for AI screening.";

        fprintf('\n');
        fprintf('QUALITY DECISION: GOOD\n');
        fprintf('Action: Use original image.\n');

    elseif qualityScore >= borderlineThreshold

        %% BORDERLINE IMAGE

        qualityStatus = "BORDERLINE";

        enhancementRequired = true;

        enhancementMethod = "CLAHE";

        classificationAllowed = true;

        fprintf('\n');
        fprintf('QUALITY DECISION: BORDERLINE\n');
        fprintf('Action: Apply CLAHE enhancement.\n');

        %% -----------------------------------------------------
        % 14. CLAHE ENHANCEMENT
        % ------------------------------------------------------

        fprintf('Applying LAB + CLAHE enhancement...\n');

        % Convert RGB image to LAB.
        labImage = rgb2lab(I);

        % L channel contains luminance information.
        L = labImage(:,:,1);

        % Convert L channel to [0,1].
        Lnormalized = L / 100;

        % Apply CLAHE only to luminance.
        Lclahe = adapthisteq( ...
            Lnormalized, ...
            'NumTiles', [8 8], ...
            'ClipLimit', 0.01, ...
            'Distribution', 'rayleigh');

        % Convert enhanced L channel back to LAB range.
        labImage(:,:,1) = Lclahe * 100;

        % Convert back to RGB.
        enhancedImage = lab2rgb(labImage);

        % Ensure valid range.
        enhancedImage = ...
            min(max(enhancedImage,0),1);

        %% Save enhanced image

        [~,baseName,~] = ...
            fileparts(validFiles(k).name);

        enhancedFileName = ...
            sprintf('%s_CLAHE.png', baseName);

        enhancedPath = fullfile( ...
            enhancedFolder, ...
            enhancedFileName);

        imwrite( ...
            enhancedImage, ...
            enhancedPath);

        processedImagePath = ...
            string(enhancedPath);

        feedback = ...
            "Image is borderline. CLAHE enhancement applied before AI screening.";

        fprintf('CLAHE enhancement completed.\n');

        fprintf('Enhanced image saved:\n%s\n', ...
            enhancedPath);

    else

        %% POOR IMAGE

        qualityStatus = "POOR";

        enhancementRequired = false;

        enhancementMethod = "NONE";

        classificationAllowed = false;

        processedImagePath = "";

        feedback = ...
            "Image quality is poor. Please recapture the fundus image before AI screening.";

        fprintf('\n');
        fprintf('QUALITY DECISION: POOR\n');
        fprintf('Action: STOP classification.\n');

        fprintf('\n');
        fprintf('============================================================\n');
        fprintf(' RECAPTURE REQUIRED\n');
        fprintf('============================================================\n');
        fprintf('The fundus image quality is insufficient for reliable\n');
        fprintf('AI screening.\n\n');
        fprintf('Please recapture the image with:\n');
        fprintf('  - Proper focus\n');
        fprintf('  - Adequate illumination\n');
        fprintf('  - Retina properly centered\n');
        fprintf('  - Minimal blur\n');
        fprintf('  - Sufficient retinal field of view\n');
        fprintf('============================================================\n');

    end

    %% Store decision

    qualityResult.qualityStatus(k) = ...
        qualityStatus;

    qualityResult.enhancementRequired(k) = ...
        enhancementRequired;

    qualityResult.enhancementMethod(k) = ...
        enhancementMethod;

    qualityResult.classificationAllowed(k) = ...
        classificationAllowed;

    qualityResult.processedImagePath(k) = ...
        processedImagePath;

    qualityResult.feedback(k) = ...
        feedback;

    %% ---------------------------------------------------------
    % 15. DISPLAY METRICS
    % ----------------------------------------------------------

    fprintf('\n');
    fprintf('Brightness          : %.4f\n', brightness);
    fprintf('Contrast            : %.4f\n', contrastValue);
    fprintf('Sharpness           : %.6f\n', sharpnessValue);
    fprintf('Saturation          : %.4f\n', saturationValue);
    fprintf('Retinal coverage    : %.2f %%\n', ...
        retinalCoverageValue * 100);

    fprintf('\n');

    fprintf('Brightness score    : %.2f / 100\n', ...
        brightnessScore);

    fprintf('Contrast score      : %.2f / 100\n', ...
        contrastScore);

    fprintf('Sharpness score     : %.2f / 100\n', ...
        sharpnessScore);

    fprintf('Saturation score    : %.2f / 100\n', ...
        saturationScore);

    fprintf('Retinal coverage    : %.2f / 100\n', ...
        retinalCoverageScore);

    fprintf('\n');

    fprintf('--------------------------------------------\n');
    fprintf('IMAGE QUALITY SCORE : %.2f / 100\n', ...
        qualityScore);

    fprintf('QUALITY STATUS      : %s\n', ...
        qualityStatus);

    fprintf('ENHANCEMENT         : %s\n', ...
        enhancementMethod);

    fprintf('CLASSIFICATION      : %s\n', ...
        string(classificationAllowed));

    fprintf('--------------------------------------------\n');

end

%% 16. SAVE RESULTS

resultsFile = fullfile( ...
    outputFolder, ...
    'S05_image_quality_results_v2.mat');

save( ...
    resultsFile, ...
    'qualityResult', ...
    'goodThreshold', ...
    'borderlineThreshold');

%% 17. FINAL SUMMARY

fprintf('\n');
fprintf('============================================================\n');
fprintf(' S05 v2 COMPLETED\n');
fprintf('============================================================\n\n');

for k = 1:numImages

    fprintf('%s\n', ...
        qualityResult.imageName(k));

    fprintf('  Quality Score       : %.2f / 100\n', ...
        qualityResult.qualityScore(k));

    fprintf('  Status              : %s\n', ...
        qualityResult.qualityStatus(k));

    fprintf('  Enhancement         : %s\n', ...
        qualityResult.enhancementMethod(k));

    fprintf('  Classification      : %s\n', ...
        string(qualityResult.classificationAllowed(k)));

    if qualityResult.classificationAllowed(k)

        fprintf('  Processed image     : %s\n', ...
            qualityResult.processedImagePath(k));

    else

        fprintf('  Action              : RECAPTURE IMAGE\n');

    end

    fprintf('\n');

end

fprintf('Results saved to:\n%s\n\n', ...
    resultsFile);

fprintf('Enhanced images saved to:\n%s\n\n', ...
    enhancedFolder);

%% 18. FINAL DISCLAIMER

fprintf('============================================================\n');
fprintf(' SYSTEM MESSAGE\n');
fprintf('============================================================\n');
fprintf('Image quality assessment determines whether an image is\n');
fprintf('suitable for the AI screening pipeline.\n\n');

fprintf('Borderline images receive CLAHE enhancement.\n');
fprintf('Poor-quality images are rejected and require recapture.\n\n');

fprintf('This system is an AI screening prototype and NOT a\n');
fprintf('medical diagnosis.\n');

fprintf('============================================================\n');

