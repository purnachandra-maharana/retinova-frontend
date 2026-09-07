%% S04 - XAI Validation Using IDRiD Lesion Annotations
% SIH 26038 - Explainable AI for Diabetic Retinopathy Screening
%
% Purpose:
%   Validate whether Grad-CAM attention overlaps with clinically
%   annotated retinal lesion regions in the IDRiD dataset.
%
% Model:
%   ResNet-50 trained on APTOS
%
% Grad-CAM:
%   activation_49_relu
%
% Initial validation:
%   5 IDRiD testing images
%
% IMPORTANT:
%   IDRiD is used independently for XAI validation.
%   It is NOT used to train the 5-class APTOS classifier.
%
% This is an AI screening prototype and NOT a medical diagnosis.

clear;
clc;
close all;

fprintf('\n');
fprintf('============================================================\n');
fprintf(' SIH 26038 - IDRiD XAI VALIDATION\n');
fprintf(' Grad-CAM vs Retinal Lesion Annotations\n');
fprintf('============================================================\n\n');

%% 1. PROJECT PATHS

config = retinaProjectConfig();
projectRoot = config.projectRoot;

modelFile = fullfile( ...
    projectRoot, 'models', 'DR_ResNet50_SIH26038.mat');

idridRoot = fullfile( ...
    projectRoot, 'data', 'IDRiD');

imageFolder = fullfile( ...
    idridRoot, 'images');

segFolder = fullfile( ...
    idridRoot, 'segmentation');

outputFolder = fullfile( ...
    projectRoot, 'output', 'gradcam');

%% 2. CREATE OUTPUT FOLDER

if ~exist(outputFolder, 'dir')
    mkdir(outputFolder);
end

fprintf('Project root:\n%s\n\n', projectRoot);

fprintf('IDRiD image folder:\n%s\n\n', imageFolder);

fprintf('IDRiD segmentation folder:\n%s\n\n', segFolder);

%% 3. CHECK REQUIRED FILES/FOLDERS

if ~isfile(modelFile)
    error('Trained model not found:\n%s', modelFile);
end

if ~isfolder(imageFolder)
    error('IDRiD image folder not found:\n%s', imageFolder);
end

if ~isfolder(segFolder)
    error('IDRiD segmentation folder not found:\n%s', segFolder);
end

fprintf('Required files and folders found successfully.\n\n');

%% 4. LOAD TRAINED MODEL

fprintf('Loading trained ResNet-50...\n');

load(modelFile, ...
    'trainedNet', ...
    'classNames', ...
    'inputSize');

fprintf('Model loaded successfully.\n');
fprintf('Input size: %d x %d x %d\n', ...
    inputSize(1), inputSize(2), inputSize(3));

fprintf('\nClasses:\n');
disp(classNames);

%% 5. GRAD-CAM TARGET LAYER

featureLayer = 'activation_49_relu';
reductionLayer = 'avg_pool';

fprintf('Grad-CAM feature layer:\n');
fprintf('%s\n', featureLayer);

fprintf('Grad-CAM reduction layer:\n');
fprintf('%s\n\n', reductionLayer);

%% 6. FIND IDRiD TESTING IMAGES

allImages = dir(fullfile(imageFolder, '*.jpg'));

if isempty(allImages)
    error('No IDRiD JPG images found.');
end

% IDRiD testing images are IDRiD_55 through IDRiD_81.
testImageMask = false(numel(allImages), 1);

for i = 1:numel(allImages)

    imageName = allImages(i).name;

    token = regexp( ...
        imageName, ...
        'IDRiD_(\d+)', ...
        'tokens', ...
        'once');

    if ~isempty(token)

        imageNumber = str2double(token{1});

        if imageNumber >= 55 && imageNumber <= 81
            testImageMask(i) = true;
        end
    end
end

testImages = allImages(testImageMask);

fprintf('Total IDRiD images found: %d\n', ...
    numel(allImages));

fprintf('IDRiD testing images found: %d\n\n', ...
    numel(testImages));

if isempty(testImages)
    error('No IDRiD testing images were found.');
end

%% 7. SELECT FIVE TEST IMAGES

numToProcess = min(5, numel(testImages));

selectedImages = testImages(1:numToProcess);

fprintf('Selected %d IDRiD testing images for controlled XAI validation.\n\n', ...
    numToProcess);

%% 8. RESULT STORAGE

results = struct();

results.imageID = strings(numToProcess,1);
results.predictedGrade = strings(numToProcess,1);
results.confidence = zeros(numToProcess,1);

results.lesionPixelCount = zeros(numToProcess,1);
results.attentionPixelCount = zeros(numToProcess,1);
results.overlapPixelCount = zeros(numToProcess,1);

results.lesionCoverage = zeros(numToProcess,1);
results.attentionPrecision = zeros(numToProcess,1);
results.iou = zeros(numToProcess,1);

results.lesionTypes = cell(numToProcess,1);

%% 9. PROCESS EACH IMAGE

for k = 1:numToProcess

    fprintf('\n');
    fprintf('------------------------------------------------------------\n');
    fprintf('Processing IDRiD image %d of %d\n', ...
        k, numToProcess);
    fprintf('------------------------------------------------------------\n');

    imageName = selectedImages(k).name;

    imagePath = fullfile( ...
        selectedImages(k).folder, ...
        imageName);

    fprintf('Image: %s\n', imageName);

    %% Extract IDRiD image number

    token = regexp( ...
        imageName, ...
        'IDRiD_(\d+)', ...
        'tokens', ...
        'once');

    if isempty(token)
        warning('Could not extract image ID from %s.', imageName);
        continue;
    end

    imageNumber = str2double(token{1});

    imageID = sprintf('IDRiD_%02d', imageNumber);

    results.imageID(k) = imageID;

    fprintf('Image ID: %s\n', imageID);

    %% Read image

    I = imread(imagePath);

    if size(I,3) == 1
        I = repmat(I, [1 1 3]);
    end

    %% Resize for model

    modelImage = imresize( ...
        I, ...
        inputSize(1:2));

    %% Classification

    fprintf('Running DR classification...\n');

    [predictedLabel, scores] = classify( ...
        trainedNet, ...
        modelImage);

    predictedIndex = find( ...
        classNames == predictedLabel, ...
        1);

    confidence = scores(predictedIndex);

    results.predictedGrade(k) = string(predictedLabel);
    results.confidence(k) = confidence;

    fprintf('Predicted Grade: %s\n', ...
        string(predictedLabel));

    fprintf('Confidence: %.2f %%\n', ...
        confidence * 100);

    %% Grad-CAM

    fprintf('Generating Grad-CAM...\n');

    scoreMap = gradCAM( ...
        trainedNet, ...
        modelImage, ...
        predictedLabel, ...
        'ReductionLayer', reductionLayer, ...
        'FeatureLayer', featureLayer);

    %% Resize Grad-CAM to original image

    scoreMap = imresize( ...
        scoreMap, ...
        [size(I,1), size(I,2)]);

    scoreMap = mat2gray(scoreMap);

    % Increase visibility of weaker activation regions.
    scoreMap = scoreMap .^ 0.6;

    %% Determine high-attention region

    % Top 20 percent of Grad-CAM activation.
    attentionThreshold = ...
        prctile(scoreMap(:), 80);

    attentionMask = ...
        scoreMap >= attentionThreshold;

    %% Find all segmentation masks for this image

    maskFiles = dir(fullfile( ...
        segFolder, ...
        '**', ...
        [imageID, '_*.tif']));

    fprintf('Lesion masks found: %d\n', ...
        numel(maskFiles));

    combinedLesionMask = false( ...
        size(I,1), ...
        size(I,2));

    lesionTypeList = strings(0,1);

    %% Combine available lesion masks

    for m = 1:numel(maskFiles)

        maskPath = fullfile( ...
            maskFiles(m).folder, ...
            maskFiles(m).name);

        lesionMask = imread(maskPath);

        % Convert mask to logical.
        lesionMask = lesionMask > 0;

        % Resize mask to original image dimensions.
        lesionMask = imresize( ...
            lesionMask, ...
            [size(I,1), size(I,2)], ...
            'nearest');

        combinedLesionMask = ...
            combinedLesionMask | lesionMask;

        %% Determine lesion type

        maskName = maskFiles(m).name;

        if contains(maskName, '_MA', 'IgnoreCase', true)
            lesionType = "Microaneurysms";
        elseif contains(maskName, '_HE', 'IgnoreCase', true)
            lesionType = "Haemorrhages";
        elseif contains(maskName, '_EX', 'IgnoreCase', true)
            lesionType = "Hard Exudates";
        elseif contains(maskName, '_SE', 'IgnoreCase', true)
            lesionType = "Soft Exudates";
        elseif contains(maskName, '_OD', 'IgnoreCase', true)
            lesionType = "Optic Disc";
        else
            lesionType = "Other";
        end

        if ~any(lesionTypeList == lesionType)
            lesionTypeList(end+1) = lesionType; %#ok<SAGROW>
        end
    end

    results.lesionTypes{k} = lesionTypeList;

    %% Check whether lesion annotations exist

    if any(combinedLesionMask(:))

        lesionPixelCount = nnz(combinedLesionMask);

        attentionPixelCount = nnz(attentionMask);

        overlapMask = ...
            attentionMask & combinedLesionMask;

        overlapPixelCount = nnz(overlapMask);

        %% Lesion coverage:
        % Percentage of annotated lesion pixels receiving
        % high Grad-CAM attention.

        lesionCoverage = ...
            overlapPixelCount / lesionPixelCount;

        %% Attention precision:
        % Percentage of high-attention pixels lying inside
        % annotated lesion regions.

        attentionPrecision = ...
            overlapPixelCount / attentionPixelCount;

        %% IoU

        unionMask = ...
            attentionMask | combinedLesionMask;

        unionPixelCount = nnz(unionMask);

        iou = ...
            overlapPixelCount / unionPixelCount;

        results.lesionPixelCount(k) = ...
            lesionPixelCount;

        results.attentionPixelCount(k) = ...
            attentionPixelCount;

        results.overlapPixelCount(k) = ...
            overlapPixelCount;

        results.lesionCoverage(k) = ...
            lesionCoverage;

        results.attentionPrecision(k) = ...
            attentionPrecision;

        results.iou(k) = ...
            iou;

        fprintf('\nXAI overlap results:\n');

        fprintf('Lesion coverage       : %.2f %%\n', ...
            lesionCoverage * 100);

        fprintf('Attention precision   : %.2f %%\n', ...
            attentionPrecision * 100);

        fprintf('Grad-CAM / Lesion IoU : %.4f\n', ...
            iou);

    else

        fprintf('\nNo lesion annotation found for this image.\n');

        results.lesionCoverage(k) = NaN;
        results.attentionPrecision(k) = NaN;
        results.iou(k) = NaN;
    end

    %% Display lesion types

    fprintf('\nLesion annotations:\n');

    if isempty(lesionTypeList)
        fprintf('  None available\n');
    else
        for t = 1:numel(lesionTypeList)
            fprintf('  %s\n', lesionTypeList(t));
        end
    end

    %% Create visualization

    figure( ...
        'Name', ...
        sprintf('IDRiD XAI - %s', imageID), ...
        'NumberTitle', 'off', ...
        'Color', 'k', ...
        'Position', [100 100 1500 500]);

    %% Original

    subplot(1,3,1);

    imshow(I);

    title( ...
        sprintf('IDRiD %s\nPredicted Grade: %s', ...
        imageID, ...
        string(predictedLabel)), ...
        'Color', 'w', ...
        'FontSize', 12);

    %% Lesion annotations

    subplot(1,3,2);

    imshow(I);

    hold on;

    if any(combinedLesionMask(:))
        lesionDisplay = ...
            cat(3, ...
            ones(size(combinedLesionMask)), ...
            zeros(size(combinedLesionMask)), ...
            zeros(size(combinedLesionMask)));

        hLesion = imagesc(lesionDisplay);

        set(hLesion, ...
            'AlphaData', ...
            0.55 * combinedLesionMask);
    end

    axis image off;

    title( ...
        'IDRiD Lesion Annotations', ...
        'Color', 'w', ...
        'FontSize', 12);

    hold off;

    %% Grad-CAM overlay

    subplot(1,3,3);

    imshow(I);

    hold on;

    hCAM = imagesc(scoreMap);

    set(hCAM, ...
        'AlphaData', ...
        0.80 * scoreMap);

    axis image off;

    title( ...
        sprintf('Grad-CAM\nConfidence: %.2f%%', ...
        confidence * 100), ...
        'Color', 'w', ...
        'FontSize', 12);

    hold off;

    %% Save visualization

    outputName = sprintf( ...
        '%s_XAI_Validation.png', ...
        imageID);

    outputPath = fullfile( ...
        outputFolder, ...
        outputName);

    exportgraphics( ...
        gcf, ...
        outputPath, ...
        'Resolution', 150);

    fprintf('\nVisualization saved:\n%s\n', ...
        outputPath);

    close(gcf);

end

%% 10. SAVE RESULTS

resultsFile = fullfile( ...
    projectRoot, ...
    'output', ...
    'reports', ...
    'S04_XAI_validation.mat');

if ~exist(fileparts(resultsFile), 'dir')
    mkdir(fileparts(resultsFile));
end

save( ...
    resultsFile, ...
    'results', ...
    'featureLayer', ...
    'reductionLayer');

%% 11. SUMMARY

fprintf('\n');
fprintf('============================================================\n');
fprintf(' S04 XAI VALIDATION COMPLETED\n');
fprintf('============================================================\n\n');

fprintf('Images processed: %d\n', ...
    numToProcess);

validIoU = results.iou(~isnan(results.iou));

validCoverage = ...
    results.lesionCoverage(~isnan(results.lesionCoverage));

validPrecision = ...
    results.attentionPrecision(~isnan(results.attentionPrecision));

if ~isempty(validIoU)

    fprintf('\nAverage XAI Metrics:\n');

    fprintf('Average lesion coverage       : %.2f %%\n', ...
        mean(validCoverage) * 100);

    fprintf('Average attention precision   : %.2f %%\n', ...
        mean(validPrecision) * 100);

    fprintf('Average Grad-CAM / lesion IoU : %.4f\n', ...
        mean(validIoU));

else

    fprintf('\nNo valid lesion-overlap measurements were available.\n');

end

fprintf('\nResults saved:\n%s\n', ...
    resultsFile);

fprintf('\nGrad-CAM visualizations saved in:\n%s\n', ...
    outputFolder);

fprintf('\nNext stage:\n');
fprintf('  S05 -> Image quality assessment\n\n');

fprintf('IMPORTANT:\n');
fprintf('Grad-CAM overlap indicates spatial correspondence, not lesion detection.\n');
fprintf('This system is an AI screening prototype and NOT a medical diagnosis.\n');

fprintf('============================================================\n');