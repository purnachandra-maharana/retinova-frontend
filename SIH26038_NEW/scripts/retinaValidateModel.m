function metadata = retinaValidateModel(modelFile, targetLayer)
%RETINAVALIDATEMODEL Validate the real trained model before inference.

if nargin < 2 || isempty(targetLayer)
    targetLayer = "activation_49_relu";
end
if ~isfile(modelFile)
    error('Trained model not found: %s', modelFile);
end

loaded = load(modelFile);
requiredFields = {'trainedNet', 'classNames', 'inputSize'};
for k = 1:numel(requiredFields)
    if ~isfield(loaded, requiredFields{k})
        error('Model file is missing required field "%s".', requiredFields{k});
    end
end

net = loaded.trainedNet;
if ~(isa(net, 'DAGNetwork') || isa(net, 'SeriesNetwork') || ...
        isa(net, 'dlnetwork'))
    error('Model field trainedNet is not a supported deep-learning network.');
end

inputSize = double(loaded.inputSize);
if numel(inputSize) ~= 3 || any(inputSize < 1)
    error('Model inputSize must contain three positive dimensions.');
end

classNames = string(loaded.classNames);
if numel(classNames) ~= 5
    error('Expected a five-class diabetic-retinopathy model; found %d classes.', ...
        numel(classNames));
end

featureLayerAvailable = false;
if isprop(net, 'Layers')
    layerNames = string({net.Layers.Name});
    featureLayerAvailable = any(layerNames == string(targetLayer));
end

metadata = struct();
metadata.net = net;
metadata.classNames = classNames;
metadata.inputSize = inputSize;
metadata.featureLayerAvailable = featureLayerAvailable;
metadata.targetLayer = string(targetLayer);

if ~featureLayerAvailable
    warning('Grad-CAM feature layer "%s" is not present in the model.', ...
        string(targetLayer));
end

end
