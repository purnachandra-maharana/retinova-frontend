function executionEnvironment = retinaSelectExecutionEnvironment()
%RETINASELECTEXECUTIONENVIRONMENT Prefer GPU, with an explicit CPU fallback.

executionEnvironment = 'cpu';

try
    if parallelComputingLicense('test', 'Distrib_Computing_Toolbox') && ...
            gpuDeviceCount("available") > 0
        gpuDevice();
        executionEnvironment = 'gpu';
    end
catch ME
    warning('GPU unavailable; using CPU execution: %s', ME.message);
end

fprintf('Deep learning execution environment: %s\n', executionEnvironment);

end
