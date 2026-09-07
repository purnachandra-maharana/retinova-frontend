function cleanupGeneratedArtifacts(confirmCleanup)
%CLEANUPGENERATEDARTIFACTS Remove only reproducible MATLAB build outputs.

if nargin < 1
    confirmCleanup = false;
end
if ~islogical(confirmCleanup) || ~isscalar(confirmCleanup)
    error('confirmCleanup must be a logical scalar.');
end
if ~confirmCleanup
    error('Pass true to confirm cleanup of generated output artifacts.');
end

config = retinaProjectConfig();
generatedRoots = { ...
    config.outputRoot, ...
    fullfile(config.scriptsRoot, 'slprj'), ...
    fullfile(config.scriptsRoot, 'work')};

for k = 1:numel(generatedRoots)
    target = generatedRoots{k};
    if isfolder(target) && ~strcmp(target, config.projectRoot)
        fprintf('Removing generated artifacts: %s\n', target);
        rmdir(target, 's');
    end
end

end
