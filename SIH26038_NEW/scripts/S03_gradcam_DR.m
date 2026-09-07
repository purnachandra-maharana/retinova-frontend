%% S03 - Grad-CAM XAI Generation
% SIH 26038 - Explainable AI for Diabetic Retinopathy Screening
%
% Purpose:
%   Generate Grad-CAM explanations for selected APTOS test images.
%
% Model:
%   ResNet-50
%
% Target XAI Layer:
%   activation_49_relu
%
% Output:
%   output\gradcam
%
% NOTE:
%   This is an AI screening prototype and NOT a medical diagnosis.

clear;
clc;
close all;

fprintf('\n');
fprintf('============================================================\n');
fprintf(' SIH 26038 - GRAD-CAM XAI GENERATION\n');
fprintf(' ResNet-50 + APTOS Test Set\n');
fprintf('============================================================\n\n');

%% 1. PROJECT PATHS

config = retinaProjectConfig();
projectRoot = config.projectRoot;

modelFile = fullfile( ...
    projectRoot, 'models', 'DR_ResNet50_SIH26038.mat');

testFile = fullfile( ...
    projectRoot, 'splits', 'test.csv');

gradcamFolder = fullfile( ...
    projectRoot, 'output', 'gradcam');

%% 2. CREATE OUTPUT FOLDER

if ~exist(gradcamFolder, 'dir')
    mkdir(gradcamFolder);
end

fprintf('Project root:\n%s\n\n', projectRoot);

fprintf('Grad-CAM output folder:\n%s\n\n', gradcamFolder);

%% 3. CHECK REQUIRED FILES

if ~isfile(modelFile)
    error('Trained model not found:\n%s', modelFile);
end

if ~isfile(testFile)
    error('Test split not found:\n%s', testFile);
end

fprintf('Required files found successfully.\n\n');

%% 4. LOAD TRAINED MODEL

fprintf('Loading trained model...\n');

load(modelFile, ...
    'trainedNet', ...
    'classNames', ...
    'inputSize');

fprintf('Model loaded successfully.\n');
fprintf('Input size: %d x %d x %d\n', ...
    inputSize(1), inputSize(2), inputSize(3));

fprintf('\nClasses:\n');

disp(classNames);

%% 5. DEFINE GRAD-CAM TARGET LAYER

targetLayer = 'activation_49_relu';

fprintf('Grad-CAM target layer:\n');
fprintf('%s\n\n', targetLayer);

%% 6. READ TEST DATA

fprintf('Reading test set...\n');

testTable = readtable(testFile);

fprintf('Test set contains %d images.\n\n', height(testTable));

%% 7. DISPLAY TEST TABLE STRUCTURE

fprintf('Test table columns:\n');
disp(testTable.Properties.VariableNames);

%% 8. SELECT ONE IMAGE FROM EACH DR GRADE

% We intentionally start with only 5 images:
% one image from each class.

selectedRows = [];

for grade = 0:4

    idx = find(testTable.diagnosis == grade, 1, 'first');

    if isempty(idx)

        % Handle categorical/string/numeric diagnosis safely
        diagnosisValues = string(testTable.diagnosis);

        idx = find( ...
            diagnosisValues == string(grade), ...
            1, 'first');
    end

    if isempty(idx)
        warning('No test image found for Grade %d.', grade);
    else
        selectedRows(end+1) = idx; %#ok<SAGROW>
    end
end

fprintf('Selected %d images for Grad-CAM testing.\n\n', ...
    numel(selectedRows));

%% 9. PROCESS SELECTED IMAGES

for k = 1:numel(selectedRows)

    row = selectedRows(k);

    %% Get image path

    imagePath = string(testTable.filepath(row));

    % Convert project-relative path to absolute path
    imagePath = strrep(imagePath, '/', filesep);

    if ~isfile(imagePath)

        imagePath = fullfile( ...
            projectRoot, imagePath);
    end

    if ~isfile(imagePath)
        error('Image not found:\n%s', imagePath);
    end

    %% Get actual grade

    actualGrade = testTable.diagnosis(row);

    if ~isnumeric(actualGrade)
        actualGrade = str2double(string(actualGrade));
    end

    fprintf('------------------------------------------------------------\n');
    fprintf('Processing image %d of %d\n', ...
        k, numel(selectedRows));

    fprintf('Image:\n%s\n', imagePath);

    fprintf('Actual Grade: %d\n', actualGrade);

    %% Read image

    I = imread(imagePath);

    %% Convert grayscale images to RGB

    if size(I,3) == 1
        I = repmat(I, [1 1 3]);
    end

    %% Convert indexed images if necessary

    if ~isa(I, 'uint8') && ~isa(I, 'uint16') ...
            && ~isa(I, 'single') && ~isa(I, 'double')

        I = im2uint8(I);
    end

    %% Resize image for model

    modelImage = imresize(I, ...
        inputSize(1:2));

    %% Run classification

    [predictedLabel, scores] = classify( ...
        trainedNet, ...
        modelImage);

    %% Find predicted class index

    predictedIndex = find( ...
        classNames == predictedLabel);

    %% Confidence

    confidence = scores(predictedIndex);

    fprintf('Predicted Grade: %s\n', ...
        string(predictedLabel));

    fprintf('Confidence: %.2f %%\n', ...
        confidence * 100);

    %% Display class probabilities

    fprintf('\nClass probabilities:\n');

    for c = 1:numel(classNames)

        fprintf('  Grade %s : %.2f %%\n', ...
            string(classNames(c)), ...
            scores(c) * 100);

    end

    %% Generate Grad-CAM

    fprintf('\nGenerating Grad-CAM...\n');

    scoreMap = gradCAM( ...
        trainedNet, ...
        modelImage, ...
        predictedLabel, ...
        'ReductionLayer', 'avg_pool', ...
        'FeatureLayer', targetLayer);

    %% Resize heatmap to original image size

    scoreMap = imresize( ...
        scoreMap, ...
        [size(I,1), size(I,2)]);

    %% Normalize heatmap

    scoreMap = mat2gray(scoreMap);

    % Increase Grad-CAM intensity
    scoreMap = scoreMap .^ 0.6;

    %% Create output filename

    [~, imageName, ~] = fileparts(imagePath);

    outputName = sprintf( ...
        '%s_Grade%s_GradCAM.png', ...
        imageName, ...
        string(predictedLabel));

    outputPath = fullfile( ...
        gradcamFolder, ...
        outputName);

    %% Create visualization

    figure( ...
        'Name', ...
        sprintf('Grad-CAM - %s', imageName), ...
        'NumberTitle', 'off', ...
        'Color', 'k');

    %% Original image

    subplot(1,3,1);

    imshow(I);

    title(sprintf( ...
        'Original Image\nActual Grade: %d', ...
        actualGrade), ...
        'Interpreter', 'none');

    %% Grad-CAM heatmap

    subplot(1,3,2);

    imagesc(scoreMap);

    axis image off;

    title(sprintf( ...
        'Grad-CAM\nPredicted: %s', ...
        string(predictedLabel)));

    colorbar;

    %% Overlay

    subplot(1,3,3);

    imshow(I);

    hold on;

    h = imagesc(scoreMap);

    set(h, 'AlphaData', ...
        0.90 * scoreMap);

    axis image off;

    title(sprintf( ...
        'XAI Overlay\nConfidence: %.2f%%', ...
        confidence * 100));

    hold off;

    %% Save figure

    exportgraphics( ...
        gcf, ...
        outputPath, ...
        'Resolution', 150);

    fprintf('\nGrad-CAM saved:\n%s\n', ...
        outputPath);

    %% Close figure

    close(gcf);

end

%% 10. COMPLETION MESSAGE

fprintf('\n');
fprintf('============================================================\n');
fprintf(' S03 GRAD-CAM GENERATION COMPLETED\n');
fprintf('============================================================\n\n');

fprintf('Grad-CAM results saved in:\n');
fprintf('%s\n\n', gradcamFolder);

fprintf('Generated explanations: %d\n', ...
    numel(selectedRows));

fprintf('\nNext stage:\n');
fprintf('  S04 -> Validate XAI using IDRiD lesion annotations\n\n');

fprintf('IMPORTANT:\n');
fprintf('This system is an AI screening prototype and NOT a medical diagnosis.\n');
fprintf('============================================================\n');