%% S08_clinical_XAI_validation.m
% Clinical XAI Validation using IDRiD
% SIH 26038 - Explainable AI for Diabetic Retinopathy Screening
%
% Purpose:
%   Validate whether Grad-CAM attention overlaps with clinically
%   annotated retinal lesion regions in the IDRiD dataset.
%
% Important:
%   Optic Disc (OD) is excluded from the pathology overlap metric
%   because it is an anatomical structure, not a DR lesion.
%
% Metrics:
%   1. Lesion Coverage
%   2. Attention Precision
%   3. IoU
%
% This validates spatial correspondence of the explanation.
% It does NOT constitute lesion detection or medical diagnosis.

clear;
clc;
close all;

%% ================================================================
% 1. PROJECT PATHS
% ================================================================

projectRoot = ...
    'C:\Users\Aditya\OneDrive\Documents\MATLAB\DR FOLDER IMP\DATASETS\SIH26038_NEW';

modelPath = fullfile( ...
    projectRoot, ...
    'models', ...
    'DR_ResNet50_SIH26038.mat');

idridImageFolder = fullfile( ...
    projectRoot, ...
    'data', ...
    'IDRiD', ...
    'images');

idridSegFolder = fullfile( ...
    projectRoot, ...
    'data', ...
    'IDRiD', ...
    'segmentation');

outputGradCAM = fullfile( ...
    projectRoot, ...
    'output', ...
    'gradcam');

outputReport = fullfile( ...
    projectRoot, ...
    'output', ...
    'reports');

if ~exist(outputGradCAM, 'dir')
    mkdir(outputGradCAM);
end

if ~exist(outputReport, 'dir')
    mkdir(outputReport);
end

%% ================================================================
% 2. LOAD MODEL
% ================================================================

fprintf('\n============================================================\n');
fprintf('       SIH 26038 - CLINICAL XAI VALIDATION\n');
fprintf('============================================================\n');

fprintf('\nLoading trained DR model...\n');

if ~isfile(modelPath)
    error(['Model not found:' newline modelPath]);
end

load(modelPath, 'trainedNet', 'classNames');

fprintf('Model loaded successfully.\n');
fprintf('Model: ResNet-50\n');

%% ================================================================
% 3. IDRiD TESTING IMAGES
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('IDRiD DATASET\n');
fprintf('------------------------------------------------------------\n');

allImages = dir(fullfile(idridImageFolder, '*.jpg'));

if isempty(allImages)
    error(['No IDRiD JPG images found in:' newline idridImageFolder]);
end

% We use five controlled IDRiD testing images.
% These correspond to the images used in the previous S04 validation.
targetNames = {
    'IDRiD_55.jpg'
    'IDRiD_56.jpg'
    'IDRiD_57.jpg'
    'IDRiD_58.jpg'
    'IDRiD_59.jpg'
};

fprintf('Selected IDRiD images:\n');

for i = 1:numel(targetNames)
    fprintf('  %s\n', targetNames{i});
end

%% ================================================================
% 4. MODEL LAYERS
% ================================================================

targetLayer = 'activation_49_relu';
reductionLayer = 'avg_pool';

fprintf('\nGrad-CAM Feature Layer   : %s\n', targetLayer);
fprintf('Grad-CAM Reduction Layer : %s\n', reductionLayer);

%% ================================================================
% 5. RESULTS STRUCTURE
% ================================================================

numImages = numel(targetNames);

results = struct( ...
    'imageName', cell(numImages,1), ...
    'predictedGrade', cell(numImages,1), ...
    'severity', cell(numImages,1), ...
    'confidence', cell(numImages,1), ...
    'lesionTypes', cell(numImages,1), ...
    'numberOfMasks', cell(numImages,1), ...
    'lesionCoverage', cell(numImages,1), ...
    'attentionPrecision', cell(numImages,1), ...
    'IoU', cell(numImages,1), ...
    'gradCAMPath', cell(numImages,1));

%% ================================================================
% 6. SEVERITY NAMES
% ================================================================

severityNames = [
    "No DR"
    "Mild DR"
    "Moderate DR"
    "Severe DR"
    "Proliferative DR"
];

%% ================================================================
% 7. PROCESS EACH IDRiD IMAGE
% ================================================================

for imageNumber = 1:numImages

    imageName = targetNames{imageNumber};

    fprintf('\n============================================================\n');
    fprintf('IMAGE %d / %d : %s\n', ...
        imageNumber, numImages, imageName);
    fprintf('============================================================\n');

    imagePath = fullfile(idridImageFolder, imageName);

    if ~isfile(imagePath)
        warning('Image not found: %s', imagePath);
        continue;
    end

    %% ------------------------------------------------------------
    % 7.1 READ IMAGE
    % ------------------------------------------------------------

    I = imread(imagePath);

    if size(I,3) == 1
        I = repmat(I, [1 1 3]);
    end

    if ~isa(I, 'uint8')
        I = im2uint8(I);
    end

    %% ------------------------------------------------------------
    % 7.2 PREPARE MODEL IMAGE
    % ------------------------------------------------------------

    modelImage = imresize(I, [224 224]);

    %% ------------------------------------------------------------
    % 7.3 CLASSIFY
    % ------------------------------------------------------------

    [predictedLabel, scores] = classify( ...
        trainedNet, ...
        modelImage);

    predictedIndex = find(classNames == predictedLabel);

    if isempty(predictedIndex)
        error('Could not determine predicted class.');
    end

    predictedGrade = ...
        str2double(string(predictedLabel));

    confidence = scores(predictedIndex);

    severity = severityNames(predictedGrade + 1);

    fprintf('\nPrediction:\n');
    fprintf('Grade       : %d\n', predictedGrade);
    fprintf('Severity    : %s\n', severity);
    fprintf('Confidence  : %.2f %%\n', confidence * 100);

    %% ------------------------------------------------------------
    % 7.4 GENERATE GRAD-CAM
    % ------------------------------------------------------------

    fprintf('\nGenerating Grad-CAM...\n');

    scoreMap = gradCAM( ...
        trainedNet, ...
        modelImage, ...
        predictedLabel, ...
        'ReductionLayer', reductionLayer, ...
        'FeatureLayer', targetLayer);

    %% ------------------------------------------------------------
    % 7.5 CONVERT GRAD-CAM TO NUMERIC MAP
    % ------------------------------------------------------------

    if isa(scoreMap, 'dlarray')
        scoreMap = extractdata(scoreMap);
    end

    scoreMap = double(scoreMap);

    scoreMap = squeeze(scoreMap);

    scoreMap = real(scoreMap);

    scoreMap(~isfinite(scoreMap)) = 0;

    minValue = min(scoreMap(:));
    maxValue = max(scoreMap(:));

    if maxValue > minValue

        scoreMap = ...
            (scoreMap - minValue) / ...
            (maxValue - minValue);

    else

        scoreMap = zeros(size(scoreMap));

    end

    % Improve visibility
    scoreMap = scoreMap .^ 0.6;

    %% ------------------------------------------------------------
    % 7.6 LOAD IDRiD LESION MASKS
    % ------------------------------------------------------------

    [~, baseName, ~] = fileparts(imageName);

    fprintf('\nSearching for lesion annotations...\n');

    lesionMask = false(size(I,1), size(I,2));

    lesionTypes = {};
    maskCount = 0;

    % ------------------------------------------------------------
    % Microaneurysms
    % ------------------------------------------------------------

    maFile = fullfile( ...
        idridSegFolder, ...
        'testing', ...
        'Microaneurysms', ...
        [baseName '_MA.tif']);

    if isfile(maFile)

        mask = imread(maFile);

        if size(mask,3) > 1
            mask = mask(:,:,1);
        end

        mask = mask > 0;

        if ~isequal(size(mask), size(lesionMask))
            mask = imresize( ...
                mask, ...
                size(lesionMask), ...
                'nearest');
        end

        lesionMask = lesionMask | mask;

        lesionTypes{end+1} = 'Microaneurysms';
        maskCount = maskCount + 1;

        fprintf('  Microaneurysms : FOUND\n');

    else

        fprintf('  Microaneurysms : not available\n');

    end

    % ------------------------------------------------------------
    % Haemorrhages
    % ------------------------------------------------------------

    heFile = fullfile( ...
        idridSegFolder, ...
        'testing', ...
        'Haemorrhages', ...
        [baseName '_HE.tif']);

    if isfile(heFile)

        mask = imread(heFile);

        if size(mask,3) > 1
            mask = mask(:,:,1);
        end

        mask = mask > 0;

        if ~isequal(size(mask), size(lesionMask))
            mask = imresize( ...
                mask, ...
                size(lesionMask), ...
                'nearest');
        end

        lesionMask = lesionMask | mask;

        lesionTypes{end+1} = 'Haemorrhages';
        maskCount = maskCount + 1;

        fprintf('  Haemorrhages    : FOUND\n');

    else

        fprintf('  Haemorrhages    : not available\n');

    end

    % ------------------------------------------------------------
    % Hard Exudates
    % ------------------------------------------------------------

    exFile = fullfile( ...
        idridSegFolder, ...
        'testing', ...
        'Hard Exudates', ...
        [baseName '_EX.tif']);

    if isfile(exFile)

        mask = imread(exFile);

        if size(mask,3) > 1
            mask = mask(:,:,1);
        end

        mask = mask > 0;

        if ~isequal(size(mask), size(lesionMask))
            mask = imresize( ...
                mask, ...
                size(lesionMask), ...
                'nearest');
        end

        lesionMask = lesionMask | mask;

        lesionTypes{end+1} = 'Hard Exudates';
        maskCount = maskCount + 1;

        fprintf('  Hard Exudates   : FOUND\n');

    else

        fprintf('  Hard Exudates   : not available\n');

    end

    % ------------------------------------------------------------
    % Soft Exudates
    % ------------------------------------------------------------

    seFile = fullfile( ...
        idridSegFolder, ...
        'testing', ...
        'Soft Exudates', ...
        [baseName '_SE.tif']);

    if isfile(seFile)

        mask = imread(seFile);

        if size(mask,3) > 1
            mask = mask(:,:,1);
        end

        mask = mask > 0;

        if ~isequal(size(mask), size(lesionMask))
            mask = imresize( ...
                mask, ...
                size(lesionMask), ...
                'nearest');
        end

        lesionMask = lesionMask | mask;

        lesionTypes{end+1} = 'Soft Exudates';
        maskCount = maskCount + 1;

        fprintf('  Soft Exudates   : FOUND\n');

    else

        fprintf('  Soft Exudates   : not available\n');

    end

    % IMPORTANT:
    % Optic Disc is deliberately NOT included.
    fprintf('  Optic Disc      : EXCLUDED from pathology metric\n');

    %% ------------------------------------------------------------
    % 7.7 CHECK MASK AVAILABILITY
    % ------------------------------------------------------------

    if maskCount == 0

        warning( ...
            'No pathology masks found for %s.', ...
            imageName);

        results(imageNumber).imageName = imageName;
        results(imageNumber).predictedGrade = predictedGrade;
        results(imageNumber).severity = char(severity);
        results(imageNumber).confidence = confidence;
        results(imageNumber).lesionTypes = {};
        results(imageNumber).numberOfMasks = 0;
        results(imageNumber).lesionCoverage = NaN;
        results(imageNumber).attentionPrecision = NaN;
        results(imageNumber).IoU = NaN;
        results(imageNumber).gradCAMPath = '';

        continue;

    end

    %% ------------------------------------------------------------
    % 7.8 RESIZE GRAD-CAM TO ORIGINAL IMAGE SIZE
    % ------------------------------------------------------------

    scoreMapFull = imresize( ...
        scoreMap, ...
        [size(I,1) size(I,2)], ...
        'bilinear');

    scoreMapFull = mat2gray(scoreMapFull);

    %% ------------------------------------------------------------
    % 7.9 CREATE ATTENTION MASK
    % ------------------------------------------------------------

    % Select the strongest 20% of Grad-CAM activation.
    attentionThreshold = ...
        prctile(scoreMapFull(:), 80);

    attentionMask = ...
        scoreMapFull >= attentionThreshold;

    %% ------------------------------------------------------------
    % 7.10 CALCULATE METRICS
    % ------------------------------------------------------------

    totalLesionPixels = nnz(lesionMask);

    totalAttentionPixels = nnz(attentionMask);

    overlapPixels = nnz( ...
        attentionMask & lesionMask);

    unionPixels = nnz( ...
        attentionMask | lesionMask);

    % Lesion coverage:
    % percentage of annotated lesion pixels receiving attention
    if totalLesionPixels > 0

        lesionCoverage = ...
            100 * overlapPixels / totalLesionPixels;

    else

        lesionCoverage = NaN;

    end

    % Attention precision:
    % percentage of highlighted attention pixels overlapping lesions
    if totalAttentionPixels > 0

        attentionPrecision = ...
            100 * overlapPixels / totalAttentionPixels;

    else

        attentionPrecision = NaN;

    end

    % Intersection over Union
    if unionPixels > 0

        IoU = ...
            overlapPixels / unionPixels;

    else

        IoU = NaN;

    end

    %% ------------------------------------------------------------
    % 7.11 DISPLAY METRICS
    % ------------------------------------------------------------

    fprintf('\nClinical XAI Metrics:\n');

    fprintf('Number of lesion masks : %d\n', maskCount);

    fprintf('Lesion Coverage        : %.2f %%\n', ...
        lesionCoverage);

    fprintf('Attention Precision    : %.2f %%\n', ...
        attentionPrecision);

    fprintf('IoU                    : %.4f\n', ...
        IoU);

    %% ------------------------------------------------------------
    % 7.12 CREATE VALIDATION VISUALIZATION
    % ------------------------------------------------------------

    fprintf('\nCreating validation visualization...\n');

    figure( ...
        'Visible', 'off', ...
        'Color', 'k', ...
        'Position', [100 100 1600 800]);

    % ------------------------------------------------------------
    % Original
    % ------------------------------------------------------------

    subplot(1,3,1);

    imshow(I);

    title( ...
        sprintf( ...
        'IDRiD Input\nGrade %d - %s', ...
        predictedGrade, ...
        severity), ...
        'Color', 'w', ...
        'FontSize', 13, ...
        'FontWeight', 'bold');

    % ------------------------------------------------------------
    % Grad-CAM
    % ------------------------------------------------------------

    subplot(1,3,2);

    imshow(I);

    hold on;

    h = imagesc(scoreMapFull);

    h.AlphaData = 0.80 * scoreMapFull;

    colormap jet;

    title( ...
        'Grad-CAM Attention', ...
        'Color', 'w', ...
        'FontSize', 13, ...
        'FontWeight', 'bold');

    axis image off;

    hold off;

    % ------------------------------------------------------------
    % Lesion Mask + Attention
    % ------------------------------------------------------------

    subplot(1,3,3);

    imshow(I);

    hold on;

    % Lesion boundary
    lesionBoundary = bwperim(lesionMask);

    boundaryRGB = zeros( ...
        size(lesionBoundary,1), ...
        size(lesionBoundary,2), ...
        3);

    boundaryRGB(:,:,1) = lesionBoundary;

    hBoundary = imshow(boundaryRGB);

    hBoundary.AlphaData = 0.95 * lesionBoundary;

    % Grad-CAM attention
    hAttention = imagesc(scoreMapFull);

    hAttention.AlphaData = ...
        0.45 * scoreMapFull;

    title( ...
        sprintf( ...
        'Clinical XAI Validation\nCoverage %.2f%% | IoU %.4f', ...
        lesionCoverage, ...
        IoU), ...
        'Color', 'w', ...
        'FontSize', 12, ...
        'FontWeight', 'bold');

    axis image off;

    hold off;

    %% ------------------------------------------------------------
    % 7.13 SAVE VISUALIZATION
    % ------------------------------------------------------------

    validationFile = fullfile( ...
        outputGradCAM, ...
        [baseName '_Clinical_XAI_Validation.png']);

    exportgraphics( ...
        gcf, ...
        validationFile, ...
        'Resolution', 200);

    close(gcf);

    fprintf('\nValidation visualization saved:\n%s\n', ...
        validationFile);

    %% ------------------------------------------------------------
    % 7.14 STORE RESULTS
    % ------------------------------------------------------------

    results(imageNumber).imageName = imageName;

    results(imageNumber).predictedGrade = ...
        predictedGrade;

    results(imageNumber).severity = ...
        char(severity);

    results(imageNumber).confidence = ...
        confidence;

    results(imageNumber).lesionTypes = ...
        lesionTypes;

    results(imageNumber).numberOfMasks = ...
        maskCount;

    results(imageNumber).lesionCoverage = ...
        lesionCoverage;

    results(imageNumber).attentionPrecision = ...
        attentionPrecision;

    results(imageNumber).IoU = ...
        IoU;

    results(imageNumber).gradCAMPath = ...
        validationFile;

end

%% ================================================================
% 8. CALCULATE OVERALL RESULTS
% ================================================================

fprintf('\n\n============================================================\n');
fprintf('             OVERALL CLINICAL XAI RESULTS\n');
fprintf('============================================================\n');

coverageValues = [results.lesionCoverage];

precisionValues = [results.attentionPrecision];

IoUValues = [results.IoU];

validCoverage = coverageValues(~isnan(coverageValues));
validPrecision = precisionValues(~isnan(precisionValues));
validIoU = IoUValues(~isnan(IoUValues));

if ~isempty(validCoverage)

    meanCoverage = mean(validCoverage);

else

    meanCoverage = NaN;

end

if ~isempty(validPrecision)

    meanPrecision = mean(validPrecision);

else

    meanPrecision = NaN;

end

if ~isempty(validIoU)

    meanIoU = mean(validIoU);

else

    meanIoU = NaN;

end

%% ================================================================
% 9. DISPLAY PER-IMAGE SUMMARY
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('PER-IMAGE SUMMARY\n');
fprintf('------------------------------------------------------------\n');

fprintf( ...
    '%-14s %-8s %-12s %-15s %-10s\n', ...
    'Image', ...
    'Grade', ...
    'Coverage', ...
    'Attention', ...
    'IoU');

fprintf( ...
    '%-14s %-8s %-12s %-15s %-10s\n', ...
    '------', ...
    '-----', ...
    '--------', ...
    '---------', ...
    '---');

for i = 1:numImages

    if isempty(results(i).imageName)
        continue;
    end

    fprintf( ...
        '%-14s %-8d %-12.2f %-15.2f %-10.4f\n', ...
        results(i).imageName, ...
        results(i).predictedGrade, ...
        results(i).lesionCoverage, ...
        results(i).attentionPrecision, ...
        results(i).IoU);

end

%% ================================================================
% 10. OVERALL METRICS
% ================================================================

fprintf('\n------------------------------------------------------------\n');
fprintf('AVERAGE METRICS\n');
fprintf('------------------------------------------------------------\n');

fprintf( ...
    'Mean Lesion Coverage     : %.2f %%\n', ...
    meanCoverage);

fprintf( ...
    'Mean Attention Precision : %.2f %%\n', ...
    meanPrecision);

fprintf( ...
    'Mean IoU                 : %.4f\n', ...
    meanIoU);

%% ================================================================
% 11. SAVE FINAL REPORT
% ================================================================

report = struct();

report.dataset = ...
    'IDRiD';

report.validationPurpose = ...
    ['Evaluate spatial correspondence between Grad-CAM ' ...
     'attention and annotated retinal lesion regions.'];

report.modelName = ...
    'ResNet-50';

report.featureLayer = ...
    targetLayer;

report.reductionLayer = ...
    reductionLayer;

report.attentionThresholdPercentile = ...
    80;

report.excludedMask = ...
    'Optic Disc';

report.results = ...
    results;

report.meanLesionCoverage = ...
    meanCoverage;

report.meanAttentionPrecision = ...
    meanPrecision;

report.meanIoU = ...
    meanIoU;

report.interpretation = ...
    ['Grad-CAM spatial correspondence was evaluated against ' ...
     'IDRiD annotated retinal lesion regions. These metrics ' ...
     'measure explanation-region overlap and should not be ' ...
     'interpreted as lesion detection accuracy or medical diagnosis.'];

report.disclaimer = ...
    'AI screening prototype only. This result is not a medical diagnosis.';

reportFile = fullfile( ...
    outputReport, ...
    'S08_clinical_XAI_validation.mat');

save( ...
    reportFile, ...
    'report');

%% ================================================================
% 12. FINAL OUTPUT
% ================================================================

fprintf('\n============================================================\n');
fprintf('       S08 CLINICAL XAI VALIDATION COMPLETED\n');
fprintf('============================================================\n');

fprintf('\nDataset              : IDRiD\n');
fprintf('Images evaluated     : %d\n', numImages);

fprintf('\nMean Lesion Coverage : %.2f %%\n', ...
    meanCoverage);

fprintf('Mean Attention       : %.2f %%\n', ...
    meanPrecision);

fprintf('Mean IoU             : %.4f\n', ...
    meanIoU);

fprintf('\nOptic Disc           : EXCLUDED from pathology metric\n');

fprintf('\nReport saved to:\n%s\n', ...
    reportFile);

fprintf('\n------------------------------------------------------------\n');
fprintf('XAI INTERPRETATION\n');
fprintf('------------------------------------------------------------\n');

fprintf('%s\n', report.interpretation);

fprintf('\nDISCLAIMER:\n');
fprintf('%s\n', report.disclaimer);

fprintf('\n============================================================\n');