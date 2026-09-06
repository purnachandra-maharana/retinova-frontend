function output = runRetinaSafe(imagePath)
% runRetinaSafe
% RetinaSafe wrapper around the existing S10 pipeline.
%
% Runs S10 and returns its result.
% The S10 pipeline already creates the MAT, JSON and Grad-CAM files.

    % ---------------------------------------------------------
    % CHECK INPUT
    % ---------------------------------------------------------

    if nargin < 1
        error("Image path is required.");
    end

    imagePath = char(imagePath);

    if ~isfile(imagePath)
        error("Image file not found: %s", imagePath);
    end

    % ---------------------------------------------------------
    % RUN S10 PIPELINE
    % ---------------------------------------------------------

    fprintf("\n============================================\n");
    fprintf(" RetinaSafe MATLAB Analysis\n");
    fprintf("============================================\n");
    fprintf("Input image: %s\n\n", imagePath);

    output = S10_final_clinical_pipeline(imagePath);

    % ---------------------------------------------------------
    % DISPLAY RESULT
    % ---------------------------------------------------------

    fprintf("\n============================================\n");
    fprintf(" RetinaSafe Analysis Completed\n");
    fprintf("============================================\n");

    % Prediction
    if isfield(output, "prediction")

        fprintf("\nPrediction:\n");

        if isfield(output.prediction, "grade")
            fprintf("  DR Grade     : %d\n", ...
                output.prediction.grade);
        end

        if isfield(output.prediction, "label")
            fprintf("  Classification: %s\n", ...
                char(output.prediction.label));
        end

        if isfield(output.prediction, "confidence")
            fprintf("  Confidence   : %.4f%%\n", ...
                output.prediction.confidence);
        end
    end

    % Quality
    if isfield(output, "quality")

        fprintf("\nImage Quality:\n");

        if isfield(output.quality, "status")
            fprintf("  Status       : %s\n", ...
                char(output.quality.status));
        end

        if isfield(output.quality, "score")
            fprintf("  Score        : %.2f / 100\n", ...
                output.quality.score);
        end
    end

    % Referral
    if isfield(output, "referral")

        fprintf("\nReferral:\n");

        if isfield(output.referral, "required")
            fprintf("  Required     : %s\n", ...
                string(output.referral.required));
        end

        if isfield(output.referral, "status")
            fprintf("  Status       : %s\n", ...
                char(output.referral.status));
        end
    end

    % ---------------------------------------------------------
    % DISPLAY GENERATED FILES
    % ---------------------------------------------------------

    fprintf("\nGenerated Files:\n");

    % JSON
    if isfield(output, "system")

        if isfield(output.system, "jsonPath")
            fprintf("  JSON         : %s\n", ...
                char(output.system.jsonPath));
        end

        if isfield(output.system, "resultPath")
            fprintf("  MAT          : %s\n", ...
                char(output.system.resultPath));
        end
    end

    % Grad-CAM
    if isfield(output, "xai")

        if isfield(output.xai, "gradCAMImagePath")
            fprintf("  Grad-CAM     : %s\n", ...
                char(output.xai.gradCAMImagePath));
        end
    end

    fprintf("\n============================================\n");
    fprintf(" RetinaSafe Result Ready\n");
    fprintf("============================================\n\n");

end