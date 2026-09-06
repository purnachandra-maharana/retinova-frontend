
%% S01_train_DR_model.m
% SIH 26038 - Explainable AI for Diabetic Retinopathy Screening
%
% Purpose:
%   Train a 5-class diabetic retinopathy classifier using APTOS 2019
%   and ResNet-50 transfer learning.
%
% Classes:
%   0 = No DR
%   1 = Mild DR
%   2 = Moderate DR
%   3 = Severe DR
%   4 = Proliferative DR
%
% Hardware:
%   Optimized for NVIDIA RTX 3050 Laptop GPU with 4 GB VRAM.
%
% Project:
%   SIH26038_NEW
%
% IMPORTANT:
%   This script does NOT modify the old DR project.

clear;
clc;
close all;

fprintf('\n============================================================\n');
fprintf(' SIH 26038 - DR MODEL TRAINING\n');
fprintf(' ResNet-50 + APTOS 5-Class Classification\n');
fprintf('============================================================\n\n');

%% 1. PROJECT PATHS

projectRoot = fileparts(fileparts(mfilename('fullpath')));

trainCSV = fullfile(projectRoot, 'splits', 'train.csv');
valCSV   = fullfile(projectRoot, 'splits', 'validation.csv');
testCSV  = fullfile(projectRoot, 'splits', 'test.csv');

modelDir = fullfile(projectRoot, 'models');
outputDir = fullfile(projectRoot, 'output');

if ~exist(modelDir, 'dir')
    mkdir(modelDir);
end

if ~exist(outputDir, 'dir')
    mkdir(outputDir);
end

fprintf('Project root:\n%s\n\n', projectRoot);

%% 2. CHECK REQUIRED FILES

requiredFiles = {
    trainCSV
    valCSV
    testCSV
};

for k = 1:numel(requiredFiles)
    if ~isfile(requiredFiles{k})
        error('Required file not found:\n%s', requiredFiles{k});
    end
end

fprintf('Dataset split files found successfully.\n\n');

%% 3. READ DATA SPLITS

trainTbl = readtable(trainCSV, 'TextType', 'string');
valTbl   = readtable(valCSV,   'TextType', 'string');
testTbl  = readtable(testCSV,  'TextType', 'string');

fprintf('Dataset sizes:\n');
fprintf('  Training   : %d images\n', height(trainTbl));
fprintf('  Validation : %d images\n', height(valTbl));
fprintf('  Testing    : %d images\n\n', height(testTbl));

%% 4. CONVERT RELATIVE PATHS TO FULL PATHS

trainPaths = fullfile(projectRoot, ...
    replace(string(trainTbl.filepath), "/", filesep));

valPaths = fullfile(projectRoot, ...
    replace(string(valTbl.filepath), "/", filesep));

testPaths = fullfile(projectRoot, ...
    replace(string(testTbl.filepath), "/", filesep));

%% 5. VERIFY IMAGE FILES

fprintf('Checking image paths...\n');

if any(~isfile(trainPaths))
    bad = find(~isfile(trainPaths), 1);
    error('Training image not found:\n%s', trainPaths(bad));
end

if any(~isfile(valPaths))
    bad = find(~isfile(valPaths), 1);
    error('Validation image not found:\n%s', valPaths(bad));
end

if any(~isfile(testPaths))
    bad = find(~isfile(testPaths), 1);
    error('Testing image not found:\n%s', testPaths(bad));
end

fprintf('All image paths verified successfully.\n\n');

%% 6. CREATE CATEGORICAL LABELS

classNames = categorical(["0","1","2","3","4"]);

trainLabels = categorical(string(trainTbl.diagnosis));
valLabels   = categorical(string(valTbl.diagnosis));
testLabels  = categorical(string(testTbl.diagnosis));

% Force identical category ordering in every split
trainLabels = reordercats(trainLabels, categories(classNames));
valLabels   = reordercats(valLabels, categories(classNames));
testLabels  = reordercats(testLabels, categories(classNames));

%% 7. DISPLAY ORIGINAL CLASS DISTRIBUTION

fprintf('Original training class distribution:\n');

trainCounts = countcats(trainLabels);

for c = 1:numel(classNames)
    fprintf('  Grade %s : %d images\n', ...
        string(classNames(c)), trainCounts(c));
end

fprintf('\n');

%% 8. HANDLE CLASS IMBALANCE BY OVERSAMPLING
%
% APTOS contains substantially fewer severe/proliferative cases.
%
% Instead of deleting Grade 0 images, minority classes are repeated
% until every class has approximately the same number of samples.
%
% This produces a balanced training datastore while preserving
% the original validation and test sets.

maxCount = max(trainCounts);

balancedPaths = strings(0,1);
balancedLabels = categorical();

for c = 1:numel(classNames)

    currentIdx = find(trainLabels == classNames(c));

    currentPaths = trainPaths(currentIdx);
    currentLabels = trainLabels(currentIdx);

    currentCount = numel(currentIdx);

    repeatCount = ceil(maxCount / currentCount);

    repeatedPaths = repmat(currentPaths, repeatCount, 1);
    repeatedLabels = repmat(currentLabels, repeatCount, 1);

    % Trim to approximately equal class size
    repeatedPaths = repeatedPaths(1:maxCount);
    repeatedLabels = repeatedLabels(1:maxCount);

    balancedPaths = [balancedPaths; repeatedPaths]; %#ok<AGROW>
    balancedLabels = [balancedLabels; repeatedLabels]; %#ok<AGROW>
end

% Randomize balanced training set
rng(42);

shuffleIdx = randperm(numel(balancedPaths));

balancedPaths = balancedPaths(shuffleIdx);
balancedLabels = balancedLabels(shuffleIdx);

fprintf('Balanced training distribution:\n');

balancedCounts = countcats(balancedLabels);

for c = 1:numel(classNames)
    fprintf('  Grade %s : %d images\n', ...
        string(classNames(c)), balancedCounts(c));
end

fprintf('\nTotal balanced training samples: %d\n\n', ...
    numel(balancedPaths));

%% 9. CREATE IMAGE DATASTORES

imdsTrain = imageDatastore( ...
    cellstr(balancedPaths), ...
    'Labels', balancedLabels);

imdsValidation = imageDatastore( ...
    cellstr(valPaths), ...
    'Labels', valLabels);

imdsTest = imageDatastore( ...
    cellstr(testPaths), ...
    'Labels', testLabels);

%% 10. LOAD RESNET-50

fprintf('Loading ResNet-50...\n');

net = resnet50;

fprintf('ResNet-50 loaded successfully.\n\n');

inputSize = net.Layers(1).InputSize;

fprintf('ResNet-50 input size: %d x %d x %d\n\n', ...
    inputSize(1), inputSize(2), inputSize(3));

%% 11. REPLACE FINAL CLASSIFICATION LAYERS

fprintf('Modifying ResNet-50 for 5 DR classes...\n');

lgraph = layerGraph(net);

numClasses = 5;

newFC = fullyConnectedLayer( ...
    numClasses, ...
    'Name', 'DR_fc', ...
    'WeightLearnRateFactor', 10, ...
    'BiasLearnRateFactor', 10);

newClassLayer = classificationLayer( ...
    'Name', 'DR_classoutput');

lgraph = replaceLayer( ...
    lgraph, ...
    'fc1000', ...
    newFC);

lgraph = replaceLayer( ...
    lgraph, ...
    'ClassificationLayer_fc1000', ...
    newClassLayer);

fprintf('Final layers replaced successfully.\n\n');

%% 12. FREEZE RESNET-50 BACKBONE

fprintf('Preparing ResNet-50 for transfer learning...\n');

% Set learning-rate factors of pretrained layers to zero.
% The new DR_fc layer remains trainable.

for i = 1:numel(lgraph.Layers)

    currentLayer = lgraph.Layers(i);

    if strcmp(currentLayer.Name, 'DR_fc')
        continue;
    end

    if isprop(currentLayer, 'WeightLearnRateFactor')
        currentLayer.WeightLearnRateFactor = 0;
    end

    if isprop(currentLayer, 'BiasLearnRateFactor')
        currentLayer.BiasLearnRateFactor = 0;
    end

    lgraph = replaceLayer( ...
        lgraph, ...
        currentLayer.Name, ...
        currentLayer);
end

fprintf('ResNet-50 backbone prepared successfully.\n');
fprintf('Only the new DR classification layer will be fine-tuned.\n\n');
%% 13. DATA AUGMENTATION

imageAugmenter = imageDataAugmenter( ...
    'RandRotation', [-10 10], ...
    'RandXTranslation', [-10 10], ...
    'RandYTranslation', [-10 10], ...
    'RandXScale', [0.90 1.10], ...
    'RandYScale', [0.90 1.10], ...
    'RandXReflection', true);

augimdsTrain = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTrain, ...
    'DataAugmentation', imageAugmenter);

augimdsValidation = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsValidation);

augimdsTest = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTest);

%% 14. GPU CHECK

fprintf('Checking GPU...\n');

try
    gpu = gpuDevice;

    fprintf('GPU detected:\n');
    fprintf('  Name          : %s\n', gpu.Name);
    fprintf('  Total memory  : %.2f GB\n', ...
        double(gpu.TotalMemory) / 1e9);
    fprintf('  Available     : %.2f GB\n\n', ...
        double(gpu.AvailableMemory) / 1e9);

catch
    warning('GPU could not be initialized. Training may use CPU.');
end

%% 15. TRAINING OPTIONS
%
% MiniBatchSize = 8 is selected as a starting point for the
% RTX 3050 4 GB GPU.
%
% If MATLAB reports GPU out-of-memory, reduce this to 4.

miniBatchSize = 8;

validationFrequency = max(1, ...
    floor(numel(balancedLabels) / miniBatchSize));

options = trainingOptions('adam', ...
    'InitialLearnRate', 1e-4, ...
    'MaxEpochs', 8, ...
    'MiniBatchSize', miniBatchSize, ...
    'Shuffle', 'every-epoch', ...
    'ValidationData', augimdsValidation, ...
    'ValidationFrequency', validationFrequency, ...
    'Verbose', true, ...
    'Plots', 'training-progress', ...
    'ExecutionEnvironment', 'gpu', ...
    'L2Regularization', 1e-4, ...
    'GradientThreshold', 1);

%% 16. DISPLAY TRAINING CONFIGURATION

fprintf('============================================================\n');
fprintf(' TRAINING CONFIGURATION\n');
fprintf('============================================================\n');
fprintf('Model              : ResNet-50\n');
fprintf('Classes            : 5\n');
fprintf('Input size         : %d x %d x %d\n', ...
    inputSize(1), inputSize(2), inputSize(3));
fprintf('Balanced samples   : %d\n', numel(balancedLabels));
fprintf('Validation samples : %d\n', height(valTbl));
fprintf('Mini-batch size    : %d\n', miniBatchSize);
fprintf('Maximum epochs     : %d\n', options.MaxEpochs);
fprintf('Initial LR         : %.1e\n', options.InitialLearnRate);
fprintf('Optimizer          : Adam\n');
fprintf('Execution          : GPU\n');
fprintf('GPU                : NVIDIA RTX 3050 4 GB\n');
fprintf('============================================================\n\n');

%% 17. TRAIN MODEL

fprintf('Starting training...\n');
fprintf('Do not close MATLAB during training.\n\n');

trainingStartTime = datetime('now');

[trainedNet, trainInfo] = trainNetwork( ...
    augimdsTrain, ...
    lgraph, ...
    options);

trainingEndTime = datetime('now');

trainingDuration = trainingEndTime - trainingStartTime;

fprintf('\n============================================================\n');
fprintf(' TRAINING COMPLETED\n');
fprintf('============================================================\n');
fprintf('Start time : %s\n', string(trainingStartTime));
fprintf('End time   : %s\n', string(trainingEndTime));
fprintf('Duration   : %s\n\n', string(trainingDuration));

%% 18. SAVE TRAINED MODEL

modelFile = fullfile( ...
    modelDir, ...
    'DR_ResNet50_SIH26038.mat');

fprintf('Saving trained model...\n');

save(modelFile, ...
    'trainedNet', ...
    'trainInfo', ...
    'classNames', ...
    'inputSize', ...
    'trainingStartTime', ...
    'trainingEndTime', ...
    'trainingDuration', ...
    '-v7.3');

fprintf('Model saved successfully:\n%s\n\n', modelFile);

%% 19. SAVE TRAINING DATA INFORMATION

trainingInfoFile = fullfile( ...
    outputDir, ...
    'training_info_S01.mat');

save(trainingInfoFile, ...
    'trainCounts', ...
    'balancedCounts', ...
    'classNames', ...
    'inputSize', ...
    'miniBatchSize', ...
    'trainingStartTime', ...
    'trainingEndTime', ...
    'trainingDuration', ...
    '-v7.3');

fprintf('Training information saved:\n%s\n\n', ...
    trainingInfoFile);

%% 20. QUICK VALIDATION PREDICTION

fprintf('Running a quick validation prediction...\n');

[YPred, scores] = classify( ...
    trainedNet, ...
    augimdsValidation, ...
    'ExecutionEnvironment', 'gpu');

YValidation = imdsValidation.Labels;

quickAccuracy = mean(YPred == YValidation);

fprintf('\nQuick validation accuracy: %.2f %%\n', ...
    quickAccuracy * 100);

%% 21. DISPLAY CLASS-WISE VALIDATION COUNTS

fprintf('\nValidation prediction distribution:\n');

for c = 1:numel(classNames)

    actualCount = sum(YValidation == classNames(c));
    predictedCount = sum(YPred == classNames(c));

    fprintf('Grade %s | Actual: %4d | Predicted: %4d\n', ...
        string(classNames(c)), ...
        actualCount, ...
        predictedCount);
end

%% 22. SAVE QUICK VALIDATION RESULTS

validationResultsFile = fullfile( ...
    outputDir, ...
    'validation_predictions_S01.mat');

save(validationResultsFile, ...
    'YPred', ...
    'YValidation', ...
    'scores', ...
    'quickAccuracy', ...
    'classNames', ...
    '-v7.3');

fprintf('\nValidation results saved:\n%s\n', ...
    validationResultsFile);

fprintf('\n============================================================\n');
fprintf(' S01 TRAINING PIPELINE FINISHED SUCCESSFULLY\n');
fprintf('============================================================\n\n');

fprintf('Next planned stages:\n');
fprintf('  S02 -> Evaluate model on test set\n');
fprintf('  S03 -> Generate Grad-CAM explanations\n');
fprintf('  S04 -> Validate XAI using IDRiD lesion masks\n');
fprintf('  S05 -> Image quality assessment\n');
fprintf('  S06 -> End-to-end screening pipeline\n\n');

fprintf('IMPORTANT:\n');
fprintf('This model is an AI screening prototype and NOT a medical diagnosis.\n\n');
