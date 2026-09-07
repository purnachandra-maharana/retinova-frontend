function config = retinaProjectConfig()
%RETINAPROJECTCONFIG Resolve all paths from this project checkout.

scriptsRoot = fileparts(mfilename('fullpath'));
projectRoot = fileparts(scriptsRoot);

config = struct();
config.projectRoot = projectRoot;
config.scriptsRoot = scriptsRoot;
config.modelFile = fullfile(projectRoot, 'models', ...
    'DR_ResNet50_SIH26038.mat');
config.outputRoot = fullfile(projectRoot, 'output');
config.finalOutputRoot = fullfile(config.outputRoot, 'final_pipeline');
config.gradcamOutput = fullfile(config.finalOutputRoot, 'gradcam');
config.jsonOutput = fullfile(config.finalOutputRoot, 'json');
config.reportsOutput = fullfile(config.outputRoot, 'reports');
config.predictionsOutput = fullfile(config.outputRoot, 'predictions');
config.testImages = fullfile(projectRoot, 'test_images');
config.splits = fullfile(projectRoot, 'splits');
config.models = fullfile(projectRoot, 'models');
config.inputSize = [224 224 3];
config.classNames = ["0", "1", "2", "3", "4"];
config.gradCAMFeatureLayer = "activation_49_relu";
config.gradCAMReductionLayer = "avg_pool";
config.disclaimer = "AI-assisted screening only; not a medical diagnosis.";

end
