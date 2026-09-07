%% S09 - Retinal Structure & Lesion Analysis
% SIH 26038 - Explainable AI for Diabetic Retinopathy Screening
%
% PURPOSE:
%   1. Optic disc localization
%   2. Fovea localization
%   3. Optic disc segmentation
%   4. Microaneurysm analysis
%   5. Hard exudate segmentation
%   6. Soft exudate segmentation
%   7. Hemorrhage analysis
%   8. Classical retinal vessel segmentation
%   9. Vascular abnormality indicator
%  10. Annotated retinal visualization
%
% IMPORTANT:
%   IDRiD segmentation masks are expert annotations.
%   Therefore this module demonstrates annotation-guided retinal
%   structure/lesion analysis. It is NOT claiming that the masks
%   are predictions from a trained lesion segmentation model.
%
% -------------------------------------------------------------------------

clear;
clc;
close all;

fprintf('\n============================================================\n');
fprintf(' S09 - RETINAL STRUCTURE & LESION ANALYSIS\n');
fprintf(' SIH 26038 - Diabetic Retinopathy Screening\n');
fprintf('============================================================\n\n');

%% 1. PATH CONFIGURATION

config = retinaProjectConfig();
projectRoot = config.projectRoot;

idridRoot = fullfile(projectRoot, 'data', 'IDRiD');

imageDir = fullfile(idridRoot, 'images');

segRoot = fullfile(idridRoot, 'segmentation', 'testing');

maDir = fullfile(segRoot, 'Microaneurysms');
heDir = fullfile(segRoot, 'Haemorrhages');
exDir = fullfile(segRoot, 'Hard Exudates');
seDir = fullfile(segRoot, 'Soft Exudates');
odMaskDir = fullfile(segRoot, 'Optic Disc');

odLocalizationRoot = fullfile( ...
    idridRoot, 'localization', ...
    '1. Optic Disc Center Location');

foveaLocalizationRoot = fullfile( ...
    idridRoot, 'localization', ...
    '2. Fovea Center Location');

outputRoot = fullfile(projectRoot, 'output');

reportDir = fullfile(outputRoot, 'reports');
visualDir = fullfile(outputRoot, 'retinal_structure');

if ~exist(reportDir, 'dir')
    mkdir(reportDir);
end

if ~exist(visualDir, 'dir')
    mkdir(visualDir);
end

%% 2. CHECK REQUIRED DIRECTORIES

fprintf('Checking IDRiD directories...\n');

requiredDirs = {
    imageDir
    segRoot
    maDir
    heDir
    exDir
    seDir
    odMaskDir
    odLocalizationRoot
    foveaLocalizationRoot
};

for k = 1:numel(requiredDirs)

    if ~exist(requiredDirs{k}, 'dir')
        error('Required directory not found:\n%s', requiredDirs{k});
    end

end

fprintf('All required directories found.\n\n');

%% 3. TEST IMAGES

% IDRiD testing set = images 55 to 81
testIDs = 55:81;

fprintf('Testing images: IDRiD_55 to IDRiD_81\n');
fprintf('Number of images: %d\n\n', numel(testIDs));

%% 4. LOAD LOCALIZATION TABLES

fprintf('Searching for optic disc localization data...\n');

odTable = findLocalizationTable( ...
    odLocalizationRoot, ...
    'IDRiD_OD_Center_Testing Set_Markups');

fprintf('Searching for fovea localization data...\n');

foveaTable = findLocalizationTable( ...
    foveaLocalizationRoot, ...
    'IDRiD_Fovea_Center_Testing Set_Markups');

fprintf('\n');

%% 5. RESULTS STRUCTURE

results = struct([]);

%% 6. PROCESS EACH TEST IMAGE

for n = 1:numel(testIDs)

    id = testIDs(n);

    imageID = sprintf('IDRiD_%02d', id);

    fprintf('\n------------------------------------------------------------\n');
    fprintf('Processing %s (%d/%d)\n', ...
        imageID, n, numel(testIDs));
    fprintf('------------------------------------------------------------\n');

    %% 6.1 FIND FUNDUS IMAGE

    imageFile = findImageByID(imageDir, imageID);

    if isempty(imageFile)

        warning('Image not found: %s. Skipping.', imageID);
        continue;

    end

    I = imread(imageFile);

    if size(I,3) == 1
        I = repmat(I, [1 1 3]);
    end

    I = im2uint8(I);

    [H,W,~] = size(I);

    fprintf('Image size: %d x %d\n', W, H);

    %% 6.2 OPTIC DISC CENTER

    odXY = getLocalizationCoordinate(odTable, imageID);

    if isempty(odXY)

        fprintf('Optic disc center: NOT FOUND\n');

    else

        fprintf('Optic disc center: X=%d, Y=%d\n', ...
            odXY(1), odXY(2));

    end

    %% 6.3 FOVEA CENTER

    foveaXY = getLocalizationCoordinate(foveaTable, imageID);

    if isempty(foveaXY)

        fprintf('Fovea center: NOT FOUND\n');

    else

        fprintf('Fovea center: X=%d, Y=%d\n', ...
            foveaXY(1), foveaXY(2));

    end

    %% 6.4 LOAD SEGMENTATION MASKS

    maMask = loadMaskByID(maDir, imageID);
    heMask = loadMaskByID(heDir, imageID);
    exMask = loadMaskByID(exDir, imageID);
    seMask = loadMaskByID(seDir, imageID);
    odMask = loadMaskByID(odMaskDir, imageID);

    % Convert masks to logical
    maMask = logical(maMask);
    heMask = logical(heMask);
    exMask = logical(exMask);
    seMask = logical(seMask);
    odMask = logical(odMask);

    %% 6.5 RESIZE MASKS IF REQUIRED

    maMask = matchMaskSize(maMask, H, W);
    heMask = matchMaskSize(heMask, H, W);
    exMask = matchMaskSize(exMask, H, W);
    seMask = matchMaskSize(seMask, H, W);
    odMask = matchMaskSize(odMask, H, W);

    %% 6.6 COMBINE EXUDATES

    exudateMask = exMask | seMask;

    %% 6.7 LESION STATISTICS

    totalPixels = H * W;

    maPixels = nnz(maMask);
    hePixels = nnz(heMask);
    hardExPixels = nnz(exMask);
    softExPixels = nnz(seMask);
    exudatePixels = nnz(exudateMask);
    odPixels = nnz(odMask);

    maPercentage = 100 * maPixels / totalPixels;
    hePercentage = 100 * hePixels / totalPixels;
    hardExPercentage = 100 * hardExPixels / totalPixels;
    softExPercentage = 100 * softExPixels / totalPixels;
    exudatePercentage = 100 * exudatePixels / totalPixels;
    odPercentage = 100 * odPixels / totalPixels;

    %% 6.8 CONNECTED COMPONENT COUNTS

    maComponents = countComponents(maMask);
    heComponents = countComponents(heMask);
    hardExComponents = countComponents(exMask);
    softExComponents = countComponents(seMask);

    %% 6.9 RETINAL VESSEL SEGMENTATION

    fprintf('Performing classical vessel segmentation...\n');

    vesselMask = segmentRetinalVessels(I);

    vesselPixels = nnz(vesselMask);

    vesselPercentage = ...
        100 * vesselPixels / totalPixels;

    vesselComponents = countComponents(vesselMask);

    fprintf('Vessel area: %.2f %%\n', vesselPercentage);

    %% 6.10 VASCULAR ABNORMALITY INDICATOR

    % This is NOT a trained neovascularization detector.
    % It is only an image-processing indicator based on vascular
    % density and connected vascular structure.

    vascularIndicator = calculateVascularIndicator( ...
        vesselMask, I);

    fprintf('Vascular abnormality indicator: %.2f / 100\n', ...
        vascularIndicator);

    %% 6.11 OD-FOVEA DISTANCE

    if ~isempty(odXY) && ~isempty(foveaXY)

        odX = odXY(1);
        odY = odXY(2);

        foveaX = foveaXY(1);
        foveaY = foveaXY(2);

        odFoveaDistance = sqrt( ...
            (odX - foveaX)^2 + ...
            (odY - foveaY)^2);

    else

        odFoveaDistance = NaN;

    end

    %% 6.12 ANNOTATED IMAGE

    annotated = I;

    % Make sure coordinate locations are valid
    if ~isempty(odXY)

        odX = round(odXY(1));
        odY = round(odXY(2));

        if odX >= 1 && odX <= W && odY >= 1 && odY <= H

            annotated = insertMarker( ...
                annotated, ...
                [odX odY], ...
                'o', ...
                'Color', 'green', ...
                'Size', 15);

        end

    end

    if ~isempty(foveaXY)

        fx = round(foveaXY(1));
        fy = round(foveaXY(2));

        if fx >= 1 && fx <= W && fy >= 1 && fy <= H

            annotated = insertMarker( ...
                annotated, ...
                [fx fy], ...
                'x', ...
                'Color', 'blue', ...
                'Size', 15);

        end

    end

    %% 6.13 CREATE LESION BOUNDARIES

    boundaryMask = ...
        bwperim(maMask) | ...
        bwperim(heMask) | ...
        bwperim(exudateMask) | ...
        bwperim(odMask);

    boundaryMask = logical(boundaryMask);

    % Overlay boundaries on image
    annotated(boundaryMask) = 255;
    annotated(boundaryMask + H*W) = 0;
    annotated(boundaryMask + 2*H*W) = 0;

    %% 6.14 VISUALIZATION

    fig = figure( ...
        'Visible', 'off', ...
        'Color', 'black', ...
        'Position', [100 100 1400 800]);

    tiledlayout(2,3, ...
        'Padding', 'compact', ...
        'TileSpacing', 'compact');

    % Original
    nexttile;
    imshow(I);
    title('Original Fundus', ...
        'Color','white', ...
        'FontSize',12);

    % Anatomical localization
    nexttile;
    imshow(I);
    hold on;

    if ~isempty(odXY)
        plot(odXY(1), odXY(2), ...
            'go', ...
            'MarkerSize', 12, ...
            'LineWidth', 2);
    end

    if ~isempty(foveaXY)
        plot(foveaXY(1), foveaXY(2), ...
            'bx', ...
            'MarkerSize', 12, ...
            'LineWidth', 2);
    end

    title('Optic Disc + Fovea', ...
        'Color','white', ...
        'FontSize',12);

    hold off;

    % Lesion map
    nexttile;
    lesionMap = ...
        maMask | ...
        heMask | ...
        exudateMask;

    imshow(lesionMap);
    title('Combined Lesion Mask', ...
        'Color','white', ...
        'FontSize',12);

    % Vessel map
    nexttile;
    imshow(vesselMask);
    title('Retinal Vessel Segmentation', ...
        'Color','white', ...
        'FontSize',12);

    % Optic disc
    nexttile;
    imshow(odMask);
    title('Optic Disc Segmentation', ...
        'Color','white', ...
        'FontSize',12);

    % Final annotation
    nexttile;
    imshow(annotated);
    title('Annotated Retinal Image', ...
        'Color','white', ...
        'FontSize',12);

    sgtitle( ...
        sprintf('%s - Retinal Structure Analysis', imageID), ...
        'Color','white', ...
        'FontSize',14);

    %% 6.15 SAVE FIGURE

    outputImage = fullfile( ...
        visualDir, ...
        sprintf('%s_retinal_analysis.png', imageID));

    exportgraphics(fig, outputImage, ...
        'Resolution', 150);

    close(fig);

    %% 6.16 SAVE RESULT

    results(n).imageID = imageID;
    results(n).imageFile = imageFile;

    results(n).imageWidth = W;
    results(n).imageHeight = H;

    results(n).opticDiscCenter = odXY;
    results(n).foveaCenter = foveaXY;

    results(n).opticDiscFoveaDistance = ...
        odFoveaDistance;

    results(n).microaneurysmPixels = maPixels;
    results(n).microaneurysmPercentage = maPercentage;
    results(n).microaneurysmComponents = maComponents;

    results(n).hemorrhagePixels = hePixels;
    results(n).hemorrhagePercentage = hePercentage;
    results(n).hemorrhageComponents = heComponents;

    results(n).hardExudatePixels = hardExPixels;
    results(n).hardExudatePercentage = hardExPercentage;
    results(n).hardExudateComponents = hardExComponents;

    results(n).softExudatePixels = softExPixels;
    results(n).softExudatePercentage = softExPercentage;
    results(n).softExudateComponents = softExComponents;

    results(n).totalExudatePixels = exudatePixels;
    results(n).totalExudatePercentage = exudatePercentage;

    results(n).opticDiscPixels = odPixels;
    results(n).opticDiscPercentage = odPercentage;

    results(n).vesselPixels = vesselPixels;
    results(n).vesselPercentage = vesselPercentage;
    results(n).vesselComponents = vesselComponents;

    results(n).vascularAbnormalityIndicator = ...
        vascularIndicator;

    results(n).annotationGuidedAnalysis = true;

    results(n).limitation = ...
        ['IDRiD expert segmentation masks are used for ' ...
         'annotation-guided lesion analysis. Vessel analysis ' ...
         'is classical image processing. Vascular abnormality ' ...
         'indicator is not a validated neovascularization detector.'];

    results(n).outputVisualization = outputImage;

    %% 6.17 COMMAND WINDOW SUMMARY

    fprintf('\nLesion summary:\n');

    fprintf('  Microaneurysms : %.4f %% (%d components)\n', ...
        maPercentage, maComponents);

    fprintf('  Haemorrhages   : %.4f %% (%d components)\n', ...
        hePercentage, heComponents);

    fprintf('  Hard Exudates  : %.4f %% (%d components)\n', ...
        hardExPercentage, hardExComponents);

    fprintf('  Soft Exudates  : %.4f %% (%d components)\n', ...
        softExPercentage, softExComponents);

    fprintf('  Total Exudates : %.4f %%\n', ...
        exudatePercentage);

    fprintf('  Optic Disc     : %.4f %%\n', ...
        odPercentage);

end

%% 7. REMOVE EMPTY RESULTS

validResults = ~arrayfun(@isempty, results);

results = results(validResults);

%% 8. CALCULATE OVERALL SUMMARY

if ~isempty(results)

    meanMA = mean([results.microaneurysmPercentage], ...
        'omitnan');

    meanHE = mean([results.hemorrhagePercentage], ...
        'omitnan');

    meanHardEX = mean([results.hardExudatePercentage], ...
        'omitnan');

    meanSoftEX = mean([results.softExudatePercentage], ...
        'omitnan');

    meanEX = mean([results.totalExudatePercentage], ...
        'omitnan');

    meanVessel = mean([results.vesselPercentage], ...
        'omitnan');

    meanVascular = mean( ...
        [results.vascularAbnormalityIndicator], ...
        'omitnan');

else

    meanMA = NaN;
    meanHE = NaN;
    meanHardEX = NaN;
    meanSoftEX = NaN;
    meanEX = NaN;
    meanVessel = NaN;
    meanVascular = NaN;

end

%% 9. CREATE SUMMARY STRUCTURE

summary = struct();

summary.numberOfImages = numel(results);

summary.meanMicroaneurysmPercentage = meanMA;
summary.meanHemorrhagePercentage = meanHE;
summary.meanHardExudatePercentage = meanHardEX;
summary.meanSoftExudatePercentage = meanSoftEX;
summary.meanTotalExudatePercentage = meanEX;

summary.meanVesselPercentage = meanVessel;

summary.meanVascularAbnormalityIndicator = ...
    meanVascular;

summary.dataSource = 'IDRiD Testing Set';

summary.analysisType = ...
    'Annotation-guided retinal structure and lesion analysis';

summary.neovascularizationStatus = ...
    ['No dedicated IDRiD neovascularization annotation ' ...
     'was available in the supplied folder structure. ' ...
     'Therefore only a vascular abnormality indicator is reported.'];

%% 10. SAVE REPORT

reportFile = fullfile( ...
    reportDir, ...
    'S09_retinal_structure_analysis.mat');

save(reportFile, ...
    'results', ...
    'summary', ...
    '-v7.3');

%% 11. DISPLAY FINAL SUMMARY

fprintf('\n\n============================================================\n');
fprintf(' S09 COMPLETE\n');
fprintf('============================================================\n');

fprintf('Images successfully processed : %d\n', ...
    numel(results));

fprintf('\nAverage annotation statistics:\n');

fprintf('Microaneurysm area : %.4f %%\n', meanMA);
fprintf('Haemorrhage area   : %.4f %%\n', meanHE);
fprintf('Hard exudate area  : %.4f %%\n', meanHardEX);
fprintf('Soft exudate area  : %.4f %%\n', meanSoftEX);
fprintf('Total exudate area : %.4f %%\n', meanEX);

fprintf('\nAverage vessel area : %.4f %%\n', ...
    meanVessel);

fprintf('Average vascular abnormality indicator : %.2f / 100\n', ...
    meanVascular);

fprintf('\nReport saved to:\n%s\n', reportFile);

fprintf('\nVisualizations saved to:\n%s\n', visualDir);

fprintf('\nIMPORTANT:\n');
fprintf(['S09 uses IDRiD expert annotations for lesion/structure\n' ...
         'analysis. These annotations are not predictions from\n' ...
         'a trained lesion segmentation model.\n']);

fprintf('============================================================\n');


%% ========================================================================
% LOCAL FUNCTIONS
% ========================================================================

function tableData = findLocalizationTable(rootDir, preferredName)

% Search for a localization file.

    tableData = table();

    files = dir(fullfile(rootDir, '**', '*'));

    for k = 1:numel(files)

        if files(k).isdir
            continue;
        end

        [~, name, ext] = fileparts(files(k).name);

        if contains(lower(name), lower(preferredName), ...
                'IgnoreCase', true)

            fullName = fullfile( ...
                files(k).folder, ...
                files(k).name);

            try

                if any(strcmpi(ext, {'.xlsx','.xls','.csv','.txt'}))

                    tableData = readtable(fullName, ...
                        'VariableNamingRule','preserve');

                    fprintf('Localization file found:\n%s\n', ...
                        fullName);

                    return;

                end

            catch

                warning('Could not read localization file: %s', ...
                    fullName);

            end

        end

    end

    % Second search: any file containing OD/Fovea + Testing

    files = dir(fullfile(rootDir, '**', '*'));

    for k = 1:numel(files)

        if files(k).isdir
            continue;
        end

        filenameLower = lower(files(k).name);

        if contains(filenameLower, 'testing') && ...
                (contains(filenameLower, 'center') || ...
                 contains(filenameLower, 'markup'))

            [~,~,ext] = fileparts(files(k).name);

            if any(strcmpi(ext, {'.xlsx','.xls','.csv','.txt'}))

                fullName = fullfile( ...
                    files(k).folder, ...
                    files(k).name);

                try

                    tableData = readtable(fullName, ...
                        'VariableNamingRule','preserve');

                    fprintf('Localization file found:\n%s\n', ...
                        fullName);

                    return;

                catch
                end

            end

        end

    end

    warning(['Localization table could not be automatically ' ...
             'located. Coordinates will be unavailable.']);

end


function imageFile = findImageByID(imageDir, imageID)

    imageFile = '';

    extensions = {'.jpg','.jpeg','.png','.tif','.tiff'};

    for e = 1:numel(extensions)

        candidate = fullfile( ...
            imageDir, ...
            [imageID extensions{e}]);

        if exist(candidate,'file')

            imageFile = candidate;
            return;

        end

    end

    files = dir(fullfile(imageDir, '*'));

    for k = 1:numel(files)

        if files(k).isdir
            continue;
        end

        if contains(lower(files(k).name), ...
                lower(imageID))

            imageFile = fullfile( ...
                files(k).folder, ...
                files(k).name);

            return;

        end

    end

end


function coordinate = getLocalizationCoordinate(T, imageID)

    coordinate = [];

    if isempty(T)
        return;
    end

    names = string(T.Properties.VariableNames);

    % Find image-number column
    imageColumn = [];

    for k = 1:numel(names)

        nameLower = lower(names(k));

        if contains(nameLower,'image') || ...
                contains(nameLower,'id')

            imageColumn = k;
            break;

        end

    end

    % Find X and Y columns
    xColumn = [];
    yColumn = [];

    for k = 1:numel(names)

        nameLower = lower(names(k));

        if contains(nameLower,'x') && ...
                contains(nameLower,'coordinate')

            xColumn = k;

        elseif contains(nameLower,'y') && ...
                contains(nameLower,'coordinate')

            yColumn = k;

        end

    end

    % If standard names were not detected, try first 3 columns
    if isempty(imageColumn) && width(T) >= 1
        imageColumn = 1;
    end

    if isempty(xColumn) && width(T) >= 2
        xColumn = 2;
    end

    if isempty(yColumn) && width(T) >= 3
        yColumn = 3;
    end

    if isempty(imageColumn) || ...
       isempty(xColumn) || ...
       isempty(yColumn)

        return;

    end

    imageValues = string(T{:,imageColumn});

    target = lower(string(imageID));

    match = contains( ...
        lower(strtrim(imageValues)), ...
        target);

    if ~any(match)

        % Try matching numeric portion
        numericID = regexp(imageID, '\d+', 'match');

        if ~isempty(numericID)

            targetNumber = str2double(numericID{1});

            for r = 1:numel(imageValues)

                valueNumber = regexp( ...
                    char(imageValues(r)), ...
                    '\d+', ...
                    'match');

                if ~isempty(valueNumber)

                    if str2double(valueNumber{end}) == targetNumber

                        match(r) = true;
                        break;

                    end

                end

            end

        end

    end

    idx = find(match,1);

    if isempty(idx)
        return;
    end

    x = T{idx,xColumn};
    y = T{idx,yColumn};

    if iscell(x)
        x = x{1};
    end

    if iscell(y)
        y = y{1};
    end

    if isstring(x)
        x = str2double(x);
    end

    if isstring(y)
        y = str2double(y);
    end

    if ischar(x)
        x = str2double(x);
    end

    if ischar(y)
        y = str2double(y);
    end

    if isnumeric(x) && isnumeric(y) && ...
            isfinite(x) && isfinite(y)

        coordinate = [double(x) double(y)];

    end

end


function mask = loadMaskByID(maskDir, imageID)

    mask = false(1,1);

    files = dir(fullfile(maskDir, '**', '*'));

    % Exact ID search
    for k = 1:numel(files)

        if files(k).isdir
            continue;
        end

        filename = files(k).name;

        if contains(lower(filename), lower(imageID))

            try

                candidate = imread( ...
                    fullfile(files(k).folder, filename));

                if size(candidate,3) > 1
                    candidate = candidate(:,:,1);
                end

                mask = candidate > 0;

                return;

            catch

                warning('Could not read mask: %s', ...
                    filename);

            end

        end

    end

    warning('Mask not found for %s in %s', ...
        imageID, maskDir);

end


function mask = matchMaskSize(mask, H, W)

    if isequal(size(mask), [H W])
        return;
    end

    if isempty(mask)
        mask = false(H,W);
        return;
    end

    mask = imresize(mask, [H W], 'nearest');

    mask = logical(mask);

end


function count = countComponents(mask)

    if isempty(mask)
        count = 0;
        return;
    end

    CC = bwconncomp(mask);

    count = CC.NumObjects;

end


function vesselMask = segmentRetinalVessels(I)

% Classical vessel segmentation.
%
% Uses the green channel because retinal vessels generally provide
% stronger contrast against the retinal background in green.

    Igray = im2double(I);

    G = Igray(:,:,2);

    % Normalize illumination
    background = imgaussfilt(G, 15);

    corrected = G - background;

    corrected = mat2gray(corrected);

    % Enhance thin dark vessel structures
    vesselResponse = imbothat(corrected, ...
        strel('disk', 3));

    % Additional local contrast
    vesselResponse = adapthisteq(vesselResponse);

    % Threshold
    level = graythresh(vesselResponse);

    vesselMask = vesselResponse > max(0.08, level * 0.85);

    % Remove small noise
    vesselMask = bwareaopen(vesselMask, 20);

    % Connect nearby vessel pixels
    vesselMask = imclose( ...
        vesselMask, ...
        strel('disk', 1));

    % Keep retinal field approximately circular
    retinalMask = createRetinalMask(I);

    vesselMask = vesselMask & retinalMask;

end


function retinalMask = createRetinalMask(I)

    G = rgb2gray(I);

    G = im2double(G);

    threshold = graythresh(G);

    retinalMask = G > max(0.03, threshold * 0.20);

    retinalMask = imfill(retinalMask,'holes');

    retinalMask = bwareafilt( ...
        retinalMask, ...
        1);

    retinalMask = imerode( ...
        retinalMask, ...
        strel('disk',5));

end


function indicator = calculateVascularIndicator(vesselMask, I)

% Heuristic vascular abnormality indicator.
%
% This is NOT a trained neovascularization classifier.

    vesselArea = nnz(vesselMask);

    totalArea = numel(vesselMask);

    density = vesselArea / max(totalArea,1);

    % Vessel density contribution
    densityScore = min(100, density * 1000);

    % Vessel complexity contribution
    skeleton = bwmorph(vesselMask, 'skel', Inf);

    branchPoints = bwmorph( ...
        skeleton, ...
        'branchpoints');

    branchDensity = ...
        nnz(branchPoints) / max(vesselArea,1);

    branchScore = min(100, branchDensity * 100000);

    % Contrast contribution around vessels
    gray = rgb2gray(I);

    vesselIntensity = mean( ...
        double(gray(vesselMask)), ...
        'omitnan');

    backgroundMask = ~vesselMask;

    backgroundIntensity = mean( ...
        double(gray(backgroundMask)), ...
        'omitnan');

    contrast = abs( ...
        vesselIntensity - backgroundIntensity);

    contrastScore = min(100, contrast / 255 * 500);

    indicator = ...
        0.50 * densityScore + ...
        0.30 * branchScore + ...
        0.20 * contrastScore;

    indicator = max(0,min(100,indicator));

end