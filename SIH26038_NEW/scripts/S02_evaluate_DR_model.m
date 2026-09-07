%% S02_evaluate_DR_model.m
% SIH 26038 - Diabetic Retinopathy Screening
%
% Purpose:
%   Evaluate the trained ResNet-50 model on the untouched APTOS test set.
%
% Metrics:
%   - Overall accuracy
%   - Per-class sensitivity
%   - Per-class specificity
%   - Precision
%   - F1-score
%   - Confusion matrix
%   - Referable DR sensitivity
%   - Referable DR specificity
%   - Quadratic Weighted Kappa
%
% Referable DR definition:
%   Grades 0-1 = Non-referable
%   Grades 2-4 = Referable
%
% IMPORTANT:
%   This script does NOT modify S01 or the old DR project.

clear;
clc;
close all;

fprintf('\n============================================================\n');
fprintf(' SIH 26038 - MODEL EVALUATION\n');
fprintf(' ResNet-50 + APTOS Test Set\n');
fprintf('============================================================\n\n');

%% 1. PROJECT PATHS

config = retinaProjectConfig();
projectRoot = config.projectRoot;

modelFile = fullfile( ...
    projectRoot, ...
    'models', ...
    'DR_ResNet50_SIH26038.mat');

testCSV = fullfile( ...
    projectRoot, ...
    'splits', ...
    'test.csv');

outputDir = fullfile( ...
    projectRoot, ...
    'output', ...
    'reports');

if ~exist(outputDir, 'dir')
    mkdir(outputDir);
end

fprintf('Project root:\n%s\n\n', projectRoot);

%% 2. CHECK REQUIRED FILES

if ~isfile(modelFile)
    error('Trained model not found:\n%s', modelFile);
end

if ~isfile(testCSV)
    error('Test CSV not found:\n%s', testCSV);
end

fprintf('Required files found successfully.\n\n');

%% 3. LOAD TRAINED MODEL

fprintf('Loading trained model...\n');

loadedData = load(modelFile);

trainedNet = loadedData.trainedNet;
classNames = loadedData.classNames;
inputSize  = loadedData.inputSize;

fprintf('Model loaded successfully.\n');
fprintf('Model input size: %d x %d x %d\n\n', ...
    inputSize(1), inputSize(2), inputSize(3));

%% 4. READ TEST SET

testTbl = readtable( ...
    testCSV, ...
    'TextType', 'string');

fprintf('Test set size: %d images\n\n', height(testTbl));

%% 5. CREATE FULL IMAGE PATHS

testPaths = fullfile( ...
    projectRoot, ...
    replace(string(testTbl.filepath), "/", filesep));

%% 6. VERIFY TEST IMAGES

fprintf('Checking test image paths...\n');

missingIdx = find(~isfile(testPaths));

if ~isempty(missingIdx)

    fprintf('\nERROR: %d test images are missing.\n', ...
        numel(missingIdx));

    fprintf('First missing image:\n%s\n', ...
        testPaths(missingIdx(1)));

    error('Test image verification failed.');

end

fprintf('All test images verified successfully.\n\n');

%% 7. CREATE TEST DATASTORE

imdsTest = imageDatastore( ...
    cellstr(testPaths));

YTest = categorical( ...
    string(testTbl.diagnosis));

YTest = reordercats( ...
    YTest, ...
    categories(classNames));

fprintf('Test datastore created successfully.\n\n');

%% 8. CREATE RESIZED TEST DATASTORE

augimdsTest = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTest);

%% 9. RUN MODEL PREDICTIONS

fprintf('Running predictions on the complete test set...\n');
fprintf('Please wait...\n\n');

predictionStart = datetime('now');

[YPred, scores] = classify( ...
    trainedNet, ...
    augimdsTest, ...
    'ExecutionEnvironment', retinaSelectExecutionEnvironment());

predictionEnd = datetime('now');

fprintf('Prediction completed.\n');
fprintf('Start : %s\n', string(predictionStart));
fprintf('End   : %s\n\n', string(predictionEnd));

%% 10. OVERALL ACCURACY

accuracy = mean(YPred == YTest);

fprintf('============================================================\n');
fprintf(' OVERALL PERFORMANCE\n');
fprintf('============================================================\n');

fprintf('Test Accuracy : %.2f %%\n\n', ...
    accuracy * 100);

%% 11. CONFUSION MATRIX

fprintf('Generating confusion matrix...\n');

confMat = confusionmat( ...
    YTest, ...
    YPred, ...
    'Order', classNames);

fprintf('\nConfusion Matrix:\n');
disp(confMat);

figure('Name', 'SIH26038 - Confusion Matrix');

cmChart = confusionchart( ...
    YTest, ...
    YPred);

cmChart.Title = 'APTOS Test Set - DR Classification';
cmChart.RowSummary = 'row-normalized';
cmChart.ColumnSummary = 'column-normalized';

%% 12. PER-CLASS METRICS

numClasses = numel(classNames);

sensitivity = zeros(numClasses,1);
specificity = zeros(numClasses,1);
precision   = zeros(numClasses,1);
f1Score     = zeros(numClasses,1);

totalSamples = sum(confMat(:));

for c = 1:numClasses

    TP = confMat(c,c);

    FN = sum(confMat(c,:)) - TP;

    FP = sum(confMat(:,c)) - TP;

    TN = totalSamples - TP - FN - FP;

    sensitivity(c) = safeDivide(TP, TP + FN);

    specificity(c) = safeDivide(TN, TN + FP);

    precision(c) = safeDivide(TP, TP + FP);

    f1Score(c) = safeDivide( ...
        2 * precision(c) * sensitivity(c), ...
        precision(c) + sensitivity(c));

end

%% 13. DISPLAY PER-CLASS METRICS

fprintf('\n============================================================\n');
fprintf(' PER-CLASS PERFORMANCE\n');
fprintf('============================================================\n');

fprintf('\n');
fprintf('%8s %14s %14s %14s %14s\n', ...
    'Grade', ...
    'Sensitivity', ...
    'Specificity', ...
    'Precision', ...
    'F1-Score');

fprintf('%s\n', repmat('-',1,70));

for c = 1:numClasses

    fprintf('%8s %13.2f%% %13.2f%% %13.2f%% %13.2f%%\n', ...
        string(classNames(c)), ...
        sensitivity(c) * 100, ...
        specificity(c) * 100, ...
        precision(c) * 100, ...
        f1Score(c) * 100);

end

%% 14. MACRO AVERAGES

macroSensitivity = mean(sensitivity);
macroSpecificity = mean(specificity);
macroPrecision   = mean(precision);
macroF1          = mean(f1Score);

fprintf('\n------------------------------------------------------------\n');
fprintf('Macro Sensitivity : %.2f %%\n', ...
    macroSensitivity * 100);

fprintf('Macro Specificity : %.2f %%\n', ...
    macroSpecificity * 100);

fprintf('Macro Precision   : %.2f %%\n', ...
    macroPrecision * 100);

fprintf('Macro F1-Score    : %.2f %%\n', ...
    macroF1 * 100);

%% 15. REFERABLE DR ANALYSIS
%
% Non-referable = Grades 0 and 1
% Referable     = Grades 2, 3 and 4

fprintf('\n============================================================\n');
fprintf(' REFERABLE DR SCREENING PERFORMANCE\n');
fprintf('============================================================\n');

actualNumeric = str2double(string(YTest));
predictedNumeric = str2double(string(YPred));

actualReferable = double(actualNumeric >= 2);
predictedReferable = double(predictedNumeric >= 2);

% Explicit binary labels:
% 0 = Non-referable
% 1 = Referable

binaryConfMat = confusionmat( ...
    actualReferable, ...
    predictedReferable, ...
    'Order', [0 1]);

fprintf('\nBinary Confusion Matrix:\n');
disp(binaryConfMat);

TN = binaryConfMat(1,1);
FP = binaryConfMat(1,2);
FN = binaryConfMat(2,1);
TP = binaryConfMat(2,2);

referableSensitivity = safeDivide( ...
    TP, TP + FN);

referableSpecificity = safeDivide( ...
    TN, TN + FP);

referablePrecision = safeDivide( ...
    TP, TP + FP);

referableF1 = safeDivide( ...
    2 * referablePrecision * referableSensitivity, ...
    referablePrecision + referableSensitivity);

referableAccuracy = ...
    mean(actualReferable == predictedReferable);

fprintf('\nReferable DR Definition:\n');
fprintf('  Non-referable : Grade 0-1\n');
fprintf('  Referable     : Grade 2-4\n\n');

fprintf('Referable DR Accuracy    : %.2f %%\n', ...
    referableAccuracy * 100);

fprintf('Referable DR Sensitivity : %.2f %%\n', ...
    referableSensitivity * 100);

fprintf('Referable DR Specificity : %.2f %%\n', ...
    referableSpecificity * 100);

fprintf('Referable DR Precision   : %.2f %%\n', ...
    referablePrecision * 100);

fprintf('Referable DR F1-Score    : %.2f %%\n', ...
    referableF1 * 100);

%% 16. QUADRATIC WEIGHTED KAPPA

fprintf('\n============================================================\n');
fprintf(' QUADRATIC WEIGHTED KAPPA\n');
fprintf('============================================================\n');

% Convert categorical grades to numerical 0-4

actualNumeric = str2double(string(YTest));
predictedNumeric = str2double(string(YPred));

n = numClasses;

% Observed confusion matrix

O = confMat;

% Expected matrix based on row/column totals

rowTotals = sum(O,2);
colTotals = sum(O,1);

E = (rowTotals * colTotals) / totalSamples;

% Quadratic weights

W = zeros(n,n);

for i = 1:n
    for j = 1:n
        W(i,j) = ((i-j)^2) / ((n-1)^2);
    end
end

observedDisagreement = sum(sum(W .* O));
expectedDisagreement = sum(sum(W .* E));

quadraticKappa = ...
    1 - observedDisagreement / expectedDisagreement;

fprintf('Quadratic Weighted Kappa : %.4f\n', ...
    quadraticKappa);

%% 17. CLASS DISTRIBUTION

fprintf('\n============================================================\n');
fprintf(' TEST SET DISTRIBUTION\n');
fprintf('============================================================\n');

for c = 1:numClasses

    actualCount = sum(YTest == classNames(c));

    predictedCount = sum(YPred == classNames(c));

    fprintf( ...
        'Grade %s | Actual: %3d | Predicted: %3d\n', ...
        string(classNames(c)), ...
        actualCount, ...
        predictedCount);

end

%% 18. SAVE RESULTS

resultsFile = fullfile( ...
    outputDir, ...
    'S02_test_evaluation.mat');

evaluationResults = struct();

evaluationResults.accuracy = accuracy;

evaluationResults.confusionMatrix = confMat;

evaluationResults.sensitivity = sensitivity;

evaluationResults.specificity = specificity;

evaluationResults.precision = precision;

evaluationResults.f1Score = f1Score;

evaluationResults.macroSensitivity = macroSensitivity;

evaluationResults.macroSpecificity = macroSpecificity;

evaluationResults.macroPrecision = macroPrecision;

evaluationResults.macroF1 = macroF1;

evaluationResults.referableAccuracy = referableAccuracy;

evaluationResults.referableSensitivity = referableSensitivity;

evaluationResults.referableSpecificity = referableSpecificity;

evaluationResults.referablePrecision = referablePrecision;

evaluationResults.referableF1 = referableF1;

evaluationResults.quadraticWeightedKappa = quadraticKappa;

evaluationResults.YTest = YTest;

evaluationResults.YPred = YPred;

evaluationResults.scores = scores;

evaluationResults.classNames = classNames;

evaluationResults.testPaths = testPaths;

save( ...
    resultsFile, ...
    'evaluationResults', ...
    '-v7.3');

fprintf('\n============================================================\n');
fprintf(' RESULTS SAVED\n');
fprintf('============================================================\n');

fprintf('\n%s\n', resultsFile);

fprintf('\n============================================================\n');
fprintf(' S02 EVALUATION COMPLETED SUCCESSFULLY\n');
fprintf('============================================================\n\n');

fprintf('Next stages:\n');
fprintf('  S03 -> Generate Grad-CAM explanations\n');
fprintf('  S04 -> Validate XAI using IDRiD lesion annotations\n');
fprintf('  S05 -> Image quality assessment\n');
fprintf('  S06 -> End-to-end screening + medical report output\n\n');

fprintf('IMPORTANT:\n');
fprintf('This system is an AI screening prototype and NOT a medical diagnosis.\n\n');


%% LOCAL FUNCTION
function result = safeDivide(numerator, denominator)

if denominator == 0
    result = 0;
else
    result = numerator / denominator;
end

end